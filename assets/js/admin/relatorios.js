// /assets/js/admin/relatorios.js
// Vanilla JS Module — Stock Financial Reports & Canvas Drawing (Feature 007)

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const repTotalCusto = document.getElementById('rep-total-custo');
  const repVendaPotencial = document.getElementById('rep-venda-potencial');
  const repLucroEstimado = document.getElementById('rep-lucro-estimado');
  const repMargemGeral = document.getElementById('rep-margem-geral');
  
  const topProductsBody = document.getElementById('top-products-body');
  const alertsProductsBody = document.getElementById('alerts-products-body');
  const canvas = document.getElementById('stock-chart');

  let allProducts = [];
  let allMovements = [];

  // Init
  initReports();

  async function initReports() {
    await loadData();
    renderFinancialCards();
    renderTopProducts();
    renderAlerts();
    drawStockChart();
  }

  async function loadData() {
    // Carrega produtos
    try {
      const response = await fetch('/api/admin/inventory/products?limit=100');
      if (response.ok) {
        const res = await response.json();
        allProducts = res.data;
      } else {
        throw new Error('Falha no GET');
      }
    } catch (err) {
      console.warn('Erro ao carregar produtos. Usando localStorage...', err);
      const stored = localStorage.getItem('iflcosta_products_list');
      allProducts = stored ? JSON.parse(stored) : [];
    }

    // Carrega movimentações
    try {
      const response = await fetch('/api/admin/inventory/movements?limit=1000');
      if (response.ok) {
        const res = await response.json();
        allMovements = res.data;
      } else {
        throw new Error('Falha no GET');
      }
    } catch (err) {
      console.warn('Erro ao carregar movimentações. Usando localStorage...', err);
      const stored = localStorage.getItem('iflcosta_movements_list');
      allMovements = stored ? JSON.parse(stored) : [];
    }
  }

  function renderFinancialCards() {
    let totalCusto = 0;
    let totalVenda = 0;

    allProducts.forEach(p => {
      const qty = p.qty_atual || 0;
      totalCusto += qty * (p.preco_custo || 0);
      totalVenda += qty * (p.preco_venda || 0);
    });

    const lucroEstimado = totalVenda - totalCusto;
    const margemGeral = totalVenda > 0 ? (lucroEstimado / totalVenda) * 100 : 0;

    repTotalCusto.textContent = `R$ ${totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    repVendaPotencial.textContent = `R$ ${totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    repLucroEstimado.textContent = `R$ ${lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    repMargemGeral.textContent = `${margemGeral.toFixed(0)}%`;
  }

  function renderTopProducts() {
    const sorted = [...allProducts]
      .filter(p => p.preco_venda > 0)
      .map(p => {
        const margem = ((p.preco_venda - p.preco_custo) / p.preco_venda) * 100;
        return { ...p, margem };
      })
      .sort((a, b) => b.margem - a.margem)
      .slice(0, 10);

    if (sorted.length === 0) {
      topProductsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-text-tertiary);">Nenhum produto cadastrado.</td></tr>`;
      return;
    }

    topProductsBody.innerHTML = sorted.map(p => `
      <tr>
        <td style="font-weight: var(--font-medium);">${escapeHtml(p.nome)}</td>
        <td style="text-align: right;">R$ ${p.preco_custo.toFixed(2)}</td>
        <td style="text-align: right; font-weight: var(--font-bold);">R$ ${p.preco_venda.toFixed(2)}</td>
        <td style="text-align: right; color: var(--color-success); font-weight: var(--font-bold);">${p.margem.toFixed(0)}%</td>
      </tr>
    `).join('');
  }

  function renderAlerts() {
    const alerts = allProducts
      .filter(p => p.qty_atual <= (p.qty_minimo || 0))
      .sort((a, b) => a.qty_atual - b.qty_atual);

    if (alerts.length === 0) {
      alertsProductsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-text-tertiary);">Nenhum alerta de estoque pendente! Tudo em ordem.</td></tr>`;
      return;
    }

    alertsProductsBody.innerHTML = alerts.map(p => {
      const isZero = p.qty_atual === 0;
      const color = isZero ? 'var(--color-danger)' : 'hsl(35, 90%, 50%)';
      return `
        <tr>
          <td style="font-weight: var(--font-medium);">${escapeHtml(p.nome)}</td>
          <td style="color: var(--color-text-tertiary);">${escapeHtml(p.sku || 'N/A')}</td>
          <td style="text-align: center; font-weight: var(--font-bold); color: ${color};">${p.qty_atual}</td>
          <td style="text-align: center;">${p.qty_minimo || 0}</td>
        </tr>
      `;
    }).join('');
  }

  function drawStockChart() {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    const pointsCount = 30;
    const values = new Array(pointsCount).fill(0);
    
    let currentCostVal = 0;
    allProducts.forEach(p => {
      currentCostVal += (p.qty_atual || 0) * (p.preco_custo || 0);
    });

    values[pointsCount - 1] = currentCostVal;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = pointsCount - 2; i >= 0; i--) {
      const targetDayStart = new Date(today);
      targetDayStart.setDate(today.getDate() - (pointsCount - 1 - i));
      targetDayStart.setHours(0, 0, 0, 0);

      const targetDayEnd = new Date(targetDayStart);
      targetDayEnd.setHours(23, 59, 59, 999);

      let delta = 0;
      allMovements.forEach(m => {
        const mDate = new Date(m.created_at || m.data);
        if (mDate > targetDayEnd && mDate <= new Date(targetDayEnd.getTime() + 24 * 60 * 60 * 1000)) {
          const mVal = m.qty * (m.custo_unitario || 0);
          if (m.tipo === 'entrada') {
            delta -= mVal;
          } else {
            delta += mVal;
          }
        }
      });

      currentCostVal += delta;
      values[i] = Math.max(0, currentCostVal);
    }

    const maxVal = Math.max(...values, 100) * 1.15;
    const minVal = 0;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = getThemeColor('--color-border-subtle', 'hsla(222, 10%, 80%, 0.08)');
    ctx.lineWidth = 1;
    
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (graphHeight * i) / gridLines;
      
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      const labelVal = maxVal - ((maxVal - minVal) * i) / gridLines;
      ctx.fillStyle = getThemeColor('--color-text-secondary', 'hsl(222, 10%, 50%)');
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`R$ ${Math.round(labelVal)}`, paddingLeft - 10, y + 3);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = getThemeColor('--color-text-secondary', 'hsl(222, 10%, 50%)');
    
    const xLabels = 5;
    for (let i = 0; i < xLabels; i++) {
      const idx = Math.floor((i * (pointsCount - 1)) / (xLabels - 1));
      const x = paddingLeft + (graphWidth * idx) / (pointsCount - 1);
      
      const d = new Date(today);
      d.setDate(today.getDate() - (pointsCount - 1 - idx));
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      
      ctx.fillText(dateStr, x, height - paddingBottom + 20);
    }

    const points = values.map((val, idx) => {
      const x = paddingLeft + (graphWidth * idx) / (pointsCount - 1);
      const y = paddingTop + graphHeight * (1 - (val - minVal) / (maxVal - minVal));
      return { x, y };
    });

    const fillGradient = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    fillGradient.addColorStop(0, 'hsla(222, 80%, 50%, 0.16)');
    fillGradient.addColorStop(1, 'hsla(222, 80%, 50%, 0)');

    ctx.fillStyle = fillGradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - paddingBottom);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'hsl(222, 80%, 50%)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    const lastP = points[points.length - 1];
    ctx.fillStyle = 'hsl(222, 80%, 50%)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lastP.x, lastP.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = getThemeColor('--color-text-primary', '#000');
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`R$ ${currentCostVal.toFixed(0)}`, lastP.x - 10, lastP.y - 10);
  }

  function getThemeColor(variable, fallback) {
    const color = getComputedStyle(document.documentElement).getPropertyValue(variable);
    return color ? color.trim() : fallback;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
});
