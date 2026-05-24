// GET    /api/ia/admin/wa-instances?tenant_id=X  — lista instâncias
// POST   /api/ia/admin/wa-instances?tenant_id=X  — criar instância + wa_config defaults
// PATCH  /api/ia/admin/wa-instances?id=X         — editar instância
// DELETE /api/ia/admin/wa-instances?id=X         — remover
// GET    /api/ia/admin/wa-instances?id=X&config=1 — busca wa_config
// PATCH  /api/ia/admin/wa-instances?id=X&config=1 — atualiza wa_config
// GET    /api/ia/admin/wa-instances?id=X&status=1 — faz ping na Evolution API
import { supabase, json, err, requireAuth } from './_auth.js';

export default async function handler(req) {
  const user = await requireAuth(req);
  if (!user) return err('Não autorizado', 401);

  const db = supabase();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');
  const id       = searchParams.get('id');
  const isConfig = searchParams.get('config');
  const isStatus = searchParams.get('status');

  // ── wa_config ─────────────────────────────────────────────────
  if (isConfig && id) {
    if (req.method === 'GET') {
      const { data, error } = await db.schema('ia').from('wa_config')
        .select('*').eq('wa_instance_id', id).single();
      if (error) return err(error.message, 404);
      return json(data);
    }
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const allowed = ['delay_min_ms','delay_max_ms','typing_enabled','typing_duration_ms',
                       'max_msgs_per_minute','max_msgs_per_day','blackout_start','blackout_end',
                       'opt_out_keywords'];
      const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
      if (!Object.keys(patch).length) return err('Nenhum campo válido para atualizar');
      const { data, error } = await db.schema('ia').from('wa_config')
        .update(patch).eq('wa_instance_id', id).select().single();
      if (error) return err(error.message, 500);
      return json(data);
    }
  }

  // ── ping status na Evolution API ─────────────────────────────
  if (isStatus && id && req.method === 'GET') {
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    const { data: inst } = await db.schema('ia').from('wa_instances')
      .select('instance_name').eq('id', id).single();
    if (!inst) return err('Instância não encontrada', 404);

    let newStatus = 'disconnected';
    if (evolutionUrl && evolutionKey) {
      try {
        const res = await fetch(`${evolutionUrl}/instance/connectionState/${inst.instance_name}`, {
          headers: { 'apikey': evolutionKey },
        });
        if (res.ok) {
          const ev = await res.json();
          newStatus = ev?.instance?.state === 'open' ? 'connected' : 'disconnected';
        }
      } catch { /* mantém disconnected */ }
    }

    await db.schema('ia').from('wa_instances')
      .update({ status: newStatus, last_seen_at: new Date().toISOString() }).eq('id', id);
    return json({ status: newStatus });
  }

  // ── CRUD de instâncias ────────────────────────────────────────
  if (req.method === 'GET') {
    if (!tenantId) return err('tenant_id é obrigatório');
    const { data, error } = await db.schema('ia').from('wa_instances')
      .select('*, wa_config(*)')
      .eq('tenant_id', tenantId)
      .order('created_at');
    if (error) return err(error.message, 500);
    return json(data ?? []);
  }

  if (req.method === 'POST') {
    if (!tenantId) return err('tenant_id é obrigatório');
    const body = await req.json().catch(() => ({}));
    const { instance_name, phone_number } = body;
    if (!instance_name?.trim()) return err('instance_name é obrigatório');

    const { data: inst, error: instErr } = await db.schema('ia').from('wa_instances')
      .insert({
        tenant_id:         tenantId,
        instance_name:     instance_name.trim(),
        phone_number:      phone_number ?? null,
        warmup_phase:      1,
        warmup_started_at: new Date().toISOString(),
      })
      .select().single();
    if (instErr) return err(instErr.message, 500);

    // Cria wa_config com defaults anti-ban
    await db.schema('ia').from('wa_config').insert({ wa_instance_id: inst.id });

    return json(inst, 201);
  }

  if (req.method === 'PATCH' && id) {
    const body = await req.json().catch(() => ({}));
    const allowed = ['phone_number','status','warmup_phase','warmup_started_at'];
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    const { data, error } = await db.schema('ia').from('wa_instances')
      .update(patch).eq('id', id).select().single();
    if (error) return err(error.message, 500);
    return json(data);
  }

  if (req.method === 'DELETE' && id) {
    const { error } = await db.schema('ia').from('wa_instances').delete().eq('id', id);
    if (error) return err(error.message, 500);
    return json({ ok: true });
  }

  return err('Método não permitido', 405);
}

export const config = { runtime: 'edge' };
