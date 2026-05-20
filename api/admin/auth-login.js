// /api/admin/auth-login.js
// Vercel Edge Function — processa login (Magic Link ou Senha) e grava cookies httpOnly (Feature 004)
// Spec: /.specs/004-admin-auth/spec.md
// Plan: /.specs/004-admin-auth/plan.md §3

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
    if (!body || !body.email) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_payload', message: 'E-mail é obrigatório.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const token = body.token;
    const origin = new URL(req.url).origin;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Restrição absoluta single-user (Iago)
    const ALLOWED_EMAIL = 'iflcosta@outlook.com';

    if (email !== ALLOWED_EMAIL) {
      if (token) {
        return new Response(JSON.stringify({ ok: false, error: 'invalid_token', message: 'Código inválido ou expirado.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (!password) {
        // Magic link: finge sucesso para mitigar enumeração de contas
        return new Response(JSON.stringify({ ok: true, message: 'Se o e-mail estiver cadastrado, um link foi enviado.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Senha: falha imediatamente por segurança
        return new Response(JSON.stringify({ ok: false, error: 'invalid_credentials', message: 'E-mail ou senha inválidos.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Fluxo C: Verificação de OTP (6 dígitos)
    if (token) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: 'magiclink'
      });

      if (error || !data.session) {
        console.error('Erro ao verificar OTP via Supabase:', error);
        return new Response(JSON.stringify({ ok: false, error: 'invalid_token', message: 'Código inválido ou expirado. Tente de novo.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const { access_token, refresh_token, expires_in } = data.session;

      const res = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      // Injeta cookies HttpOnly de sessão e de refresh
      res.headers.append(
        'Set-Cookie',
        `sb-access-token=${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${expires_in}`
      );
      res.headers.append(
        'Set-Cookie',
        `sb-refresh-token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
      );

      // Registrar login bem-sucedido em audit_log
      const actor = data.user?.id || 'system';
      await supabase.from('audit_log').insert({
        actor: actor,
        action: 'login_success',
        entity: 'auth',
        entity_id: actor,
        after: { method: 'otp' }
      });

      return res;
    }

    // Fluxo A: Solicitação de Magic Link (apenas se senha e token não forem passados)
    if (!password) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/api/admin/auth-callback`
        }
      });

      if (error) {
        console.error('Erro ao enviar Magic Link via Supabase:', error);
        
        let status = error.status || 500;
        let message = 'Não conseguimos enviar o link. Tente de novo.';
        
        const errorMsg = (error.message || '').toLowerCase();
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests') || status === 429) {
          status = 429;
          message = 'Limite de envios atingido. Aguarde 60 segundos antes de solicitar um novo link.';
        } else if (error.message) {
          message = `Erro: ${error.message}`;
        }

        return new Response(JSON.stringify({ ok: false, error: 'provider_error', message }), {
          status: status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ ok: true, message: 'Link enviado com sucesso. Verifica sua caixa de entrada e spam!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fluxo B: Autenticação Tradicional por Senha
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      console.error('Erro ao logar por senha via Supabase:', error);
      
      // Registrar falha de login em audit_log
      await supabase.from('audit_log').insert({
        actor: null,
        action: 'login_fail',
        entity: 'auth',
        after: { email, reason: error?.message || 'invalid_credentials' }
      });

      return new Response(JSON.stringify({ ok: false, error: 'invalid_credentials', message: 'E-mail ou senha inválidos.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { access_token, refresh_token, expires_in } = data.session;

    const res = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Injeta cookies HttpOnly de sessão e de refresh
    res.headers.append(
      'Set-Cookie',
      `sb-access-token=${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${expires_in}`
    );
    res.headers.append(
      'Set-Cookie',
      `sb-refresh-token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
    );

    // Registrar login bem-sucedido em audit_log
    const actor = data.user?.id || 'system';
    await supabase.from('audit_log').insert({
      actor: actor,
      action: 'login_success',
      entity: 'auth',
      entity_id: actor,
      after: { method: 'password' }
    });

    return res;
  } catch (err) {
    console.error('Erro de servidor no login endpoint:', err);
    return new Response(JSON.stringify({ ok: false, error: 'server_error', message: 'Algo deu errado do nosso lado. Tente de novo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
