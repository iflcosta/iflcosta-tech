// POST /api/ia/webhook/whatsapp — recebe eventos do n8n (Evolution API)
// Público mas protegido por x-webhook-token
import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  // Valida token
  const token = req.headers.get('x-webhook-token');
  if (!token || token !== process.env.WHATSAPP_WEBHOOK_TOKEN) {
    return json({ error: 'Não autorizado' }, 401);
  }

  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'Payload inválido' }, 400);

  const { event, instance_name, data } = body;
  const supabase = db();

  // ── instance_status — atualiza status da instância ──────────
  if (event === 'instance_status') {
    const { status } = data ?? {};
    if (instance_name && status) {
      await supabase.schema('ia').from('wa_instances')
        .update({ status, last_seen_at: new Date().toISOString() })
        .eq('instance_name', instance_name);
    }
    return json({ ok: true });
  }

  // ── message_received / message_sent ─────────────────────────
  if (event === 'message_received' || event === 'message_sent') {
    const {
      contact_phone,
      contact_name,
      content,
      evolution_id,
      tenant_id,
    } = data ?? {};

    if (!contact_phone || !content || !tenant_id) {
      return json({ error: 'Campos obrigatórios ausentes: contact_phone, content, tenant_id' }, 400);
    }

    // Idempotência: se evolution_id já existe, ignora
    if (evolution_id) {
      const { data: existing } = await supabase.schema('ia').from('messages')
        .select('id').eq('evolution_id', evolution_id).maybeSingle();
      if (existing) return json({ ok: true, skipped: true });
    }

    // Busca instância WA para a conversa
    const { data: instance } = await supabase.schema('ia').from('wa_instances')
      .select('id').eq('instance_name', instance_name ?? '').maybeSingle();

    // Upsert de conversa
    const { data: conv, error: convErr } = await supabase.schema('ia').from('conversations')
      .upsert(
        {
          tenant_id,
          contact_phone,
          contact_name: contact_name ?? null,
          wa_instance_id: instance?.id ?? null,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,contact_phone', ignoreDuplicates: false }
      )
      .select().single();

    if (convErr) return json({ error: convErr.message }, 500);

    // Verifica opt-out se mensagem recebida
    if (event === 'message_received') {
      const { data: cfg } = await supabase.schema('ia').from('wa_config')
        .select('opt_out_keywords')
        .eq('wa_instance_id', instance?.id ?? '')
        .maybeSingle();

      const keywords = cfg?.opt_out_keywords ?? ['parar','sair','cancelar','remove','stop'];
      const contentLower = content.toLowerCase();
      const isOptOut = keywords.some(k => contentLower.includes(k.toLowerCase()));

      if (isOptOut) {
        await supabase.schema('ia').from('conversations')
          .update({ opted_out: true, status: 'closed' })
          .eq('id', conv.id);
      }
    }

    // Insere mensagem
    const role = event === 'message_received' ? 'user' : 'assistant';
    await supabase.schema('ia').from('messages')
      .insert({
        conversation_id: conv.id,
        role,
        content,
        evolution_id: evolution_id ?? null,
      });

    // Incrementa contador
    await supabase.schema('ia').from('conversations')
      .update({ msg_count: (conv.msg_count ?? 0) + 1, last_message_at: new Date().toISOString() })
      .eq('id', conv.id);

    return json({ ok: true, conversation_id: conv.id });
  }

  // Evento desconhecido — aceita sem erro (forward-compatible)
  return json({ ok: true, event_ignored: event });
}

export const config = { runtime: 'edge' };
