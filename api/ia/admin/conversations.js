// GET  /api/ia/admin/conversations         — lista paginada
// GET  /api/ia/admin/conversations?id=X    — conversa + mensagens
// POST /api/ia/admin/conversations/[id]/reply   (via /api/ia/admin/conversations-reply.js)
// PATCH /api/ia/admin/conversations?id=X&action=status
import { supabase, json, err, requireAuth } from './_auth.js';

export default async function handler(req) {
  const user = await requireAuth(req);
  if (!user) return err('Não autorizado', 401);

  const db = supabase();
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get('id');
  const status = searchParams.get('status');
  const tenant = searchParams.get('tenant');
  const page   = parseInt(searchParams.get('page') ?? '1', 10);
  const limit  = 20;

  if (req.method === 'GET') {
    if (id) {
      // Detalhes de uma conversa + mensagens
      const [convRes, msgsRes] = await Promise.all([
        db.schema('ia').from('conversations')
          .select('*, tenants(name), wa_instances(instance_name)')
          .eq('id', id).single(),
        db.schema('ia').from('messages')
          .select('*')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true })
          .limit(200),
      ]);
      if (convRes.error) return err(convRes.error.message, 500);
      return json({ conversation: convRes.data, messages: msgsRes.data ?? [] });
    }

    // Lista paginada
    let q = db.schema('ia').from('conversations')
      .select(`id, contact_phone, contact_name, status, opted_out, last_message_at, msg_count,
               tenants(name),
               messages(content, created_at)`, { count: 'exact' })
      .order('last_message_at', { ascending: false })
      .range((page-1)*limit, page*limit-1);

    if (status) q = q.eq('status', status);
    if (tenant) q = q.eq('tenant_id', tenant);

    const { data, error, count } = await q;
    if (error) return err(error.message, 500);

    const out = (data ?? []).map(c => ({
      ...c,
      tenant_name: c.tenants?.name ?? null,
      last_content: c.messages?.at(-1)?.content ?? null,
      tenants: undefined,
      messages: undefined,
    }));
    return json({ data: out, total: count ?? 0, page, limit });
  }

  if (req.method === 'PATCH' && id) {
    const body = await req.json().catch(() => ({}));
    const validStatuses = ['bot','needs_human','closed'];
    if (!validStatuses.includes(body.status)) return err('status inválido');
    const { error } = await db.schema('ia').from('conversations')
      .update({ status: body.status }).eq('id', id);
    if (error) return err(error.message, 500);
    return json({ ok: true });
  }

  return err('Método não permitido', 405);
}

export const config = { runtime: 'edge' };
