// /api/admin/crm/leads.js
// Vercel Edge Function — CRUD de Leads no Painel Admin (Feature 005)

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
  } else {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/crm/leads - Listagem, Busca e Filtros
// ─────────────────────────────────────────────────────────────────────────────
async function handleGet(req, supabase) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const urgency = url.searchParams.get('urgency')?.trim();
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' });

    // Filtros de status (multi-select ou valor único)
    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else {
        query = query.in('status', statuses);
      }
    }

    // Filtro de urgência
    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    // Filtro de busca textual (ILike em nome, telefone ou mensagem)
    if (search) {
      // Como o Supabase não suporta OR composto de forma simples na query do builder padrão,
      // usamos o operador `.or` do PostgREST.
      // Sintaxe: `nome.ilike.%search%,telefone.ilike.%search%,mensagem.ilike.%search%`
      const cleanSearch = search.replace(/\D/g, ''); // busca também apenas número limpo
      let orClause = `nome.ilike.%${search}%,mensagem.ilike.%${search}%`;
      if (cleanSearch) {
        orClause += `,telefone.ilike.%${cleanSearch}%`;
      }
      query = query.or(orClause);
    }

    // Ordenação e paginação
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Erro ao buscar leads:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao consultar banco de dados.' });
    }

    return json(200, { ok: true, data, count });
  } catch (err) {
    console.error('Erro no handler GET de leads:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno no servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/crm/leads - Edição de Notas e Status
// ─────────────────────────────────────────────────────────────────────────────
async function handlePost(req, supabase, actor) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'ID do lead é obrigatório.' });
    }

    const leadId = body.id;
    
    // Captura o estado anterior para fins de auditoria
    const { data: beforeLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !beforeLead) {
      return json(404, { ok: false, error: 'lead_not_found', message: 'Lead não encontrado.' });
    }

    // Prepara payload de atualização
    const updatePayload = {};
    if (body.status !== undefined) {
      const SERVICO_STATUS = ['novo', 'contatado', 'orcamento_enviado', 'convertido', 'perdido'];
      if (!SERVICO_STATUS.includes(body.status)) {
        return json(400, { ok: false, error: 'invalid_status', message: 'Status do lead inválido.' });
      }
      updatePayload.status = body.status;
    }
    if (body.notes !== undefined) {
      updatePayload.notes = body.notes ? body.notes.trim() : null;
    }

    // Se não houver nada para atualizar
    if (Object.keys(updatePayload).length === 0) {
      return json(400, { ok: false, error: 'no_changes', message: 'Nenhuma alteração informada.' });
    }

    // Executa o update
    const { data: afterLead, error: updateError } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar lead:', updateError);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao salvar alterações do lead.' });
    }

    // Registra alteração de auditoria manualmente
    let action = 'lead_updated';
    if (updatePayload.status && updatePayload.status !== beforeLead.status) {
      action = 'lead_status_changed';
    }

    await supabase.from('audit_log').insert({
      actor: actor,
      action: action,
      entity: 'leads',
      entity_id: leadId,
      before: beforeLead,
      after: afterLead
    });

    return json(200, { ok: true, data: afterLead });
  } catch (err) {
    console.error('Erro no handler POST de leads:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno no servidor.' });
  }
}

// Helper JSON response
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
