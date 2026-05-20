// /api/admin/auth-logout.js
// Vercel Edge Function — remove cookies e invalida sessão no Supabase (Feature 004)
// Spec: /.specs/004-admin-auth/spec.md
// Plan: /.specs/004-admin-auth/plan.md §3

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...val] = cookie.trim().split('=');
    if (key) acc[key] = val.join('=');
    return acc;
  }, {});

  const accessToken = cookies['sb-access-token'];
  const scope = new URL(req.url).searchParams.get('scope') || 'local';

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    if (accessToken) {
      let userId = '';
      try {
        const { data } = await supabase.auth.getUser(accessToken);
        if (data?.user) {
          userId = data.user.id;
          // Grava no log de auditoria
          await supabase.from('audit_log').insert({
            actor: userId,
            action: 'logout',
            entity: 'auth',
            entity_id: userId,
            after: { scope }
          });
        }
      } catch (logErr) {
        console.error('Erro ao obter usuário ou gravar log de auditoria:', logErr);
      }
      
      try {
        // Invalida a sessão no Supabase Auth usando o próprio token do usuário
        const userSupabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            },
            auth: { persistSession: false }
          }
        );
        await userSupabase.auth.signOut();
      } catch (signOutErr) {
        console.error('Erro ao invalidar sessão no Supabase:', signOutErr);
      }
    }
  } catch (err) {
    console.error('Erro geral ao processar logout no servidor:', err);
  }

  // Redireciona para a landing principal limpando os cookies de sessão
  // Criamos uma resposta manualmente porque Response.redirect() retorna headers imutáveis no Edge Runtime
  const res = new Response(null, {
    status: 307,
    headers: {
      'Location': new URL('/', req.url).toString()
    }
  });
  res.headers.append('Set-Cookie', 'sb-access-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  res.headers.append('Set-Cookie', 'sb-refresh-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  
  return res;
}
