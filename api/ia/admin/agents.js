// GET   /api/ia/admin/agents?tenant_id=X   — busca agente do tenant
// PATCH /api/ia/admin/agents?tenant_id=X   — salva (cria versão antes)
// GET   /api/ia/admin/agents?tenant_id=X&versions=1 — lista versões
// POST  /api/ia/admin/agents?tenant_id=X&restore=VERSION_ID — restaura versão
import { supabase, json, err, requireAuth } from './_auth.js';

export default async function handler(req) {
  const user = await requireAuth(req);
  if (!user) return err('Não autorizado', 401);

  const db = supabase();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');
  if (!tenantId) return err('tenant_id é obrigatório');

  // ── GET: agente ou versões ────────────────────────────────────
  if (req.method === 'GET') {
    if (searchParams.get('versions')) {
      const { data, error } = await db.schema('ia').from('agent_versions')
        .select('id, system_prompt, model, temperature, max_tokens, saved_by, created_at')
        .eq('agent_id', searchParams.get('versions'))
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return err(error.message, 500);
      return json(data ?? []);
    }

    const { data, error } = await db.schema('ia').from('agents')
      .select('*, knowledge(id, question, answer, tags, active, created_at)')
      .eq('tenant_id', tenantId)
      .single();
    if (error) return err(error.message, 404);
    return json(data);
  }

  // ── PATCH: atualizar agente (salva versão antes) ──────────────
  if (req.method === 'PATCH') {
    const body = await req.json().catch(() => ({}));
    const { system_prompt, model, temperature, max_tokens, schedule, off_hours_msg, active, name } = body;

    // Busca agente atual para snapshot
    const { data: current, error: fetchErr } = await db.schema('ia').from('agents')
      .select('id, system_prompt, model, temperature, max_tokens')
      .eq('tenant_id', tenantId).single();
    if (fetchErr) return err(fetchErr.message, 404);

    // Salva versão anterior se prompt mudou
    if (system_prompt !== undefined && system_prompt !== current.system_prompt) {
      await db.schema('ia').from('agent_versions').insert({
        agent_id:      current.id,
        system_prompt: current.system_prompt,
        model:         current.model,
        temperature:   current.temperature,
        max_tokens:    current.max_tokens,
      });
    }

    // Atualiza agente
    const patch = {};
    if (name          !== undefined) patch.name          = name;
    if (system_prompt !== undefined) patch.system_prompt = system_prompt;
    if (model         !== undefined) patch.model         = model;
    if (temperature   !== undefined) patch.temperature   = parseFloat(temperature);
    if (max_tokens    !== undefined) patch.max_tokens    = parseInt(max_tokens, 10);
    if (schedule      !== undefined) patch.schedule      = schedule;
    if (off_hours_msg !== undefined) patch.off_hours_msg = off_hours_msg;
    if (active        !== undefined) patch.active        = active;

    const { data, error } = await db.schema('ia').from('agents')
      .update(patch).eq('tenant_id', tenantId).select().single();
    if (error) return err(error.message, 500);
    return json(data);
  }

  // ── POST: restaurar versão ────────────────────────────────────
  if (req.method === 'POST') {
    const restoreId = searchParams.get('restore');
    if (!restoreId) return err('restore=VERSION_ID é obrigatório para POST');

    const { data: ver, error: verErr } = await db.schema('ia').from('agent_versions')
      .select('*').eq('id', restoreId).single();
    if (verErr) return err('Versão não encontrada', 404);

    // Atualiza agente com dados da versão (PATCH vai salvar snapshot atual primeiro)
    const fakeReq = new Request(req.url + '&_restore=1', {
      method: 'PATCH',
      headers: req.headers,
      body: JSON.stringify({
        system_prompt: ver.system_prompt,
        model:         ver.model,
        temperature:   ver.temperature,
        max_tokens:    ver.max_tokens,
      }),
    });
    return handler(fakeReq);
  }

  return err('Método não permitido', 405);
}

export const config = { runtime: 'edge' };
