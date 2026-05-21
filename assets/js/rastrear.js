// /assets/js/rastrear.js
// Módulo público de rastreamento de OS — Feature 006 (Tracking Upgrade)
// Zero-Build · Vanilla JS ES Module · LGPD Compliant

document.addEventListener('DOMContentLoaded', () => {

  // ─── DOM References ───────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const elLoading        = $('tracking-loading');
  const elError          = $('tracking-error');
  const elContent        = $('tracking-content');
  const elOsBadge        = $('os-number-badge');
  const elGreeting       = $('client-greeting');
  const elDeviceName     = $('device-name');
  const elDeviceSerial   = $('device-serial');
  const elDeviceDeadline = $('device-deadline');
  const elBadgeCustomPC  = $('badge-custom-pc');
  const elStatusCard     = $('active-status-card');
  const elStatusPill     = $('status-pill');
  const elStatusLabel    = $('status-label');
  const elStatusHeadline = $('status-headline');
  const elActiveTimer    = $('active-timer');
  const elActiveNote     = $('active-note');
  const elTimeline       = $('timeline');
  const elPartsSection   = $('parts-section');
  const elWarrantySection= $('warranty-section');
  const elWDeadline      = $('w-deadline');
  const elWPayment       = $('w-payment');
  const elWCodeBlock     = $('w-code-block');
  const elWCode          = $('w-code');
  const elWPeriod        = $('w-period');
  const elBtnCopy        = $('btn-copy-warranty');
  const elPhotosSection  = $('photos-section');
  const elPhotosGrid     = $('photos-grid');
  const elWaFooter       = $('wa-footer');
  const elBtnWa          = $('btn-wa');
  const elLightbox       = $('lightbox');
  const elLightboxImg    = $('lightbox-img');
  const elLightboxClose  = $('lightbox-close');

  // ─── State ───────────────────────────────────────────────────────────────
  const params  = new URLSearchParams(window.location.search);
  const token   = params.get('token');
  let   osData  = null;
  let   history = [];
  let   timerID = null;
  let   lightboxReturn = null;

  // ─── Init ────────────────────────────────────────────────────────────────
  if (!token) { showError(); return; }

  // Lightbox acessível — fecha por botão, clique no fundo ou tecla Esc
  elLightboxClose.addEventListener('click', closeLightbox);
  elLightbox.addEventListener('click', (e) => { if (e.target === elLightbox) closeLightbox(); });
  elLightbox.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); elLightboxClose.focus(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elLightbox.classList.contains('open')) closeLightbox();
  });

  // Copy warranty code
  elBtnCopy.addEventListener('click', () => copyWarrantyCode());

  fetchData();

  // ─── Fetch ────────────────────────────────────────────────────────────────
  async function fetchData() {
    show(elLoading); hide(elError); hide(elContent);

    try {
      const res = await fetch(`/api/admin/os/tracking?token=${encodeURIComponent(token)}`);

      if (res.status === 404) { showError(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const raw = json.data || {};
      // Normalizar payload da API para o shape interno do JS
      osData  = normalizeApiPayload(raw);
      history = raw.historico || raw.history || [];

    } catch (err) {
      console.error('[rastrear] Erro ao carregar rastreamento:', err);
      showError();
      return;
    }

    if (!osData) { showError(); return; }
    render();
  }

  // Normaliza payload da API real para o shape interno
  function normalizeApiPayload(raw) {
    return {
      os_number:            raw.os_number || `OS-${new Date().getFullYear()}-XXXX`,
      customer_first_name:  raw.cliente?.nome || firstNameOf(raw.customer_name),
      equip_tipo:  raw.equipamento?.tipo   || '',
      equip_marca: raw.equipamento?.marca  || '',
      equip_modelo:raw.equipamento?.modelo || '',
      equip_serial:raw.equipamento?.serial || 'Não informado',
      status:      raw.status  || 'rascunho',
      is_custom_pc:raw.is_custom_pc || false,
      payment_status:       raw.payment_status || 'pendente',
      estimated_delivery:   raw.prazo_prometido || null,
      digital_warranty_code:raw.digital_warranty_code || null,
      warranty_dias: raw.garantia_dias || 90,
      warranty_ate:  raw.garantia_ate  || raw.warranty_ate || null,
      parts:  raw.pecas  || raw.parts  || [],
      photos: raw.fotos  || raw.photos || [],
    };
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  function render() {
    renderHeader();
    renderWelcome();
    renderActiveStatus();
    renderTimeline();
    renderParts();
    renderWarranty();
    renderPhotos();
    renderWhatsApp();

    hide(elLoading);
    show(elContent);
    startTimer();
  }

  // ─── Header ───────────────────────────────────────────────────────────────
  function renderHeader() {
    elOsBadge.textContent = osData.os_number || 'OS-????';
  }

  // ─── Welcome Card ─────────────────────────────────────────────────────────
  function renderWelcome() {
    elGreeting.textContent = `Olá, ${osData.customer_first_name || 'Cliente'}!`;

    const brand = osData.equip_marca  || '';
    const model = osData.equip_modelo || '';
    elDeviceName.textContent   = [brand, model].filter(Boolean).join(' ') || '—';
    elDeviceSerial.textContent = osData.equip_serial || 'Não informado';
    elDeviceDeadline.textContent = osData.estimated_delivery
      ? fmtDate(osData.estimated_delivery)
      : 'Em definição';

    if (osData.is_custom_pc) elBadgeCustomPC.classList.add('visible');
  }

  // ─── Active Status Card ───────────────────────────────────────────────────
  const STATUS_LABELS = {
    rascunho:              'Equipamento Recebido',
    diagnostico:           'Em Diagnóstico',
    aguardando_aprovacao:  'Aguardando Aprovação',
    aprovado:              'Orçamento Aprovado',
    aguardando_peca:       'Aguardando Peça',
    em_conserto:           'Em Manutenção',
    pronto:                'Pronto para Retirada',
    entregue:              'Entregue ✓',
    cancelado:             'Cancelado',
  };

  const STATUS_HEADLINES = {
    rascunho:             'Seu equipamento deu entrada no laboratório e está aguardando diagnóstico.',
    diagnostico:          'Iago está diagnosticando seu equipamento e identificando os componentes afetados.',
    aguardando_aprovacao: 'O laudo técnico está pronto! Aguardamos sua aprovação do orçamento pelo WhatsApp.',
    aprovado:             'Orçamento aprovado! Iniciando os preparativos e separação de peças.',
    aguardando_peca:      'A peça necessária foi encomendada e aguardamos a chegada para iniciar o reparo.',
    em_conserto:          'Seu equipamento está na bancada em processo de reparo ativo.',
    pronto:               'Tudo pronto e testado! 🎉 Pode vir buscar seu equipamento.',
    entregue:             'Reparo concluído e entregue. Sua garantia está ativa! 🛡️',
    cancelado:            'Esta ordem de serviço foi encerrada.',
  };

  // Colors per status (HSL)
  const STATUS_COLORS = {
    rascunho:             { pill: 'background:rgba(71,85,105,.3);border:1px solid rgba(100,116,139,.4);color:#94a3b8', card: '' },
    diagnostico:          { pill: 'background:rgba(109,40,217,.25);border:1px solid rgba(139,92,246,.4);color:hsl(260,80%,80%)', card: '' },
    aguardando_aprovacao: { pill: 'background:rgba(217,119,6,.2);border:1px solid rgba(245,158,11,.4);color:hsl(32,95%,70%)', card: '' },
    aprovado:             { pill: 'background:rgba(2,132,199,.2);border:1px solid rgba(56,189,248,.4);color:hsl(200,80%,72%)', card: '' },
    aguardando_peca:      { pill: 'background:rgba(194,65,12,.2);border:1px solid rgba(249,115,22,.4);color:hsl(15,85%,70%)', card: '' },
    em_conserto:          { pill: 'background:rgba(79,70,229,.2);border:1px solid rgba(129,140,248,.4);color:hsl(240,80%,78%)', card: '' },
    pronto:               { pill: 'background:rgba(5,150,105,.2);border:1px solid rgba(16,185,129,.4);color:hsl(142,70%,60%)', card: 'status-entregue' },
    entregue:             { pill: 'background:rgba(5,150,105,.2);border:1px solid rgba(16,185,129,.4);color:hsl(142,70%,60%)', card: 'status-entregue' },
    cancelado:            { pill: 'background:rgba(127,29,29,.2);border:1px solid rgba(239,68,68,.3);color:hsl(0,70%,65%)', card: 'status-cancelado' },
  };

  function renderActiveStatus() {
    const status = normalizeStatus(osData.status);
    const label    = STATUS_LABELS[status]    || status;
    const headline = STATUS_HEADLINES[status] || 'Seu serviço está em andamento.';
    const colors   = STATUS_COLORS[status]    || STATUS_COLORS.rascunho;

    elStatusLabel.textContent    = label;
    elStatusHeadline.textContent = headline;
    elStatusPill.setAttribute('style', colors.pill);

    if (colors.card) elStatusCard.classList.add(colors.card);

    // Active public note (most recent from history)
    const activeStep = history.find(h => !h.exited_at);
    if (activeStep?.public_notes) {
      elActiveNote.textContent = `💡 ${activeStep.public_notes}`;
      show(elActiveNote);
    }
  }

  // ─── Timeline ─────────────────────────────────────────────────────────────
  const STAGE_FLOW = [
    { key: 'rascunho',             label: 'Equipamento Recebido',    desc: 'Aparelho registrado e aguardando triagem.' },
    { key: 'diagnostico',          label: 'Diagnóstico Técnico',     desc: 'Identificação de falhas e componentes afetados.' },
    { key: 'aguardando_aprovacao', label: 'Aguardando Aprovação',    desc: 'Orçamento gerado, aguardando OK do cliente.' },
    { key: 'em_conserto',          label: 'Manutenção de Bancada',   desc: 'Reparo ativo com peças e microsoldas.' },
    { key: 'pronto',               label: 'Finalizado & Testado',    desc: 'Aprovado em todos os testes de qualidade.' },
    { key: 'entregue',             label: 'Entregue com Garantia',   desc: 'Aparelho retirado — garantia ativa.' },
  ];

  function renderTimeline() {
    const status = normalizeStatus(osData.status);
    const sorted = [...history]
      .filter(h => h && h.entered_at)
      .sort((a, b) => new Date(a.entered_at) - new Date(b.entered_at));

    // Resolve index of the current active stage in the visual flow
    let activeIdx = STAGE_FLOW.findIndex(s => s.key === status);
    if (activeIdx === -1) {
      // Map variations to visual buckets
      if (['aprovado', 'aguardando_peca'].includes(status)) activeIdx = 3; // em_conserto bucket
    }

    const html = STAGE_FLOW.map((stage, idx) => {
      // Find matching history entry (with alias resolution)
      const histEntry = sorted.find(h => {
        const n = normalizeStatus(h.status);
        if (n === stage.key) return true;
        if (stage.key === 'em_conserto' && ['aprovado','aguardando_peca','em_conserto'].includes(n)) return true;
        return false;
      });

      let stateClass = 'is-future';
      let dotHtml    = '';
      let metaHtml   = '';
      let noteHtml   = '';

      const isDone   = idx < activeIdx || (histEntry?.exited_at);
      const isActive = !isDone && idx === activeIdx;

      if (isDone) {
        stateClass = 'is-done';
        dotHtml    = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
        if (histEntry) {
          metaHtml = `<div class="tl-meta">${fmtDateTime(histEntry.entered_at)}</div>`;
          if (histEntry.duration_seconds) {
            metaHtml += `<div class="tl-duration">✓ ${fmtDuration(histEntry.duration_seconds)}</div>`;
          }
        }
        if (histEntry?.public_notes) {
          noteHtml = `<div class="tl-public-note">💡 ${escHtml(histEntry.public_notes)}</div>`;
        }

      } else if (isActive) {
        stateClass = 'is-active';
        dotHtml    = '<div style="width:8px;height:8px;border-radius:50%;background:currentColor"></div>';
        if (histEntry) {
          metaHtml = `<div class="tl-meta">Iniciado ${fmtDateTime(histEntry.entered_at)}</div>
                      <div class="tl-active-timer" id="tl-active-timer">⏱️ Calculando…</div>`;
        }
        if (histEntry?.public_notes) {
          noteHtml = `<div class="tl-public-note">💡 ${escHtml(histEntry.public_notes)}</div>`;
        }
      } else {
        dotHtml  = '';
        metaHtml = `<div class="tl-meta" style="font-size:0.68rem;">Próxima etapa</div>`;
      }

      return `
        <div class="timeline-item ${stateClass}">
          <div class="tl-dot">${dotHtml}</div>
          <div class="glass-inner tl-card">
            <div class="tl-header">
              <div class="tl-title">${stage.label}</div>
              <div>${metaHtml}</div>
            </div>
            <div style="font-size:0.78rem;color:var(--slate-500);margin-top:2px">${stage.desc}</div>
            ${noteHtml}
          </div>
        </div>`;
    }).join('');

    elTimeline.innerHTML = html;
  }

  // ─── Parts / Custom PC Showcase ───────────────────────────────────────────
  const CATEGORY_ICONS = {
    CPU:         { icon: '⚙️', label: 'Processador (CPU)' },
    GPU:         { icon: '🎮', label: 'Placa de Vídeo (GPU)' },
    RAM:         { icon: '🧠', label: 'Memória RAM' },
    SSD:         { icon: '💾', label: 'Armazenamento SSD' },
    HDD:         { icon: '🗄️', label: 'HD / Armazenamento' },
    MOTHERBOARD: { icon: '🔌', label: 'Placa-Mãe' },
    PSU:         { icon: '⚡', label: 'Fonte de Alimentação' },
    GABINETE:    { icon: '🖥️', label: 'Gabinete' },
    COOLING:     { icon: '❄️', label: 'Refrigeração' },
  };

  function renderParts() {
    const parts = (osData.parts || []).filter(p => p && (p.nome || p.custom_product_name));
    if (!parts.length) { elPartsSection.innerHTML = ''; return; }

    if (osData.is_custom_pc) {
      renderShowcase(parts);
    } else {
      renderClassicParts(parts);
    }
  }

  function renderClassicParts(parts) {
    const rows = parts.map(p => `
      <div class="part-row">
        <div>
          <div class="part-name">${escHtml(p.custom_product_name || p.nome || 'Peça')}</div>
          <div class="part-cat">${escHtml(p.subcategoria || p.categoria || p.component_category || '')}</div>
        </div>
        <div class="part-qty">${p.qty || 1}×</div>
      </div>`).join('');

    elPartsSection.innerHTML = `
      <section class="parts-section" aria-label="Materiais aplicados">
        <h2 class="section-label">Materiais Aplicados</h2>
        <div class="glass-inner">${rows}</div>
      </section>`;
  }

  function renderShowcase(parts) {
    // Group by component_category
    const grouped = {};
    parts.forEach(p => {
      const cat = (p.component_category || p.categoria || 'OUTROS').toUpperCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    const cards = Object.entries(grouped).map(([cat, items]) => {
      const info = CATEGORY_ICONS[cat] || { icon: '🔧', label: cat };
      const first = items[0];
      const name  = first.custom_product_name || first.nome || '—';
      const spec  = buildSpecLine(first);

      return `
        <div class="pc-card">
          <div class="pc-card-cat">${info.icon} ${info.label}</div>
          <div class="pc-card-name">${escHtml(name)}</div>
          ${spec ? `<div class="pc-card-spec">${escHtml(spec)}</div>` : ''}
          <div class="pc-card-status">✓ Instalado</div>
        </div>`;
    }).join('');

    elPartsSection.innerHTML = `
      <section class="showcase-section" aria-label="Setup do computador">
        <h2 class="section-label" style="color:hsl(260,80%,70%);">Setup do Seu Computador</h2>
        <div class="pc-grid">${cards}</div>
      </section>`;
  }

  function buildSpecLine(part) {
    const specs = part.specs;
    if (!specs) return '';
    const bits = [];
    if (specs.cores)    bits.push(`${specs.cores} Núcleos`);
    if (specs.threads)  bits.push(`${specs.threads} Threads`);
    if (specs.speed)    bits.push(`${specs.speed} MHz`);
    if (specs.capacity) bits.push(`${specs.capacity} GB`);
    if (specs.vram)     bits.push(`${specs.vram} VRAM`);
    if (specs.chipset)  bits.push(`Chipset ${specs.chipset}`);
    if (specs.wattage)  bits.push(`${specs.wattage}W`);
    return bits.join(' · ');
  }

  // ─── Warranty ─────────────────────────────────────────────────────────────
  function renderWarranty() {
    const hasWarranty = osData.digital_warranty_code || osData.estimated_delivery || osData.payment_status;
    if (!hasWarranty) return;

    show(elWarrantySection);

    elWDeadline.textContent = osData.estimated_delivery ? fmtDate(osData.estimated_delivery) : 'Em definição';

    // Payment badge
    const pm = osData.payment_status || 'pendente';
    const pmMap = {
      pago:     { cls: 'pago',    label: '💸 Quitado / Pago' },
      parcial:  { cls: 'parcial', label: '💸 Entrada Paga' },
      pendente: { cls: 'pendente',label: '⏳ Acerto na Retirada' },
    };
    const pmInfo = pmMap[pm] || pmMap.pendente;
    elWPayment.innerHTML = `<span class="payment-badge ${pmInfo.cls}">${pmInfo.label}</span>`;

    // Warranty code
    if (osData.digital_warranty_code) {
      show(elWCodeBlock);
      elWCode.textContent = osData.digital_warranty_code;
      const endDate = osData.warranty_ate ? fmtDate(osData.warranty_ate) : null;
      elWPeriod.textContent = endDate
        ? `${osData.warranty_dias || 90} dias · válida até ${endDate}`
        : `${osData.warranty_dias || 90} dias de cobertura integral`;
    }
  }

  function copyWarrantyCode() {
    const code = osData.digital_warranty_code;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      elBtnCopy.classList.add('copied');
      elBtnCopy.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Copiado!`;
      setTimeout(() => {
        elBtnCopy.classList.remove('copied');
        elBtnCopy.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar`;
      }, 3000);
    }).catch(() => {
      // Fallback para browsers antigos
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  // ─── Photos ───────────────────────────────────────────────────────────────
  function renderPhotos() {
    const photos = osData.photos || [];
    if (!photos.length) return;
    show(elPhotosSection);

    const tagMap = { antes: 'Antes', durante: 'Reparo', depois: 'Pronto' };
    elPhotosGrid.innerHTML = photos.map(p => {
      const tag = tagMap[p.tipo] || p.tipo || '';
      return `
      <button class="photo-thumb" type="button" aria-label="Ampliar foto${tag ? ': ' + escHtml(tag) : ''}">
        <img src="${escHtml(p.url)}" alt="Foto do reparo" class="thumb-img" loading="lazy">
        <span class="photo-tag">${escHtml(tag)}</span>
      </button>`;
    }).join('');

    elPhotosGrid.querySelectorAll('.photo-thumb').forEach(btn => {
      btn.addEventListener('click', () => {
        const img = btn.querySelector('.thumb-img');
        openLightbox(img.src, btn);
      });
    });
  }

  function openLightbox(src, trigger) {
    elLightboxImg.src = src;
    elLightbox.classList.add('open');
    lightboxReturn = trigger || null;
    elLightboxClose.focus();
  }

  function closeLightbox() {
    elLightbox.classList.remove('open');
    elLightboxImg.src = '';
    if (lightboxReturn) { lightboxReturn.focus(); lightboxReturn = null; }
  }

  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  function renderWhatsApp() {
    show(elWaFooter);
    const name   = osData.customer_first_name || 'cliente';
    const osNum  = osData.os_number || '';
    const device = [osData.equip_marca, osData.equip_modelo].filter(Boolean).join(' ');
    const msg    = `Olá Iago! Sou ${name} e estou acompanhando a OS ${osNum}${device ? ` do meu ${device}` : ''} pelo link de rastreamento. Tenho uma dúvida!`;
    elBtnWa.href = `https://wa.me/5511919691542?text=${encodeURIComponent(msg)}`;
  }

  // ─── Active Timer ─────────────────────────────────────────────────────────
  function startTimer() {
    const activeEntry = history.find(h => !h.exited_at);
    if (!activeEntry?.entered_at) return;

    const startMs = new Date(activeEntry.entered_at).getTime();

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const str     = fmtElapsed(elapsed);
      elActiveTimer.textContent = `⏱️ Há ${str} nesta etapa`;

      const tlTimer = document.getElementById('tl-active-timer');
      if (tlTimer) tlTimer.textContent = `⏱️ Há ${str}`;
    };

    tick();
    if (timerID) clearInterval(timerID);
    timerID = setInterval(tick, 60_000);
  }

  // ─── Error State ──────────────────────────────────────────────────────────
  function showError() {
    hide(elLoading);
    show(elError);
    hide(elContent);
    hide(elWaFooter);
  }

  // ─── Utilities ────────────────────────────────────────────────────────────
  function normalizeStatus(s) {
    if (!s) return 'rascunho';
    // normaliza acentos e variações de snake_case
    return s
      .toLowerCase()
      .replace('diagnóstico', 'diagnostico')
      .replace('diagnose', 'diagnostico')
      .replace('aguardando_aprovação', 'aguardando_aprovacao')
      .replace('aguardando_peça', 'aguardando_peca')
      .replace(/\s+/g, '_');
  }

  function firstNameOf(name) {
    if (!name) return 'Cliente';
    return name.trim().split(/\s+/)[0];
  }

  function fmtDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  }

  function fmtDateTime(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  }

  function fmtDuration(seconds) {
    if (!seconds || seconds < 60) return '< 1min';
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    const rh = h % 24;
    const rm = m % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (rh > 0) parts.push(`${rh}h`);
    if (rm > 0 && d === 0) parts.push(`${rm}min`);
    return parts.join(' ');
  }

  function fmtElapsed(seconds) {
    if (seconds < 60) return 'menos de 1 minuto';
    const m  = Math.floor(seconds / 60);
    const h  = Math.floor(m / 60);
    const d  = Math.floor(h / 24);
    const rh = h % 24;
    const rm = m % 60;
    const parts = [];
    if (d  > 0) parts.push(`${d} ${d === 1 ? 'dia' : 'dias'}`);
    if (rh > 0) parts.push(`${rh} ${rh === 1 ? 'hora' : 'horas'}`);
    if (rm > 0 && d === 0) parts.push(`${rm} ${rm === 1 ? 'minuto' : 'minutos'}`);
    return parts.join(' e ');
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }
});
