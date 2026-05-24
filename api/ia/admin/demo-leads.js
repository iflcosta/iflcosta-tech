// GET  /api/ia/admin/demo-leads          — lista leads
// PATCH /api/ia/admin/demo-leads?id=X   — atualiza status
import { supabase, json, err, requireAuth } from './_auth.js';

export default async function handler(req) {
  const user = await requireAuth(req);
  if (!user) return err('Não autorizado', 401);

  const db = supabase();
  const { searchParams } = new URL(req.url);

  if (req.method === 'GET') {
    const status = searchParams.get('status');
    let q = db.schema('ia').from('demo_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json(data ?? []);
  }

  if (req.method === 'PATCH') {
    const id = searchParams.get('id');
    if (!id) return err('id é obrigatório');
    const body = await req.json().catch(() => ({}));
    const validStatuses = ['new','contacted','converted','discarded'];
    if (!validStatuses.includes(body.status)) return err('status inválido');
    const { error } = await db.schema('ia').from('demo_leads')
      .update({ status: body.status }).eq('id', id);
    if (error) return err(error.message, 500);
    return json({ ok: true });
  }

  return err('Método não permitido', 405);
}

export const config = { runtime: 'edge' };
