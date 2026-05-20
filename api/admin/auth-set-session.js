// /api/admin/auth-set-session.js
// Vercel Edge Function — recebe tokens do client-side e grava os cookies HttpOnly (Feature 004)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.access_token || !body.refresh_token) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_payload', message: 'Tokens obrigatórios ausentes.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { access_token, refresh_token } = body;
    const expires_in = parseInt(body.expires_in, 10) || 3600;

    // Inicializa Supabase para validação e auditoria
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Valida o access token enviado antes de emitir os cookies
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);

    if (userError || !user) {
      console.error('Token de acesso inválido fornecido ao set-session:', userError);
      return new Response(JSON.stringify({ ok: false, error: 'invalid_token', message: 'Token de autenticação inválido.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Apenas o e-mail permitido (Iago) pode acessar a área administrativa
    const ALLOWED_EMAIL = 'iflcosta@outlook.com';
    if (user.email !== ALLOWED_EMAIL) {
      console.warn(`Tentativa de acesso bloqueada por e-mail não autorizado: ${user.email}`);
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized', message: 'Acesso negado.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cria a resposta de sucesso e define os cookies seguros HttpOnly
    const res = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    res.headers.append(
      'Set-Cookie',
      `sb-access-token=${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${expires_in}`
    );
    res.headers.append(
      'Set-Cookie',
      `sb-refresh-token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
    );

    // Grava no log de auditoria
    const actor = user.id || 'system';
    await supabase.from('audit_log').insert({
      actor: actor,
      action: 'login_success',
      entity: 'auth',
      entity_id: actor,
      after: { method: 'magic_link_hash' }
    });

    return res;
  } catch (err) {
    console.error('Erro de servidor ao configurar sessão via hash:', err);
    return new Response(JSON.stringify({ ok: false, error: 'server_error', message: 'Erro interno ao autenticar.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
