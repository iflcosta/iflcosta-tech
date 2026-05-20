// /api/admin/crm/customers.js
// Vercel Edge Function — CRUD de Clientes no Painel Admin (Feature 005)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // 1. Validação de Autenticação
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...val] = cookie.trim().split('=');
    if (key) acc[key] = val.join('=');
    return acc;
  }, {});

  const accessToken = cookies['sb-access-token'];
  if (!accessToken) {
    return json(401, { ok: false, error: 'unauthorized', message: 'Sessão ausente.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return json(401, { ok: false, error: 'unauthorized', message: 'Sessão inválida.' });
  }

  const actor = authData.user.id;

  // 2. Roteamento de Métodos
  if (req.method === 'GET') {
    return handleGet(req, supabase);
  } else if (req.method === 'POST') {
    return handlePost(req, supabase, actor);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, supabase, actor);
  } else {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/crm/customers - Listagem, Busca e Detalhamento
// ─────────────────────────────────────────────────────────────────────────────
async function handleGet(req, supabase) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const search = url.searchParams.get('search')?.trim();
    const tag = url.searchParams.get('tag')?.trim();
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Caso de busca por ID de cliente único (ficha detalhada)
    if (id) {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        return json(404, { ok: false, error: 'customer_not_found', message: 'Cliente não encontrado.' });
      }

      // Adicional: Busca o histórico de leads desse cliente
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, created_at, servico, status, mensagem')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      return json(200, { ok: true, data: { ...data, leads: leads || [] } });
    }

    // Caso de listagem geral
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Filtro por busca textual (Nome, Telefone ou CPF)
    if (search) {
      const cleanSearch = search.replace(/\D/g, ''); // apenas dígitos
      let orClause = `nome.ilike.%${search}%`;
      if (cleanSearch) {
        orClause += `,telefone.ilike.%${cleanSearch}%`;
        if (cleanSearch.length > 5) {
          orClause += `,cpf.ilike.%${cleanSearch}%`;
        }
      }
      query = query.or(orClause);
    }

    // Filtro por tag contida na lista
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Ordenação e paginação
    query = query
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Erro ao listar clientes:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao consultar clientes.' });
    }

    return json(200, { ok: true, data, count });
  } catch (err) {
    console.error('Erro no GET de clientes:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/crm/customers - Criação e Atualização
// ─────────────────────────────────────────────────────────────────────────────
async function handlePost(req, supabase, actor) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'Payload inválido.' });
    }

    const { id, nome, telefone, email, cpf, endereco, tags, observacoes } = body;

    // Validações básicas obrigatórias
    if (!nome || nome.trim().length < 2) {
      return json(400, { ok: false, error: 'validation_failed', message: 'Nome é obrigatório (mín. 2 letras).' });
    }
    if (!telefone) {
      return json(400, { ok: false, error: 'validation_failed', message: 'Telefone é obrigatório.' });
    }

    const cleanPhone = telefone.replace(/\D/g, '');
    if (!/^[0-9]{10,15}$/.test(cleanPhone)) {
      return json(400, { ok: false, error: 'validation_failed', message: 'Telefone inválido. Insira de 10 a 15 dígitos (com DDD).' });
    }

    // Normalização dos campos
    const customerPayload = {
      nome: nome.trim(),
      telefone: cleanPhone,
      email: email?.trim() || null,
      cpf: cpf?.replace(/\D/g, '') || null,
      endereco: endereco || null,
      tags: Array.isArray(tags) ? tags : [],
      observacoes: observacoes?.trim() || null,
      updated_at: new Date().toISOString()
    };

    // Caso de ATUALIZAÇÃO (ID fornecido)
    if (id) {
      // Captura estado anterior pra auditoria
      const { data: beforeCust, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !beforeCust) {
        return json(404, { ok: false, error: 'customer_not_found', message: 'Cliente não encontrado para edição.' });
      }

      // Executa o update
      const { data: afterCust, error: updateError } = await supabase
        .from('customers')
        .update(customerPayload)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Erro ao atualizar cliente:', updateError);
        if (updateError.code === '23505') {
          return json(409, { ok: false, error: 'duplicate_entry', message: 'Telefone ou CPF já cadastrado para outro cliente.' });
        }
        return json(500, { ok: false, error: 'database_error', message: 'Erro ao atualizar dados do cliente.' });
      }

      // Auditoria já é tratada pelo trigger de banco `audit_customers_changes`, mas se quisermos registrar o actor
      // no banco através do trigger, o postgres trigger captura.

      return json(200, { ok: true, data: afterCust });
    }

    // Caso de CRIAÇÃO (Novo Cliente)
    const { data: newCust, error: insertError } = await supabase
      .from('customers')
      .insert(customerPayload)
      .select('*')
      .single();

    if (insertError) {
      console.error('Erro ao inserir cliente:', insertError);
      if (insertError.code === '23505') {
        return json(409, { ok: false, error: 'duplicate_entry', message: 'Telefone ou CPF já cadastrado.' });
      }
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao salvar novo cliente.' });
    }

    return json(201, { ok: true, data: newCust });
  } catch (err) {
    console.error('Erro no POST de clientes:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/crm/customers - Exclusão lógica (Soft Delete)
// ─────────────────────────────────────────────────────────────────────────────
async function handleDelete(req, supabase, actor) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'ID do cliente é obrigatório para exclusão.' });
    }

    // Executa a exclusão lógica setando a coluna `deleted_at`
    const { data, error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao deletar cliente:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao realizar exclusão lógica.' });
    }

    return json(200, { ok: true, message: 'Cliente excluído com sucesso (Soft Delete).', data });
  } catch (err) {
    console.error('Erro no DELETE de clientes:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// Helper JSON response
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
