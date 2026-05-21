// /api/admin/financeiro.js
// Vercel Edge Function — Painel Financeiro (Feature 010)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => { const [k, ...v] = c.trim().split('='); return [k, v.join('=')]; })
  );
  const accessToken = cookies['sb-access-token'];
  if (!accessToken) return json(401, { ok: false, error: 'unauthorized', message: 'Sessão ausente.' });

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) return json(401, { ok: false, error: 'unauthorized', message: 'Sessão inválida.' });

  try {
    const url = new URL(req.url);
    const periodo = url.searchParams.get('periodo') || 'este_mes';
    const customFrom = url.searchParams.get('date_from');
    const customTo = url.searchParams.get('date_to');

    const { from, to } = resolvePeriod(periodo, customFrom, customTo);

    // ── Resumo do período (OS entregues) ──────────────────────────────────────
    const { data: resumoRows, error: resumoErr } = await supabase
      .from('repairs')
      .select('valor_cobrado, valor_lucro')
      .eq('status', 'entregue')
      .gte('entregue_at', from)
      .lte('entregue_at', to)
      .is('deleted_at', null);

    if (resumoErr) throw resumoErr;

    const osCount = resumoRows.length;
    const receita = resumoRows.reduce((s, r) => s + (parseFloat(r.valor_cobrado) || 0), 0);
    const lucro = resumoRows.reduce((s, r) => s + (parseFloat(r.valor_lucro) || 0), 0);
    const osComValor = resumoRows.filter(r => parseFloat(r.valor_cobrado) > 0);
    const ticketMedio = osComValor.length > 0
      ? osComValor.reduce((s, r) => s + parseFloat(r.valor_cobrado), 0) / osComValor.length
      : 0;

    // ── A Receber (todas as OS ativas com pagamento pendente/parcial) ─────────
    const { data: aReceberRows, error: aReceberErr } = await supabase
      .from('repairs')
      .select('id, os_number, valor_cobrado, payment_status, equipamento, customers(nome)')
      .in('payment_status', ['pendente', 'parcial'])
      .not('status', 'in', '("entregue","cancelado","cliente_desistiu")')
      .is('deleted_at', null)
      .order('valor_cobrado', { ascending: false });

    if (aReceberErr) throw aReceberErr;

    const aReceberTotal = aReceberRows.reduce((s, r) => s + (parseFloat(r.valor_cobrado) || 0), 0);
    const aReceberLista = aReceberRows.map(r => ({
      id: r.id,
      os_number: r.os_number,
      customer_nome: r.customers?.nome || 'Cliente',
      equipamento: `${r.equipamento?.marca || ''} ${r.equipamento?.modelo || ''}`.trim(),
      valor_cobrado: parseFloat(r.valor_cobrado) || 0,
      payment_status: r.payment_status,
    }));

    // ── Gráfico: últimos 6 meses ──────────────────────────────────────────────
    const grafico = await buildGrafico(supabase);

    return json(200, {
      ok: true,
      periodo: { from, to, label: periodLabel(periodo) },
      resumo: { receita, lucro, ticket_medio: ticketMedio, os_count: osCount },
      a_receber: { total: aReceberTotal, lista: aReceberLista },
      grafico,
    });
  } catch (err) {
    console.error('Erro no GET /api/admin/financeiro:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function buildGrafico(supabase) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`;
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const to = nextMonth.toISOString();
    months.push({
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
      from,
      to,
    });
  }

  const results = await Promise.all(
    months.map(async (m) => {
      const { data } = await supabase
        .from('repairs')
        .select('valor_cobrado, valor_lucro')
        .eq('status', 'entregue')
        .gte('entregue_at', m.from)
        .lt('entregue_at', m.to)
        .is('deleted_at', null);

      const rows = data || [];
      return {
        mes: m.mes,
        label: m.label,
        receita: rows.reduce((s, r) => s + (parseFloat(r.valor_cobrado) || 0), 0),
        lucro: rows.reduce((s, r) => s + (parseFloat(r.valor_lucro) || 0), 0),
      };
    })
  );

  return results;
}

function resolvePeriod(periodo, customFrom, customTo) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (periodo === 'mes_anterior') {
    const d = new Date(year, month - 1, 1);
    return {
      from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
      to: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    };
  }
  if (periodo === 'este_ano') {
    return {
      from: new Date(year, 0, 1).toISOString(),
      to: new Date(year, 11, 31, 23, 59, 59).toISOString(),
    };
  }
  if (periodo === 'custom' && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(customTo + 'T23:59:59').toISOString() };
  }
  // este_mes (default)
  return {
    from: new Date(year, month, 1).toISOString(),
    to: new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
  };
}

function periodLabel(periodo) {
  const map = { este_mes: 'Este mês', mes_anterior: 'Mês anterior', este_ano: 'Este ano', custom: 'Personalizado' };
  return map[periodo] || periodo;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
