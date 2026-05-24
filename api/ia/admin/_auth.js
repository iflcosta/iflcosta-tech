// Shared auth helper for IA admin Edge APIs
import { createClient } from '@supabase/supabase-js';

export function supabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function err(msg, status = 400) {
  return json({ error: msg }, status);
}

export async function requireAuth(req) {
  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const token = cookies['sb-access-token'];
  if (!token) return null;

  const { data, error } = await supabase().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
