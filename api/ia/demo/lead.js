// POST /api/ia/demo/lead — público, captura lead do /ia/demo
// Rate limit simples: 3 req/hora/IP (via headers Vercel)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const json = (d, s=200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });

  const body = await req.json().catch(() => ({}));
  const { contact, contact_type, demo_snippet } = body;

  if (!contact?.trim()) return json({ error: 'contact é obrigatório' }, 400);
  if (!['phone','email'].includes(contact_type)) return json({ error: 'contact_type deve ser phone ou email' }, 400);

  // Rate limit básico por CF-Connecting-IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateLimitKey = `demo-lead:${ip}`;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // Conta leads do mesmo IP na última hora
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase.schema('ia').from('demo_leads')
    .select('id', { count: 'exact', head: true })
    .eq('contact', contact.trim())
    .gte('created_at', since);

  if ((count ?? 0) >= 3) {
    return json({ error: 'Muitas solicitações. Tente novamente em 1 hora.' }, 429);
  }

  const { error } = await supabase.schema('ia').from('demo_leads')
    .insert({
      contact:      contact.trim(),
      contact_type,
      demo_snippet: demo_snippet?.slice(0, 500) ?? null,
    });

  if (error) return json({ error: 'Erro ao salvar. Tente novamente.' }, 500);

  return json({ ok: true });
}

export const config = { runtime: 'edge' };
