// /api/admin/auth-refresh.js
// Vercel Edge Function — renova tokens de sessão usando refresh token (Feature 004)
// Spec: /.specs/004-admin-auth/spec.md
// Plan: /.specs/004-admin-auth/plan.md §3

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/admin';

  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...val] = cookie.trim().split('=');
    if (key) acc[key] = val.join('=');
    return acc;
  }, {});

  const refreshToken = cookies['sb-refresh-token'];

  if (!refreshToken) {
    return Response.redirect(new URL(`/admin/login?next=${encodeURIComponent(next)}&error=session`, req.url));
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      console.error('Falha ao renovar sessão com Supabase:', error);
      
      // Limpa os cookies se o refresh token falhar (revogado/expirado)
      // Criamos uma resposta manualmente porque Response.redirect() retorna headers imutáveis no Edge Runtime
      const res = new Response(null, {
        status: 307,
        headers: {
          'Location': new URL(`/admin/login?next=${encodeURIComponent(next)}&error=expired`, req.url).toString()
        }
      });
      res.headers.append('Set-Cookie', 'sb-access-token=; Max-Age=0; Path=/admin; HttpOnly; Secure; SameSite=Lax');
      res.headers.append('Set-Cookie', 'sb-refresh-token=; Max-Age=0; Path=/admin; HttpOnly; Secure; SameSite=Lax');
      return res;
    }

    const { access_token, refresh_token, expires_in } = data.session;

    // Redireciona o usuário para o destino pretendido com os novos cookies atualizados
    // Criamos uma resposta manualmente porque Response.redirect() retorna headers imutáveis no Edge Runtime
    const res = new Response(null, {
      status: 307,
      headers: {
        'Location': new URL(next, req.url).toString()
      }
    });
    res.headers.append(
      'Set-Cookie',
      `sb-access-token=${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/admin; Max-Age=${expires_in}`
    );
    res.headers.append(
      'Set-Cookie',
      `sb-refresh-token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/admin; Max-Age=${60 * 60 * 24 * 30}`
    );
    
    return res;
  } catch (err) {
    console.error('Erro geral no endpoint de refresh de auth:', err);
    return Response.redirect(new URL(`/admin/login?next=${encodeURIComponent(next)}&error=session`, req.url));
  }
}
