// /api/admin/os/tracking.js
// Vercel Edge Function — Rastreamento Público de OS (Página do Cliente) (Feature 006)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Rota pública e anônima - Não requer cookies de sessão do admin
  if (req.method !== 'GET') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const url = new URL(req.url);
    const trackingToken = url.searchParams.get('tracking_token')?.trim();

    // 1. Validação do Token de Rastreamento (UUID)
    if (!trackingToken) {
      return json(400, { ok: false, error: 'missing_token', message: 'O token de rastreamento é obrigatório.' });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trackingToken)) {
      return json(400, { ok: false, error: 'invalid_token_format', message: 'O formato do token é inválido.' });
    }

    // Inicializar o cliente do Supabase com service_role para ler os dados sem bypass de RLS no backend
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // 2. Buscar a OS associada ao token
    const { data: repair, error: repairError } = await supabase
      .from('repairs')
      .select('*, customers(*)')
      .eq('tracking_token', trackingToken)
      .single();

    if (repairError || !repair) {
      console.warn(`Tentativa de acesso com token inválido ou não encontrado: ${trackingToken}`);
      return json(404, { ok: false, error: 'not_found', message: 'Ordem de Serviço não encontrada.' });
    }

    // 3. Buscar fotos associadas (repair_photos)
    const { data: photos, error: photosError } = await supabase
      .from('repair_photos')
      .select('id, url, tipo, uploaded_at')
      .eq('repair_id', repair.id)
      .order('uploaded_at', { ascending: true });

    if (photosError) {
      console.error('Erro ao buscar fotos de reparo:', photosError);
    }

    // 4. Buscar histórico de status da OS (os_status_history)
    const { data: history, error: historyError } = await supabase
      .from('os_status_history')
      .select('id, status, entered_at, exited_at, duration_seconds, notes')
      .eq('os_id', repair.id)
      .order('entered_at', { ascending: true });

    if (historyError) {
      console.error('Erro ao buscar histórico de status:', historyError);
    }

    // 5. Dogma LGPD e Segurança - Higienização estrita dos dados antes do retorno público
    const sanitizedClientName = repair.customers?.nome
      ? repair.customers.nome.trim().split(' ')[0]
      : 'Cliente';

    const rawSerial = repair.equipamento?.serial || '';
    const maskedSerial = maskSerial(rawSerial);

    const sanitizedOS = {
      id: repair.id,
      status: repair.status,
      equipamento: {
        tipo: repair.equipamento?.tipo || 'Equipamento',
        marca: repair.equipamento?.marca || '',
        modelo: repair.equipamento?.modelo || '',
        serial: maskedSerial
      },
      problema_reportado: repair.problema_reportado,
      laudo: repair.laudo || null,
      prazo_prometido: repair.prazo_prometido,
      valor_cobrado: repair.valor_cobrado,
      forma_pagamento: repair.forma_pagamento,
      garantia_dias: repair.garantia_dias,
      garantia_ate: repair.garantia_ate,
      created_at: repair.created_at,
      entregue_at: repair.entregue_at,
      
      // Apenas o primeiro nome é exposto
      cliente: {
        nome: sanitizedClientName
      },

      // Dados anexados e limpos
      fotos: photos || [],
      historico: history || []
    };

    // Obs: Informações críticas corporativas do técnico como 'valor_custo_pecas', 'valor_lucro', 
    // telefones de clientes, emails, CPFs e endereços foram totalmente removidos para compliance com a LGPD e sigilo de margens.

    return json(200, { ok: true, data: sanitizedOS });
  } catch (err) {
    console.error('Erro no endpoint de rastreamento público de OS:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// Função utilitária para mascarar serial do equipamento preservando as extremidades (4 iniciais e 4 finais)
function maskSerial(serial) {
  if (!serial) return null;
  const s = serial.trim();
  if (s.length <= 4) {
    return '****';
  }
  const prefix = s.substring(0, 4);
  const suffix = s.substring(s.length - 4);
  return `${prefix}****${suffix}`;
}

// Helper JSON response
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
