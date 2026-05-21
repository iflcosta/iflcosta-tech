// /api/admin/inventory/presets.js
// Vercel Edge Function — Presets do Custom PC Builder (Feature 007)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...val] = cookie.trim().split('=');
    if (key) acc[key] = val.join('=');
    return acc;
  }, {});

  const accessToken = cookies['sb-access-token'];
  if (!accessToken) {
    return json(401, { ok: false, error: 'unauthorized', message: 'Sessão ausente.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return json(401, { ok: false, error: 'unauthorized', message: 'Sessão inválida.' });
  }

  if (req.method === 'GET')  return handleGet(req, supabase);
  if (req.method === 'POST') return handlePost(req, supabase);
  if (req.method === 'PUT')  return handlePut(req, supabase);
  return json(405, { ok: false, error: 'method_not_allowed' });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/inventory/presets — Lista presets ou um único (?id=UUID)
// ─────────────────────────────────────────────────────────────────────────────
async function handleGet(req, supabase) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      const { data, error } = await supabase
        .from('pc_build_presets')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return json(404, { ok: false, error: 'not_found', message: 'Preset não encontrado.' });
      }
      return json(200, { ok: true, data });
    }

    const isActive = url.searchParams.get('is_active');
    const limit    = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset   = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('pc_build_presets')
      .select('*', { count: 'exact' });

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    query = query
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Erro ao listar presets:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao consultar presets.' });
    }

    return json(200, { ok: true, data, count });
  } catch (err) {
    console.error('Erro no GET de presets:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/inventory/presets — Cria preset
// ─────────────────────────────────────────────────────────────────────────────
async function handlePost(req, supabase) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'Payload inválido.' });
    }

    const { nome, descricao, faixa_preco_min, faixa_preco_max, components, is_active } = body;

    if (!nome || nome.trim().length < 2) {
      return json(400, { ok: false, error: 'validation_failed', message: 'nome é obrigatório (mín. 2 caracteres).' });
    }

    const compError = validateComponents(components);
    if (compError) {
      return json(400, { ok: false, error: 'validation_failed', message: compError });
    }

    const payload = {
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      faixa_preco_min: numOrNull(faixa_preco_min),
      faixa_preco_max: numOrNull(faixa_preco_max),
      components,
      is_active: is_active !== false,
    };

    const { data, error } = await supabase
      .from('pc_build_presets')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao inserir preset:', error);
      if (error.code === '23505') {
        return json(409, { ok: false, error: 'duplicate_entry', message: 'Já existe um preset com esse nome.' });
      }
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao salvar preset.' });
    }

    return json(201, { ok: true, data });
  } catch (err) {
    console.error('Erro no POST de presets:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/inventory/presets — Atualiza preset (id obrigatório no body)
// ─────────────────────────────────────────────────────────────────────────────
async function handlePut(req, supabase) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'id do preset é obrigatório no body.' });
    }

    const { id, nome, descricao, faixa_preco_min, faixa_preco_max, components, is_active } = body;

    const updates = {};

    if (nome !== undefined) {
      if (!nome || nome.trim().length < 2) {
        return json(400, { ok: false, error: 'validation_failed', message: 'nome deve ter mín. 2 caracteres.' });
      }
      updates.nome = nome.trim();
    }

    if (components !== undefined) {
      const compError = validateComponents(components);
      if (compError) {
        return json(400, { ok: false, error: 'validation_failed', message: compError });
      }
      updates.components = components;
    }

    if (descricao       !== undefined) updates.descricao       = descricao?.trim() || null;
    if (faixa_preco_min !== undefined) updates.faixa_preco_min = numOrNull(faixa_preco_min);
    if (faixa_preco_max !== undefined) updates.faixa_preco_max = numOrNull(faixa_preco_max);
    if (is_active       !== undefined) updates.is_active       = Boolean(is_active);

    if (Object.keys(updates).length === 0) {
      return json(400, { ok: false, error: 'no_changes', message: 'Nenhum campo para atualizar.' });
    }

    const { data, error } = await supabase
      .from('pc_build_presets')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar preset:', error);
      if (error.code === '23505') {
        return json(409, { ok: false, error: 'duplicate_entry', message: 'Já existe um preset com esse nome.' });
      }
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao atualizar preset.' });
    }
    if (!data) {
      return json(404, { ok: false, error: 'not_found', message: 'Preset não encontrado.' });
    }

    return json(200, { ok: true, data });
  } catch (err) {
    console.error('Erro no PUT de presets:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// Valida o array `components`: [{ category, sug_product_id?, qty? }]
function validateComponents(components) {
  if (!Array.isArray(components)) {
    return 'components deve ser um array.';
  }
  if (components.length === 0) {
    return 'components deve conter ao menos um item.';
  }
  for (const c of components) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      return 'Cada item de components deve ser um objeto.';
    }
    if (!c.category || typeof c.category !== 'string') {
      return 'Cada componente precisa de "category" (string).';
    }
  }
  return null;
}

function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
