// /api/admin/os/tracking.js
// Vercel Edge Function — Rastreamento Público de OS (Página do Cliente) (Feature 006 - Upgrade)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Rota pública e anônima - Não requer cookies de sessão do admin
  if (req.method !== 'GET') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const url = new URL(req.url);
    const trackingToken = (url.searchParams.get('token') || url.searchParams.get('tracking_token'))?.trim();

    // 1. Validação do Token de Rastreamento (UUID)
    if (!trackingToken) {
      return json(400, { ok: false, error: 'missing_token', message: 'O token de rastreamento é obrigatório.' });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trackingToken)) {
      return json(400, { ok: false, error: 'invalid_token_format', message: 'O formato do token é inválido.' });
    }

    // Inicializar o cliente do Supabase com service_role para ler a view e tabelas restritas
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // 2. Buscar a OS associada ao token diretamente na View de Segurança Pública Sanitizada
    const { data: repair, error: repairError } = await supabase
      .from('view_public_os_tracking')
      .select('*')
      .eq('tracking_token', trackingToken)
      .single();

    if (repairError || !repair) {
      console.warn(`Tentativa de acesso com token inválido ou não encontrado: ${trackingToken}`);
      return json(404, { ok: false, error: 'not_found', message: 'Ordem de Serviço não encontrada.' });
    }

    // 3. Buscar fotos associadas (repair_photos) pelo os_id
    const { data: photos, error: photosError } = await supabase
      .from('repair_photos')
      .select('id, url, tipo, uploaded_at')
      .eq('repair_id', repair.os_id)
      .order('uploaded_at', { ascending: true });

    if (photosError) {
      console.error('Erro ao buscar fotos de reparo:', photosError);
    }

    // 4. Buscar histórico de status da OS (os_status_history) - Apenas colunas públicas!
    const { data: history, error: historyError } = await supabase
      .from('os_status_history')
      .select('id, status, entered_at, exited_at, duration_seconds, public_notes')
      .eq('os_id', repair.os_id)
      .order('entered_at', { ascending: true });

    if (historyError) {
      console.error('Erro ao buscar histórico de status:', historyError);
    }

    // 5. Buscar peças de reposição ou componentes aplicados (inventory_movements + products)
    // Apenas colunas de identificação e quantidade são expostas (sem custo_unitario ou markups)
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select('id, qty, products(nome, categoria, subcategoria, specs)')
      .eq('repair_id', repair.os_id)
      .eq('tipo', 'saída');

    if (movementsError) {
      console.error('Erro ao buscar peças consumidas:', movementsError);
    }

    // 6. Estruturação do objeto de retorno higienizado e aderente à LGPD e Sigilo de Margens
    const sanitizedOS = {
      id: repair.os_id,
      os_number: repair.os_number,
      is_custom_pc: repair.is_custom_pc || false,
      status: repair.status,
      equipamento: {
        tipo: repair.equip_tipo || 'Equipamento',
        marca: repair.equip_marca || '',
        modelo: repair.equip_modelo || '',
        serial: repair.equip_serial || 'Não informado'
      },
      problema_reportado: repair.problema_reportado,
      laudo: repair.laudo || null,
      prazo_prometido: repair.estimated_delivery,
      valor_cobrado: repair.valor_final_servico,
      payment_status: repair.payment_status || 'pendente',
      garantia_dias: repair.warranty_dias,
      garantia_ate: repair.warranty_ate,
      digital_warranty_code: repair.digital_warranty_code,
      created_at: repair.created_at,
      entregue_at: repair.entregue_at,
      
      // Apenas primeiro nome para LGPD
      cliente: {
        nome: repair.customer_first_name || 'Cliente'
      },

      // Arrays higienizados
      fotos: photos || [],
      historico: history || [],
      pecas: (movements || []).map(m => ({
        id: m.id,
        qty: m.qty,
        nome: m.products?.nome || 'Peça de Reposição',
        categoria: m.products?.categoria || 'peça',
        subcategoria: m.products?.subcategoria || '',
        specs: m.products?.specs || {}
      }))
    };

    return json(200, { ok: true, data: sanitizedOS });
  } catch (err) {
    console.error('Erro no endpoint de rastreamento público de OS:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// Helper JSON response
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
