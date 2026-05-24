// /middleware.js
// Vercel Edge Middleware — proteção do painel admin (Feature 004)
// Spec: /.specs/004-admin-auth/spec.md
// Plan: /.specs/004-admin-auth/plan.md

import { createClient } from '@supabase/supabase-js';

export const config = {
  matcher: ['/admin/:path*', '/', '/demo'],
};

export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const host = req.headers.get('host') || '';

  // ── Hostname routing ─────────────────────────────────────────
  if (host === 'ia.iflcosta.tech') {
    const target = path === '/demo' ? '/ia/demo' : '/ia';
    return fetch(new URL(target, req.url).toString());
  }
  if (host === 'iflcosta.tech') {
    return fetch(new URL('/portal', req.url).toString());
  }
  // ─────────────────────────────────────────────────────────────

  // 1. Whitelist: rotas públicas do admin que não necessitam de auth gate
  if (
    path === '/admin/login' || 
    path === '/admin/login.html' || 
    path.startsWith('/admin/auth/')
  ) {
    return; // Pass-through
  }

  // 2. Leitura dos cookies da requisição
  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...val] = cookie.trim().split('=');
    if (key) acc[key] = val.join('=');
    return acc;
  }, {});

  const accessToken = cookies['sb-access-token'];
  const refreshToken = cookies['sb-refresh-token'];

  // Se não houver access token, tenta usar o refresh token ou manda pro login
  if (!accessToken) {
    if (refreshToken) {
      // Redireciona para o endpoint de refresh automático preservando o destino original
      return Response.redirect(
        new URL(`/api/admin/auth-refresh?next=${encodeURIComponent(path)}`, req.url)
      );
    }
    return Response.redirect(
      new URL(`/admin/login?next=${encodeURIComponent(path)}`, req.url)
    );
  }

  // 3. Validação do token contra o Supabase
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      // Token inválido ou expirado. Se tiver refresh token, tenta renovar
      if (refreshToken) {
        return Response.redirect(
          new URL(`/api/admin/auth-refresh?next=${encodeURIComponent(path)}`, req.url)
        );
      }
      // Sem refresh token, manda para o login
      return Response.redirect(
        new URL(`/admin/login?next=${encodeURIComponent(path)}&error=session`, req.url)
      );
    }

    // Token válido! Adiciona o id do usuário nos headers para a página se necessário
    const response = new Response(null, {
      headers: {
        'x-user-id': data.user.id
      }
    });
    // Nota: Em middlewares Vercel sem Next.js, retornar undefined/void permite
    // a continuação. Se retornarmos um Response completo, ele intercepta.
    // Para injetar headers na requisição continuada, podemos retornar undefined
    // e deixar fluir. Caso queiramos apenas permitir a entrada:
    return;
  } catch (err) {
    console.error('Erro de validação no middleware:', err);
    return Response.redirect(
      new URL(`/admin/login?next=${encodeURIComponent(path)}&error=session`, req.url)
    );
  }
}
