// GET /api/ia/config/:instance — configuração consumida pelo n8n (token protegido)
// Retorna wa_config + agent do tenant, sem PII
import { createClient } from '@supabase/supabase-js';

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const token = req.headers.get('x-config-token');
  if (!token || token !== process.env.IA_CONFIG_TOKEN) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(req.url);
  const instanceName = url.pathname.split('/').at(-1);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: instance, error } = await supabase.schema('ia')
    .from('wa_instances')
    .select(`
      id, instance_name, status, warmup_phase,
      wa_config(*),
      tenants(id,
        agents(
          id, name, system_prompt, model, temperature, max_tokens,
          schedule, off_hours_msg, active,
          knowledge(question, answer, active)
        )
      )
    `)
    .eq('instance_name', instanceName)
    .single();

  if (error || !instance) {
    return new Response(JSON.stringify({ error: 'Instância não encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const agent = instance.tenants?.agents?.[0] ?? null;
  const knowledge = agent?.knowledge?.filter(k => k.active) ?? [];

  // Limite diário baseado na fase de warmup
  const warmupLimits = [20, 50, 100, 200, null];
  const autoLimit = warmupLimits[(instance.warmup_phase ?? 1) - 1];

  const out = {
    instance_name:   instance.instance_name,
    instance_status: instance.status,
    warmup_phase:    instance.warmup_phase,
    wa_config: {
      ...(instance.wa_config ?? {}),
      effective_max_per_day: instance.wa_config?.max_msgs_per_day ?? autoLimit,
    },
    agent: agent ? {
      id:            agent.id,
      name:          agent.name,
      system_prompt: agent.system_prompt,
      model:         agent.model,
      temperature:   agent.temperature,
      max_tokens:    agent.max_tokens,
      schedule:      agent.schedule,
      off_hours_msg: agent.off_hours_msg,
      active:        agent.active,
      knowledge,
    } : null,
  };

  return new Response(JSON.stringify(out), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300',
    },
  });
}

export const config = { runtime: 'edge' };
