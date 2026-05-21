// /api/admin/inventory/products.js
// Vercel Edge Function — CRUD de Produtos do Estoque (Feature 007)

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

  const actor = authData.user.id;

  if (req.method === 'GET')    return handleGet(req, supabase);
  if (req.method === 'POST')   return handlePost(req, supabase, actor);
  if (req.method === 'PUT')    return handlePut(req, supabase, actor);
  if (req.method === 'DELETE') return handleDelete(req, supabase);
  return json(405, { ok: false, error: 'method_not_allowed' });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/inventory/products
// Query params: id, search, categoria, baixo_estoque, is_active, limit, offset
// ─────────────────────────────────────────────────────────────────────────────
async function handleGet(req, supabase) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    // Busca individual por ID
    if (id) {
      const { data, error } = await supabase
        .from('products')
        .select('*, inventory_movements(id, tipo, qty, custo_unitario, observacao, created_at)')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        return json(404, { ok: false, error: 'not_found', message: 'Produto não encontrado.' });
      }
      return json(200, { ok: true, data });
    }

    const search      = url.searchParams.get('search')?.trim();
    const categoria   = url.searchParams.get('categoria')?.trim();
    const baixoEstoque = url.searchParams.get('baixo_estoque') === 'true';
    const isActive    = url.searchParams.get('is_active');
    const limit       = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset      = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    if (search) {
      query = query.or(`nome.ilike.%${search}%,sku.ilike.%${search}%,marca.ilike.%${search}%,modelo.ilike.%${search}%`);
    }

    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    if (baixoEstoque) {
      query = query.eq('baixo_estoque', true);
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    query = query
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Erro ao listar produtos:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao consultar produtos.' });
    }

    return json(200, { ok: true, data, count });
  } catch (err) {
    console.error('Erro no GET de produtos:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/inventory/products — Criação de produto
// ─────────────────────────────────────────────────────────────────────────────
async function handlePost(req, supabase, actor) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'Payload inválido.' });
    }

    const {
      sku, nome, categoria, subcategoria, marca, modelo,
      custo_atual, preco_venda, qty_minima,
      fornecedor, specs, is_active
    } = body;

    if (!nome || nome.trim().length < 2) {
      return json(400, { ok: false, error: 'validation_failed', message: 'Nome é obrigatório (mín. 2 caracteres).' });
    }

    const categoriasValidas = ['peça', 'acessório', 'componente_pc'];
    if (!categoria || !categoriasValidas.includes(categoria)) {
      return json(400, { ok: false, error: 'validation_failed', message: `Categoria inválida. Use: ${categoriasValidas.join(', ')}.` });
    }

    const custoNum = parseFloat(custo_atual);
    const vendaNum = parseFloat(preco_venda);
    if (isNaN(custoNum) || custoNum < 0) {
      return json(400, { ok: false, error: 'validation_failed', message: 'custo_atual deve ser um número >= 0.' });
    }
    if (isNaN(vendaNum) || vendaNum < 0) {
      return json(400, { ok: false, error: 'validation_failed', message: 'preco_venda deve ser um número >= 0.' });
    }

    const payload = {
      sku:          sku?.trim() || null,
      nome:         nome.trim(),
      categoria,
      subcategoria: subcategoria?.trim() || null,
      marca:        marca?.trim() || null,
      modelo:       modelo?.trim() || null,
      custo_atual:  custoNum,
      preco_venda:  vendaNum,
      qty_minima:   parseInt(qty_minima) || 0,
      fornecedor:   fornecedor && typeof fornecedor === 'object' ? fornecedor : {},
      specs:        specs && typeof specs === 'object' ? specs : {},
      is_active:    is_active !== false,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao inserir produto:', error);
      if (error.code === '23505') {
        return json(409, { ok: false, error: 'duplicate_entry', message: 'SKU já cadastrado para outro produto.' });
      }
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao salvar produto.' });
    }

    return json(201, { ok: true, data });
  } catch (err) {
    console.error('Erro no POST de produtos:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/inventory/products — Atualização de produto (id obrigatório)
// ─────────────────────────────────────────────────────────────────────────────
async function handlePut(req, supabase, actor) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'id do produto é obrigatório no body.' });
    }

    const {
      id, sku, nome, categoria, subcategoria, marca, modelo,
      custo_atual, preco_venda, qty_minima,
      fornecedor, specs, is_active
    } = body;

    const updates = {};

    if (nome !== undefined) {
      if (!nome || nome.trim().length < 2) {
        return json(400, { ok: false, error: 'validation_failed', message: 'Nome deve ter mín. 2 caracteres.' });
      }
      updates.nome = nome.trim();
    }

    if (categoria !== undefined) {
      const categoriasValidas = ['peça', 'acessório', 'componente_pc'];
      if (!categoriasValidas.includes(categoria)) {
        return json(400, { ok: false, error: 'validation_failed', message: `Categoria inválida. Use: ${categoriasValidas.join(', ')}.` });
      }
      updates.categoria = categoria;
    }

    if (sku         !== undefined) updates.sku         = sku?.trim() || null;
    if (subcategoria !== undefined) updates.subcategoria = subcategoria?.trim() || null;
    if (marca        !== undefined) updates.marca        = marca?.trim() || null;
    if (modelo       !== undefined) updates.modelo       = modelo?.trim() || null;
    if (is_active    !== undefined) updates.is_active    = Boolean(is_active);

    if (custo_atual !== undefined) {
      const v = parseFloat(custo_atual);
      if (isNaN(v) || v < 0) return json(400, { ok: false, error: 'validation_failed', message: 'custo_atual inválido.' });
      updates.custo_atual = v;
    }
    if (preco_venda !== undefined) {
      const v = parseFloat(preco_venda);
      if (isNaN(v) || v < 0) return json(400, { ok: false, error: 'validation_failed', message: 'preco_venda inválido.' });
      updates.preco_venda = v;
    }
    if (qty_minima !== undefined) updates.qty_minima = parseInt(qty_minima) || 0;
    if (fornecedor !== undefined && typeof fornecedor === 'object') updates.fornecedor = fornecedor;
    if (specs      !== undefined && typeof specs === 'object')      updates.specs      = specs;

    if (Object.keys(updates).length === 0) {
      return json(400, { ok: false, error: 'no_changes', message: 'Nenhum campo para atualizar.' });
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      if (error.code === '23505') {
        return json(409, { ok: false, error: 'duplicate_entry', message: 'SKU já usado por outro produto.' });
      }
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao atualizar produto.' });
    }
    if (!data) {
      return json(404, { ok: false, error: 'not_found', message: 'Produto não encontrado.' });
    }

    return json(200, { ok: true, data });
  } catch (err) {
    console.error('Erro no PUT de produtos:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/inventory/products?id=UUID — Soft delete
// ─────────────────────────────────────────────────────────────────────────────
async function handleDelete(req, supabase) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'id do produto é obrigatório.' });
    }

    const { data, error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, nome')
      .single();

    if (error) {
      console.error('Erro ao deletar produto:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao excluir produto.' });
    }
    if (!data) {
      return json(404, { ok: false, error: 'not_found', message: 'Produto não encontrado.' });
    }

    return json(200, { ok: true, message: `Produto "${data.nome}" excluído (soft delete).`, data });
  } catch (err) {
    console.error('Erro no DELETE de produtos:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
