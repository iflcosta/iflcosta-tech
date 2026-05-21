// /api/admin/inventory/movements.js
// Vercel Edge Function — Movimentações de Estoque (Feature 007)

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
  if (req.method === 'DELETE') return handleDelete(req, supabase);
  return json(405, { ok: false, error: 'method_not_allowed' });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/inventory/movements
// Query params: product_id, repair_id, tipo, date_from, date_to, limit, offset
// ─────────────────────────────────────────────────────────────────────────────
async function handleGet(req, supabase) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('product_id')?.trim();
    const repairId  = url.searchParams.get('repair_id')?.trim();
    const tipo      = url.searchParams.get('tipo')?.trim();
    const dateFrom  = url.searchParams.get('date_from')?.trim();
    const dateTo    = url.searchParams.get('date_to')?.trim();
    const limit     = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset    = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('inventory_movements')
      .select('*, products(id, nome, sku, categoria)', { count: 'exact' });

    if (productId) query = query.eq('product_id', productId);
    if (repairId)  query = query.eq('repair_id', repairId);
    if (tipo)      query = query.eq('tipo', tipo);
    if (dateFrom)  query = query.gte('created_at', dateFrom);
    if (dateTo)    query = query.lte('created_at', dateTo);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Erro ao listar movimentações:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao consultar movimentações.' });
    }

    return json(200, { ok: true, data, count });
  } catch (err) {
    console.error('Erro no GET de movimentações:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/inventory/movements — Registra movimentação
// O trigger handle_inventory_movement_stock recalcula products.qty_atual;
// se repair_id estiver presente, sync_repair_parts_cost atualiza a OS.
// ─────────────────────────────────────────────────────────────────────────────
async function handlePost(req, supabase, actor) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'Payload inválido.' });
    }

    const { product_id, tipo, qty, custo_unitario, repair_id, nf, observacao } = body;

    if (!product_id) {
      return json(400, { ok: false, error: 'validation_failed', message: 'product_id é obrigatório.' });
    }

    const tiposValidos = ['entrada', 'saída', 'ajuste'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return json(400, { ok: false, error: 'validation_failed', message: `tipo inválido. Use: ${tiposValidos.join(', ')}.` });
    }

    const qtyNum = parseInt(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return json(400, { ok: false, error: 'validation_failed', message: 'qty deve ser um inteiro maior que zero.' });
    }

    // Valida produto
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('id, nome, custo_atual')
      .eq('id', product_id)
      .is('deleted_at', null)
      .single();

    if (prodError || !product) {
      return json(400, { ok: false, error: 'product_not_found', message: 'Produto não encontrado ou inativo.' });
    }

    // Valida OS associada, se fornecida
    if (repair_id) {
      const { data: repair, error: repairError } = await supabase
        .from('repairs')
        .select('id')
        .eq('id', repair_id)
        .is('deleted_at', null)
        .single();

      if (repairError || !repair) {
        return json(400, { ok: false, error: 'repair_not_found', message: 'OS associada não encontrada.' });
      }
    }

    // custo_unitario: usa o informado; senão, o custo atual do produto
    let custoNum = parseFloat(custo_unitario);
    if (isNaN(custoNum) || custoNum < 0) {
      custoNum = parseFloat(product.custo_atual) || 0;
    }

    const payload = {
      product_id,
      tipo,
      qty: qtyNum,
      custo_unitario: custoNum,
      repair_id: repair_id || null,
      nf: nf?.trim() || null,
      observacao: observacao?.trim() || null,
      actor,
    };

    const { data: movement, error: insertError } = await supabase
      .from('inventory_movements')
      .insert(payload)
      .select('*, products(id, nome, sku, qty_atual, baixo_estoque)')
      .single();

    if (insertError) {
      console.error('Erro ao registrar movimentação:', insertError);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao registrar movimentação.' });
    }

    return json(201, { ok: true, data: movement });
  } catch (err) {
    console.error('Erro no POST de movimentações:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/inventory/movements?id=UUID — Estorna movimentação
// (usado ao remover uma peça da OS; triggers recalculam estoque e custo)
// ─────────────────────────────────────────────────────────────────────────────
async function handleDelete(req, supabase) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'id da movimentação é obrigatório.' });
    }

    const { data, error } = await supabase
      .from('inventory_movements')
      .delete()
      .eq('id', id)
      .select('id, product_id, tipo, qty')
      .single();

    if (error) {
      console.error('Erro ao estornar movimentação:', error);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao estornar movimentação.' });
    }
    if (!data) {
      return json(404, { ok: false, error: 'not_found', message: 'Movimentação não encontrada.' });
    }

    return json(200, { ok: true, message: 'Movimentação estornada. Estoque recalculado.', data });
  } catch (err) {
    console.error('Erro no DELETE de movimentações:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
