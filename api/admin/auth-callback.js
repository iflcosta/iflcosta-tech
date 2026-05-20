// /api/admin/auth-callback.js
// Vercel Edge Function — troca código de Magic Link por sessão e seta cookies (Feature 004)
// Spec: /.specs/004-admin-auth/spec.md
// Plan: /.specs/004-admin-auth/plan.md §3

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/admin';

  if (!code) {
    return Response.redirect(new URL('/admin/login?error=missing_code', req.url));
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error || !data.session) {
      console.error('Falha ao trocar código por sessão:', error);
      return Response.redirect(new URL('/admin/login?error=expired', req.url));
    }

    const { access_token, refresh_token, expires_in } = data.session;

    // Redireciona o usuário para o destino final (por padrão /admin)
    const res = Response.redirect(new URL(next, req.url));
    
    // Configura cookies HttpOnly seguros com escopo restrito a /admin
    res.headers.append(
      'Set-Cookie',
      `sb-access-token=${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/admin; Max-Age=${expires_in}`
    );
    res.headers.append(
      'Set-Cookie',
      `sb-refresh-token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/admin; Max-Age=${60 * 60 * 24 * 30}`
    );

    // Grava no log de auditoria
    const actor = data.user?.id || 'system';
    await supabase.from('audit_log').insert({
      actor: actor,
      action: 'login_success',
      entity: 'auth',
      entity_id: actor,
      after: { method: 'magic_link' }
    });

    return res;
  } catch (err) {
    console.error('Erro na rota de callback de auth:', err);
    return Response.redirect(new URL('/admin/login?error=expired', req.url));
  }
}
