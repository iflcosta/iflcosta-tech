// /api/admin/os/status.js
// Vercel Edge Function — Atualização e Validação do Status da OS (Feature 006)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

// Matriz de Transições de Status Permitidas (Regra de Negócio e Segurança)
const PERMITTED_ORIGINS = {
  rascunho: ['rascunho'], // Estado inicial de criação
  diagnóstico: ['rascunho', 'diagnóstico'],
  aguardando_aprovação: ['rascunho', 'diagnóstico', 'aguardando_aprovação'],
  aprovado: ['rascunho', 'diagnóstico', 'aguardando_aprovação', 'aprovado'],
  aguardando_peça: ['aprovado', 'em_conserto', 'aguardando_peça'],
  em_conserto: ['aprovado', 'aguardando_peça', 'em_conserto', 'pronto'], // Permite retornar de 'pronto' para 'em_conserto' se o teste final falhar
  pronto: ['em_conserto', 'aguardando_peça', 'aprovado', 'pronto'],
  entregue: ['pronto', 'em_conserto', 'entregue'], // Dogma LGPD/Segurança: Só entrega o que está pronto ou consertado
  cancelado: ['rascunho', 'diagnóstico', 'aguardando_aprovação', 'aprovado', 'aguardando_peça', 'em_conserto', 'pronto', 'cancelado'],
  cliente_desistiu: ['rascunho', 'diagnóstico', 'aguardando_aprovação', 'aprovado', 'aguardando_peça', 'em_conserto', 'pronto', 'cliente_desistiu']
};

const VALID_STATUSES = Object.keys(PERMITTED_ORIGINS);

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

  // 2. Roteamento de Métodos (POST e PUT permitidos)
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'Payload inválido.' });
    }

    const { id, status: newStatus, notes } = body;

    // 3. Validações de Payload
    if (!id) {
      return json(400, { ok: false, error: 'validation_failed', message: 'O ID da Ordem de Serviço (id) é obrigatório.' });
    }
    if (!newStatus) {
      return json(400, { ok: false, error: 'validation_failed', message: 'O novo status (status) é obrigatório.' });
    }

    if (!VALID_STATUSES.includes(newStatus)) {
      return json(400, { 
        ok: false, 
        error: 'invalid_status', 
        message: `Status inválido. Status permitidos: ${VALID_STATUSES.join(', ')}` 
      });
    }

    // 4. Buscar o estado atual da OS no banco de dados
    const { data: currentOS, error: fetchError } = await supabase
      .from('repairs')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !currentOS) {
      return json(404, { ok: false, error: 'os_not_found', message: 'A Ordem de Serviço informada não foi encontrada.' });
    }

    const currentStatus = currentOS.status;

    // 5. Validação de Transição de Status
    const allowedOrigins = PERMITTED_ORIGINS[newStatus] || [];
    if (!allowedOrigins.includes(currentStatus)) {
      return json(400, {
        ok: false,
        error: 'invalid_transition',
        message: `Transição inválida. Não é permitido ir do status '${currentStatus}' diretamente para '${newStatus}'.`
      });
    }

    // 6. Executar Atualização do Status da OS no Banco de Dados
    // O trigger 'on_os_status_change' cuidará de fechar o status anterior e inserir o novo em os_status_history
    const { data: updatedOS, error: updateError } = await supabase
      .from('repairs')
      .update({ status: newStatus })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar status da OS:', updateError);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao persistir o novo status no banco.' });
    }

    // 7. Salvar anotação opcional no registro de histórico recém-criado
    const { public_notes, notes: transitionNotes } = body;
    if ((transitionNotes && transitionNotes.trim()) || (public_notes && public_notes.trim())) {
      // Busca o ID do histórico atualizado/ativo (exited_at IS NULL)
      const { data: activeHistory, error: historyFetchError } = await supabase
        .from('os_status_history')
        .select('id')
        .eq('os_id', id)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1)
        .single();

      if (!historyFetchError && activeHistory) {
        const updatePayload = {};
        if (transitionNotes && transitionNotes.trim()) {
          updatePayload.notes = transitionNotes.trim();
          updatePayload.private_notes = transitionNotes.trim();
        }
        if (public_notes && public_notes.trim()) {
          updatePayload.public_notes = public_notes.trim();
        }

        const { error: historyUpdateError } = await supabase
          .from('os_status_history')
          .update(updatePayload)
          .eq('id', activeHistory.id);

        if (historyUpdateError) {
          console.error('Erro ao salvar notas de transição de status:', historyUpdateError);
          // Não falhamos a requisição por conta das notas, pois o status já foi atualizado com sucesso
        }
      }
    }

    return json(200, { ok: true, data: updatedOS });
  } catch (err) {
    console.error('Erro no endpoint de atualização de status de OS:', err);
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
