// GET /api/ia/admin/stats — contadores do dashboard
import { supabase, json, err, requireAuth } from './_auth.js';

export default async function handler(req) {
  if (req.method !== 'GET') return err('Método não permitido', 405);
  const user = await requireAuth(req);
  if (!user) return err('Não autorizado', 401);

  const db = supabase();

  const [tenants, convsOpen, needsHuman, instances, recentConvs, msgsToday] = await Promise.all([
    db.schema('ia').from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.schema('ia').from('conversations').select('id', { count: 'exact', head: true }).in('status', ['bot','needs_human']),
    db.schema('ia').from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'needs_human'),
    db.schema('ia').from('wa_instances')
      .select('id, instance_name, status, warmup_phase, last_seen_at, tenant_id, tenants(name)')
      .order('created_at'),
    db.schema('ia').from('conversations')
      .select('id, contact_phone, status, last_message_at, tenant_id, tenants(name), messages(content, created_at)')
      .order('last_message_at', { ascending: false })
      .limit(5),
    db.schema('ia').from('messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().slice(0, 10)),
  ]);

  const instancesOut = (instances.data ?? []).map(i => ({
    id: i.id,
    instance_name: i.instance_name,
    status: i.status,
    warmup_phase: i.warmup_phase,
    last_seen_at: i.last_seen_at,
    tenant_name: i.tenants?.name ?? null,
  }));

  const recentOut = (recentConvs.data ?? []).map(c => ({
    id: c.id,
    contact_phone: c.contact_phone,
    status: c.status,
    last_message_at: c.last_message_at,
    tenant_name: c.tenants?.name ?? null,
    last_content: c.messages?.at(-1)?.content ?? null,
  }));

  return json({
    tenants_active:     tenants.count    ?? 0,
    conversations_open: convsOpen.count  ?? 0,
    needs_human:        needsHuman.count ?? 0,
    msgs_today:         msgsToday.count  ?? 0,
    instances:          instancesOut,
    recent_conversations: recentOut,
  });
}

export const config = { runtime: 'edge' };
