// /assets/js/admin/financeiro.js
// Feature 010 — Painel Financeiro

document.addEventListener('DOMContentLoaded', () => {
  const brl = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  let currentPeriodo = 'este_mes';
  let customFrom = null;
  let customTo = null;

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const cardReceita      = document.getElementById('card-receita');
  const cardOsCount      = document.getElementById('card-os-count');
  const cardLucro        = document.getElementById('card-lucro');
  const cardMargem       = document.getElementById('card-margem');
  const cardReceber      = document.getElementById('card-receber');
  const cardReceberCount = document.getElementById('card-receber-count');
  const cardTicket       = document.getElementById('card-ticket');
  const receberContainer = document.getElementById('receber-container');
  const badgeReceber     = document.getElementById('badge-receber');
  const canvas           = document.getElementById('grafico-financeiro');
  const customRangeEl    = document.getElementById('custom-range');
  const dateFrom         = document.getElementById('date-from');
  const dateTo           = document.getElementById('date-to');
  const btnApplyCustom   = document.getElementById('btn-apply-custom');

  // ── Filtros de período ───────────────────────────────────────────────────────
  document.querySelectorAll('.fin-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fin-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriodo = btn.dataset.periodo;
      customRangeEl.classList.toggle('visible', currentPeriodo === 'custom');
      if (currentPeriodo !== 'custom') load();
    });
  });

  btnApplyCustom.addEventListener('click', () => {
    customFrom = dateFrom.value;
    customTo = dateTo.value;
    if (customFrom && customTo) load();
  });

  // ── Carga principal ──────────────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ periodo: currentPeriodo });
      if (currentPeriodo === 'custom' && customFrom && customTo) {
        params.set('date_from', customFrom);
        params.set('date_to', customTo);
      }
      const res = await fetch(`/api/admin/financeiro?${params}`);
      if (res.status === 401) { window.location.href = "../../../admin/login'; return; }
      if (!res.ok) throw new Error('Erro ao carregar dados financeiros.');
      const d = await res.json();
      renderCards(d.resumo, d.a_receber);
      renderGrafico(d.grafico);
      renderAReceber(d.a_receber);
    } catch (err) {
      console.error(err);
      receberContainer.innerHTML = `<div class="receber-empty" style="color:var(--color-error-text);">${err.message}</div>`;
    } finally {
      setLoading(false);
    }
  }

  // ── Cards ────────────────────────────────────────────────────────────────────
  function renderCards(resumo, aReceber) {
    cardReceita.textContent = brl(resumo.receita);
    cardOsCount.textContent = `${resumo.os_count} OS entregue${resumo.os_count !== 1 ? 's' : ''}`;
    cardLucro.textContent = brl(resumo.lucro);
    const margem = resumo.receita > 0 ? ((resumo.lucro / resumo.receita) * 100).toFixed(1) : 0;
    cardMargem.textContent = `Margem ${margem}%`;
    cardReceber.textContent = brl(aReceber.total);
    cardReceberCount.textContent = `${aReceber.lista.length} OS pendente${aReceber.lista.length !== 1 ? 's' : ''}`;
    cardTicket.textContent = brl(resumo.ticket_medio);
    badgeReceber.textContent = aReceber.lista.length > 0
      ? `Total: ${brl(aReceber.total)}`
      : '';
  }

  // ── Gráfico de barras (canvas vanilla) ──────────────────────────────────────
  function renderGrafico(data) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = 220;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

    const padL = 56, padR = 16, padT = 16, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxVal = Math.max(...data.map(d => Math.max(d.receita, d.lucro)), 1);
    const yStep = niceStep(maxVal);
    const yMax = Math.ceil(maxVal / yStep) * yStep;

    // grid lines
    ctx.font = `11px Inter, sans-serif`;
    ctx.fillStyle = textColor;
    for (let v = 0; v <= yMax; v += yStep) {
      const y = padT + chartH - (v / yMax) * chartH;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
      ctx.fillText(fmtYAxis(v), 0, y + 4);
    }

    // bars
    const n = data.length;
    const groupW = chartW / n;
    const barW = Math.min(groupW * 0.35, 22);
    const gap = 3;

    data.forEach((d, i) => {
      const cx = padL + groupW * i + groupW / 2;

      // receita bar
      const hR = (d.receita / yMax) * chartH;
      ctx.fillStyle = 'rgba(99,102,241,0.85)';
      ctx.beginPath();
      ctx.roundRect(cx - barW - gap / 2, padT + chartH - hR, barW, hR, [3, 3, 0, 0]);
      ctx.fill();

      // lucro bar
      const hL = (d.lucro / yMax) * chartH;
      ctx.fillStyle = 'rgba(34,197,94,0.8)';
      ctx.beginPath();
      ctx.roundRect(cx + gap / 2, padT + chartH - hL, barW, hL, [3, 3, 0, 0]);
      ctx.fill();

      // label mês
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(d.label, cx, H - padB + 16);
    });
  }

  function niceStep(max) {
    const raw = max / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const steps = [1, 2, 5, 10];
    for (const s of steps) { if (s * mag >= raw) return s * mag; }
    return mag * 10;
  }

  function fmtYAxis(v) {
    if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return String(v);
  }

  // ── Tabela A Receber ─────────────────────────────────────────────────────────
  function renderAReceber({ lista }) {
    if (lista.length === 0) {
      receberContainer.innerHTML = `<div class="receber-empty">🎉 Nenhum valor a receber em aberto.</div>`;
      return;
    }

    const rows = lista.map(r => `
      <tr>
        <td style="font-weight:var(--font-semibold);white-space:nowrap;">${r.os_number || '—'}</td>
        <td>${escHtml(r.customer_nome)}</td>
        <td style="color:var(--color-text-secondary);">${escHtml(r.equipamento)}</td>
        <td style="font-weight:var(--font-semibold);">${brl(r.valor_cobrado)}</td>
        <td><span class="payment-pill ${r.payment_status}">${r.payment_status === 'parcial' ? 'Parcial' : 'Pendente'}</span></td>
        <td><a href="../../../admin/os/detalhes?id=${r.id}" class="btn btn--secondary btn--sm" style="white-space:nowrap;">Ver OS →</a></td>
      </tr>`).join('');

    receberContainer.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="table" style="font-size:var(--text-sm);width:100%;">
          <thead>
            <tr style="text-align:left;border-bottom:2px solid var(--color-border-subtle);">
              <th style="padding:var(--space-2) 0;">OS #</th>
              <th style="padding:var(--space-2) 0;">Cliente</th>
              <th style="padding:var(--space-2) 0;">Aparelho</th>
              <th style="padding:var(--space-2) 0;">Valor</th>
              <th style="padding:var(--space-2) 0;">Situação</th>
              <th style="padding:var(--space-2) 0;"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function setLoading(on) {
    if (on) {
      [cardReceita, cardLucro, cardReceber, cardTicket].forEach(el => { el.textContent = '—'; });
      receberContainer.innerHTML = `<div class="receber-empty">Carregando...</div>`;
    }
  }

  // ── Redesenha gráfico ao redimensionar ───────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => load(), 300);
  });

  load();
});
