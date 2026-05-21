// /api/admin/os/photos.js
// Vercel Edge Function — Upload de fotos de OS para Supabase Storage

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const VALID_TIPOS = ['antes', 'durante', 'depois'];

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // 1. Autenticação
  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );

  const accessToken = cookies['sb-access-token'];
  if (!accessToken) {
    return json(401, { ok: false, error: 'unauthorized', message: 'Sessão ausente.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return json(401, { ok: false, error: 'unauthorized', message: 'Sessão inválida.' });
  }

  try {
    // 2. Parse do FormData
    const formData = await req.formData();
    const photoFile = formData.get('photo');
    const osId      = formData.get('os_id');
    const category  = formData.get('category');

    if (!photoFile || !osId || !category) {
      return json(400, { ok: false, error: 'validation_failed', message: 'photo, os_id e category são obrigatórios.' });
    }

    if (!VALID_TIPOS.includes(category)) {
      return json(400, { ok: false, error: 'validation_failed', message: `category deve ser um de: ${VALID_TIPOS.join(', ')}.` });
    }

    // 3. Confirma que a OS existe
    const { data: repair, error: repairError } = await supabase
      .from('repairs')
      .select('id')
      .eq('id', osId)
      .is('deleted_at', null)
      .single();

    if (repairError || !repair) {
      return json(404, { ok: false, error: 'os_not_found', message: 'OS não encontrada.' });
    }

    // 4. Upload para Supabase Storage
    const arrayBuffer = await photoFile.arrayBuffer();
    const filePath    = `${osId}/${Date.now()}-${category}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('os-photos')
      .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) {
      console.error('Erro no upload de foto:', uploadError);
      return json(500, { ok: false, error: 'upload_failed', message: 'Erro ao enviar foto para o Storage.' });
    }

    // 5. URL pública
    const { data: urlData } = supabase.storage.from('os-photos').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // 6. Registra na tabela repair_photos
    const { data: photoRow, error: insertError } = await supabase
      .from('repair_photos')
      .insert({ repair_id: osId, url: publicUrl, tipo: category })
      .select('id, url, tipo, uploaded_at')
      .single();

    if (insertError) {
      console.error('Erro ao registrar foto no banco:', insertError);
      return json(500, { ok: false, error: 'database_error', message: 'Foto enviada mas falhou ao registrar no banco.' });
    }

    return json(200, { ok: true, data: { url: photoRow.url, id: photoRow.id, tipo: photoRow.tipo } });

  } catch (err) {
    console.error('Erro no endpoint de upload de fotos:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno.' });
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
