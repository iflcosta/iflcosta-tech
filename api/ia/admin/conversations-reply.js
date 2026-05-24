// POST /api/ia/admin/conversations-reply?id=X — resposta manual via n8n
import { supabase, json, err, requireAuth } from './_auth.js';

export default async function handler(req) {
  if (req.method !== 'POST') return err('Método não permitido', 405);

  const user = await requireAuth(req);
  if (!user) return err('Não autorizado', 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return err('id é obrigatório');

  const body = await req.json().catch(() => ({}));
  const content = body.content?.trim();
  if (!content) return err('content é obrigatório');

  const db = supabase();

  // Busca conversa para pegar dados de envio
  const { data: conv, error: convErr } = await db.schema('ia').from('conversations')
    .select('*, wa_instances(instance_name)')
    .eq('id', id).single();
  if (convErr || !conv) return err('Conversa não encontrada', 404);
  if (conv.opted_out) return err('Número optou por não receber mensagens', 409);

  // Envia via n8n (n8n aplica delay + typing antes de repassar para Evolution)
  const webhookUrl = process.env.N8N_REPLY_WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instance_name:  conv.wa_instances?.instance_name,
        contact_phone:  conv.contact_phone,
        content,
        manual:         true,
        conversation_id: id,
      }),
    }).catch(() => null); // falha silenciosa — mensagem ainda é salva
  }

  // Salva mensagem no banco
  await db.schema('ia').from('messages')
    .insert({ conversation_id: id, role: 'human_agent', content });

  // Atualiza última atividade e devolve status ao bot se estava needs_human
  await db.schema('ia').from('conversations')
    .update({ last_message_at: new Date().toISOString(), status: 'bot', msg_count: conv.msg_count + 1 })
    .eq('id', id);

  return json({ ok: true });
}

export const config = { runtime: 'edge' };
