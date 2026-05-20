// /api/admin/auth-callback.js
// Vercel Edge Function — troca código de Magic Link por sessão e seta cookies (Feature 004)
// Spec: /.specs/004-admin-auth/spec.md
// Plan: /.specs/004-admin-auth/plan.md §3

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const errorParam = url.searchParams.get('error') || url.searchParams.get('error_description');
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/admin';

  if (errorParam) {
    console.error('Erro de autenticação retornado pelo Supabase:', errorParam);
    const errorString = errorParam.toLowerCase();
    const isExpired = errorString.includes('expired') || 
                      errorString.includes('invalid') ||
                      errorString.includes('unauthorized');
    return Response.redirect(new URL(`/admin/login?error=${isExpired ? 'expired' : 'server_error'}`, req.url));
  }

  if (!code) {
    // Retorna uma página HTML de transição rápida para processar o Hash Fragment (Implicit Flow) no client-side.
    // Isso é necessário porque o hash fragment (#access_token=...) não é enviado ao servidor.
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autenticando... | IFL Costa</title>
  <style>
    :root {
      --bg-color: #0f172a;
      --text-color: #f8fafc;
      --accent-color: #3b82f6;
      --card-bg: #1e293b;
    }
    body {
      background: var(--bg-color);
      color: var(--text-color);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      overflow: hidden;
    }
    .container {
      background: var(--card-bg);
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 380px;
      width: 90%;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.05);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border-left-color: var(--accent-color);
      animation: spin 1s linear infinite;
      margin-bottom: 1.5rem;
    }
    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.025em;
    }
    p {
      color: #94a3b8;
      font-size: 0.875rem;
      margin: 0;
      line-height: 1.5;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Verificando credenciais</h2>
    <p id="msg">Estamos validando seu link de acesso rápido. Isso deve levar apenas um instante...</p>
  </div>
  <script>
    (async function() {
      const hash = window.location.hash;
      const msg = document.getElementById('msg');
      
      if (hash && hash.startsWith('#')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const expiresIn = params.get('expires_in');
        const error = params.get('error') || params.get('error_description');

        if (error) {
          console.error('Erro na hash do Supabase:', error);
          window.location.href = '/admin/login?error=expired';
          return;
        }

        if (accessToken && refreshToken) {
          try {
            msg.textContent = 'Configurando sessão segura...';
            const res = await fetch('/api/admin/auth-set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: expiresIn
              })
            });
            const result = await res.json().catch(() => ({}));
            
            if (res.ok && result.ok) {
              msg.textContent = 'Sessão iniciada! Redirecionando...';
              window.location.href = '/admin';
              return;
            } else {
              console.error('Falha ao configurar cookies:', result);
              window.location.href = '/admin/login?error=expired';
              return;
            }
          } catch (e) {
            console.error('Erro de conexão ao set-session:', e);
            window.location.href = '/admin/login?error=server_error';
            return;
          }
        }
      }
      
      // Se não havia hash válido na URL
      console.warn('Sem hash fragment ou código na URL.');
      window.location.href = '/admin/login?error=missing_code';
    })();
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
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
    // Criamos uma resposta manualmente porque Response.redirect() retorna headers imutáveis no Edge Runtime
    const res = new Response(null, {
      status: 307,
      headers: {
        'Location': new URL(next, req.url).toString()
      }
    });
    
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
