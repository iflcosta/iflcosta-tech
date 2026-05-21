// /api/admin/os/index.js
// Vercel Edge Function — Listagem e Criação de Ordens de Serviço (Feature 006)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // 1. Validação de Autenticação Admin
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
  } else {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/os - Listagem com Filtros, Busca e Paginação
// ─────────────────────────────────────────────────────────────────────────────
async function handleGet(req, supabase) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id')?.trim();

    if (id) {
      const { data, error } = await supabase
        .from('repairs')
        .select('*, customers(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar OS por ID:', error);
        return json(404, { ok: false, error: 'not_found', message: 'Ordem de Serviço não encontrada.' });
      }
      return json(200, { ok: true, data });
    }

    const search = url.searchParams.get('search')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const customerId = url.searchParams.get('customer_id')?.trim();
    const atrasado = url.searchParams.get('atrasado') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const orderBy = url.searchParams.get('order_by') || 'prazo_prometido';
    const orderAsc = url.searchParams.get('order_asc') !== 'false'; // default true para prazos

    // Iniciar a query principal em repairs com inner join conceitual no JS para customers
    let query = supabase
      .from('repairs')
      .select('*, customers(*)', { count: 'exact' });

    // 1. Tratamento de Busca Textual (Cliente, Aparelho, Serial, Problema)
    if (search) {
      // Passo A: Procurar IDs de clientes correspondentes à busca na tabela 'customers'
      const cleanSearch = search.replace(/\D/g, ''); // apenas dígitos para telefone/cpf
      let customerOrClause = `nome.ilike.%${search}%`;
      if (cleanSearch) {
        customerOrClause += `,telefone.ilike.%${cleanSearch}%`;
      }
      
      const { data: matchedCustomers } = await supabase
        .from('customers')
        .select('id')
        .or(customerOrClause)
        .is('deleted_at', null);

      const customerIds = (matchedCustomers || []).map(c => c.id);

      // Passo B: Construir a cláusula OR para repairs
      let repairOrParams = [];
      
      // Se encontrou clientes, incluir correspondência de customer_id
      if (customerIds.length > 0) {
        const customerIdsList = customerIds.map(id => `"${id}"`).join(',');
        repairOrParams.push(`customer_id.in.(${customerIdsList})`);
      }

      // Adicionar busca de equipamento no JSONB e problema_reportado
      // O Supabase JS suporta busca em caminhos jsonb usando a sintaxe ->>
      repairOrParams.push(
        `equipamento->>tipo.ilike.%${search}%`,
        `equipamento->>marca.ilike.%${search}%`,
        `equipamento->>modelo.ilike.%${search}%`,
        `equipamento->>serial.ilike.%${search}%`,
        `problema_reportado.ilike.%${search}%`
      );

      query = query.or(repairOrParams.join(','));
    }

    // 2. Filtro por Status da OS
    if (status) {
      query = query.eq('status', status);
    }

    // 3. Filtro por Cliente Específico
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    // 4. Filtro por OS Atrasadas (prazo < hoje e status ativo)
    if (atrasado) {
      const now = new Date().toISOString();
      query = query
        .lt('prazo_prometido', now)
        .not('status', 'in', '("entregue","cancelado","cliente_desistiu")');
    }

    // 5. Ordenação
    // Por padrão ordena por prazo_prometido crescente. Se order_by for especificado, usamos ele.
    if (orderBy === 'created_at') {
      query = query.order('created_at', { ascending: orderAsc });
    } else if (orderBy === 'valor_cobrado') {
      query = query.order('valor_cobrado', { ascending: orderAsc });
    } else {
      // Padrão: prazo_prometido (nulos no fim)
      query = query.order('prazo_prometido', { ascending: orderAsc, nullsFirst: false });
    }

    // 6. Paginação
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Erro ao consultar Ordens de Serviço:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao consultar Ordens de Serviço no banco.' });
    }

    return json(200, { ok: true, data, count });
  } catch (err) {
    console.error('Erro no GET de OS:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/os - Criação de Nova Ordem de Serviço
// ─────────────────────────────────────────────────────────────────────────────
async function handlePost(req, supabase, actor) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'Payload inválido.' });
    }

    const {
      customer_id,
      equipamento,
      problema_reportado,
      laudo,
      status,
      prazo_prometido,
      valor_cobrado,
      valor_custo_pecas,
      forma_pagamento,
      garantia_dias,
      garantia_de
    } = body;

    // Validações básicas obrigatórias
    if (!customer_id) {
      return json(400, { ok: false, error: 'validation_failed', message: 'customer_id é obrigatório.' });
    }
    if (!equipamento || typeof equipamento !== 'object') {
      return json(400, { ok: false, error: 'validation_failed', message: 'equipamento (objeto) é obrigatório.' });
    }
    const { tipo, marca, modelo, serial } = equipamento;
    if (!tipo || !marca || !modelo) {
      return json(400, { ok: false, error: 'validation_failed', message: 'equipamento deve conter tipo, marca e modelo.' });
    }
    if (!problema_reportado || problema_reportado.trim().length < 5) {
      return json(400, { ok: false, error: 'validation_failed', message: 'Problema reportado é obrigatório (mín. 5 caracteres).' });
    }

    // Validar se o cliente associado realmente existe no banco e não está deletado
    const { data: customerExists, error: customerFetchError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .is('deleted_at', null)
      .single();

    if (customerFetchError || !customerExists) {
      return json(400, { ok: false, error: 'customer_not_found', message: 'O cliente associado não foi encontrado ou está inativo.' });
    }

    // Normalização dos campos e estruturação do payload da OS
    const osPayload = {
      customer_id,
      equipamento: {
        tipo: tipo.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        serial: serial?.trim() || null
      },
      problema_reportado: problema_reportado.trim(),
      laudo: laudo?.trim() || null,
      status: status?.trim() || 'rascunho',
      prazo_prometido: prazo_prometido ? new Date(prazo_prometido).toISOString() : null,
      valor_cobrado: typeof valor_cobrado === 'number' ? valor_cobrado : 0.00,
      valor_custo_pecas: typeof valor_custo_pecas === 'number' ? valor_custo_pecas : 0.00,
      forma_pagamento: forma_pagamento?.trim() || null,
      garantia_dias: typeof garantia_dias === 'number' ? garantia_dias : 90,
      garantia_de: garantia_de || null,
      updated_at: new Date().toISOString()
    };

    const osId = body.id;
    let query;

    if (osId) {
      // Atualizar OS existente
      query = supabase
        .from('repairs')
        .update(osPayload)
        .eq('id', osId)
        .select('*')
        .single();
    } else {
      // Inserir nova OS
      osPayload.created_at = new Date().toISOString();
      query = supabase
        .from('repairs')
        .insert(osPayload)
        .select('*')
        .single();
    }

    const { data: savedOS, error: dbError } = await query;

    if (dbError) {
      console.error('Erro ao salvar OS:', dbError);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao salvar a Ordem de Serviço.' });
    }

    return json(osId ? 200 : 201, { ok: true, data: savedOS });
  } catch (err) {
    console.error('Erro no POST de OS:', err);
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
