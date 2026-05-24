// GET /api/ia/admin/tenants   — lista tenants
// POST /api/ia/admin/tenants  — cria tenant + agent + wa_config defaults
import { supabase, json, err, requireAuth } from './_auth.js';

export default async function handler(req) {
  const user = await requireAuth(req);
  if (!user) return err('Não autorizado', 401);

  const db = supabase();

  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url);
    const status  = searchParams.get('status');
    const segment = searchParams.get('segment');

    let q = db.schema('ia').from('tenants')
      .select(`*, wa_instances(status, warmup_phase)`)
      .order('created_at', { ascending: false });

    if (status)  q = q.eq('status', status);
    if (segment) q = q.eq('segment', segment);

    const { data, error } = await q;
    if (error) return err(error.message, 500);

    // Flatten wa_status para conveniência do frontend
    const out = (data ?? []).map(t => ({
      ...t,
      wa_status: t.wa_instances?.[0]?.status ?? null,
      wa_warmup_phase: t.wa_instances?.[0]?.warmup_phase ?? null,
      wa_instances: undefined,
    }));
    return json(out);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { name, biz_name, segment, phone, email, plan, notes } = body;

    if (!name?.trim()) return err('name é obrigatório');
    const validSegments = ['imobiliaria','clinica','pet','outro'];
    if (!validSegments.includes(segment)) return err('segment inválido');

    const { data: tenant, error: tErr } = await db.schema('ia').from('tenants')
      .insert({ name: name.trim(), biz_name, segment, phone, email, plan: plan ?? 'trial', notes })
      .select().single();
    if (tErr) return err(tErr.message, 500);

    // Cria agente padrão para o tenant
    await db.schema('ia').from('agents')
      .insert({ tenant_id: tenant.id });

    return json(tenant, 201);
  }

  return err('Método não permitido', 405);
}

export const config = { runtime: 'edge' };
