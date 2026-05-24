// GET    /api/ia/admin/knowledge?agent_id=X   — lista FAQ
// POST   /api/ia/admin/knowledge?agent_id=X   — criar entrada
// PATCH  /api/ia/admin/knowledge?id=X         — editar
// DELETE /api/ia/admin/knowledge?id=X         — deletar
import { supabase, json, err, requireAuth } from './_auth.js';

export default async function handler(req) {
  const user = await requireAuth(req);
  if (!user) return err('Não autorizado', 401);

  const db = supabase();
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agent_id');
  const id      = searchParams.get('id');

  if (req.method === 'GET') {
    if (!agentId) return err('agent_id é obrigatório');
    const { data, error } = await db.schema('ia').from('knowledge')
      .select('*').eq('agent_id', agentId).order('created_at');
    if (error) return err(error.message, 500);
    return json(data ?? []);
  }

  if (req.method === 'POST') {
    if (!agentId) return err('agent_id é obrigatório');
    const body = await req.json().catch(() => ({}));
    const { question, answer, tags } = body;
    if (!question?.trim()) return err('question é obrigatório');
    if (!answer?.trim())   return err('answer é obrigatório');
    const { data, error } = await db.schema('ia').from('knowledge')
      .insert({ agent_id: agentId, question: question.trim(), answer: answer.trim(), tags: tags ?? [] })
      .select().single();
    if (error) return err(error.message, 500);
    return json(data, 201);
  }

  if (req.method === 'PATCH') {
    if (!id) return err('id é obrigatório');
    const body = await req.json().catch(() => ({}));
    const patch = {};
    if (body.question !== undefined) patch.question = body.question;
    if (body.answer   !== undefined) patch.answer   = body.answer;
    if (body.tags     !== undefined) patch.tags     = body.tags;
    if (body.active   !== undefined) patch.active   = body.active;
    const { data, error } = await db.schema('ia').from('knowledge')
      .update(patch).eq('id', id).select().single();
    if (error) return err(error.message, 500);
    return json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return err('id é obrigatório');
    const { error } = await db.schema('ia').from('knowledge').delete().eq('id', id);
    if (error) return err(error.message, 500);
    return json({ ok: true });
  }

  return err('Método não permitido', 405);
}

export const config = { runtime: 'edge' };
