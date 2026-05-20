// /assets/js/rastrear.js
// Vanilla JS Module — Public Mobile-First Client Tracking & Timeline (Feature 006)

document.addEventListener('DOMContentLoaded', () => {
  // Parse tracking token from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const loadingState = document.getElementById('tracking-loading');
  const errorState = document.getElementById('tracking-error');
  const mainContent = document.getElementById('tracking-content');

  // Customer UI Elements
  const clientGreeting = document.getElementById('client-greeting');
  const clientDeviceName = document.getElementById('client-device-name');
  const clientDeviceSerial = document.getElementById('client-device-serial');
  const clientDeviceDeadline = document.getElementById('client-device-deadline');
  const osNumberBadge = document.getElementById('os-number-badge');

  // Focus Status Card
  const activeStatusContainer = document.getElementById('active-status-container');
  const activeStatusBadge = document.getElementById('active-status-badge');
  const activeStatusName = document.getElementById('active-status-name');
  const activeStatusHeadline = document.getElementById('active-status-headline');
  const activeStatusTimer = document.getElementById('active-status-timer');

  // Timeline list
  const timelineList = document.getElementById('timeline-list');

  // Photos Grid
  const clientPhotosSection = document.getElementById('client-photos-section');
  const clientPhotosGrid = document.getElementById('client-photos-grid');

  // WhatsApp footer CTA
  const waFooter = document.getElementById('wa-footer');
  const btnWaClientCta = document.getElementById('btn-wa-client-cta');

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  let currentOS = null;
  let statusHistory = [];
  let timerInterval = null;

  if (!token) {
    showError();
    return;
  }

  // 1. Fetch Sanitized Tracking Data
  fetchTrackingData();

  // Setup Lightbox Closing
  lightboxClose.addEventListener('click', () => lightbox.classList.remove('open'));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('open');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch & Sanitization (LGPD Compliance)
  // ─────────────────────────────────────────────────────────────────────────────

  async function fetchTrackingData() {
    loadingState.style.display = 'block';
    errorState.style.display = 'none';
    mainContent.style.display = 'none';

    try {
      // Tenta consumir o endpoint de tracking público sanitizado
      const response = await fetch(`/api/admin/os/tracking?token=${token}`);
      if (response.ok) {
        const resData = await response.json();
        currentOS = resData.data;
        statusHistory = resData.history || [];
      } else {
        throw new Error('Falha no fetch');
      }
    } catch (err) {
      console.log('API de Rastreio não encontrada ou rodando localmente. Buscando em localStorage...');
      
      // Fallback local: Busca na lista global de OS pelo tracking_token correspondente
      const stored = localStorage.getItem('iflcosta_os_list');
      const list = stored ? JSON.parse(stored) : [];
      const rawOS = list.find(o => o.tracking_token === token);
      
      if (rawOS) {
        // Sanitiza os dados locais para simular o endpoint de produção (LGPD)
        currentOS = {
          id: rawOS.id,
          os_number: rawOS.os_number,
          customer_name: sanitizeCustomerName(rawOS.customer_name), // Apenas primeiro nome
          equipamento: {
            tipo: rawOS.equipamento.tipo,
            marca: rawOS.equipamento.marca,
            modelo: rawOS.equipamento.modelo,
            serial: maskSerial(rawOS.equipamento.serial) // Máscara no serial
          },
          status: rawOS.status,
          prazo_prometido: rawOS.prazo_prometido,
          created_at: rawOS.created_at,
          garantia_dias: rawOS.garantia_dias,
          entregue_at: rawOS.entregue_at,
          photos: rawOS.photos || [],
          problema_reportado: rawOS.problema_reportado
        };

        // Carrega histórico de status local
        const historyKey = `iflcosta_os_history_${rawOS.id}`;
        const storedHistory = localStorage.getItem(historyKey);
        statusHistory = storedHistory ? JSON.parse(storedHistory) : [];
      }
    }

    if (!currentOS) {
      showError();
      return;
    }

    // Renderiza dados do cliente na tela
    renderTrackingUI();
  }

  // Sanitiza o nome exibindo apenas o primeiro (LGPD)
  function sanitizeCustomerName(fullName) {
    if (!fullName) return 'Cliente';
    return fullName.trim().split(' ')[0];
  }

  // Aplica máscara no serial/IMEI para privacidade: ex: DX3G7892K23 -> DX3G****2K23
  function maskSerial(serial) {
    if (!serial) return 'Não informado';
    const clean = serial.trim();
    if (clean.length <= 6) return '****';
    
    const start = clean.slice(0, 4);
    const end = clean.slice(-4);
    return `${start}****${end}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UI Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  function renderTrackingUI() {
    // Header
    osNumberBadge.textContent = `Serviço nº ${currentOS.os_number}`;

    // Welcome card
    clientGreeting.textContent = `Olá, ${currentOS.cliente?.nome || currentOS.customer_name || 'Cliente'}!`;
    clientDeviceName.textContent = `${currentOS.equipamento.marca} ${currentOS.equipamento.modelo}`;
    clientDeviceSerial.textContent = currentOS.equipamento.serial;
    clientDeviceDeadline.textContent = formatDate(currentOS.prazo_prometido);

    // Active Status Display
    renderActiveStatusCard();

    // Timeline list
    renderTimeline();

    // Photos Grid
    renderPhotosGrid();

    // WhatsApp CTA
    setupWhatsAppCTA();

    // Hide Loading, Show Content
    loadingState.style.display = 'none';
    mainContent.style.display = 'block';

    // Start Dynamic Timer ticking active state every 60s
    startActiveTimer();
  }

  function renderActiveStatusCard() {
    const status = currentOS.status;
    
    // Status translation maps
    const labelMap = {
      rascunho: 'Recebido',
      diagnóstico: 'Em Diagnóstico',
      aguardando_aprovação: 'Aguardando Aprovação',
      aprovado: 'Orçamento Aprovado',
      aguardando_peça: 'Aguardando Peça',
      em_conserto: 'Em Manutenção',
      pronto: 'Pronto para Retirada',
      entregue: 'Aparelho Entregue',
      cancelado: 'Serviço Cancelado',
      cliente_desistiu: 'Devolvido'
    };

    const headlineMap = {
      rascunho: 'Seu equipamento foi recebido em nosso laboratório.',
      diagnóstico: 'Iago Lopes está diagnosticando e testando os circuitos.',
      aguardando_aprovação: 'O laudo técnico foi finalizado! Aguardamos seu OK no WhatsApp.',
      aprovado: 'Orçamento aprovado com sucesso! Iniciando os preparativos.',
      aguardando_peça: 'Aguardando chegada da peça de reposição encomendada.',
      em_conserto: 'Seu equipamento está na bancada sob reparos técnicos ativos.',
      pronto: 'Seu aparelho está PRONTO! 🎉 Pode vir buscá-lo quando puder.',
      entregue: 'Reparo finalizado e entregue. A sua garantia está ativa! 🛡️',
      cancelado: 'A ordem de serviço foi cancelada internamente.',
      cliente_desistiu: 'Reparo não autorizado. Equipamento disponível para devolução.'
    };

    activeStatusName.textContent = labelMap[status] || status;
    activeStatusHeadline.textContent = headlineMap[status] || 'Seu serviço está em andamento.';

    // Setup colors
    activeStatusBadge.className = `status-badge-lg badge-os--${status}`;
    activeStatusContainer.className = `active-status-card badge-os--${status}`;
  }

  function renderTimeline() {
    if (statusHistory.length === 0) {
      timelineList.innerHTML = '<p style="font-size: var(--text-xs); color: var(--color-secondary);">Nenhum histórico de status registrado.</p>';
      return;
    }

    // Sort history chronologically
    const sortedHistory = [...statusHistory].sort((a, b) => new Date(a.entered_at) - new Date(b.entered_at));

    // Map stages to render past, active and future ones logically
    const allStages = [
      { key: 'rascunho', label: 'Equipamento Recebido', desc: 'Aparelho deu entrada no laboratório.' },
      { key: 'diagnóstico', label: 'Análise & Diagnóstico', desc: 'Identificação de falhas e teste de componentes.' },
      { key: 'aguardando_aprovação', label: 'Orçamento Gerado', desc: 'Aguardando liberação do cliente para iniciar.' },
      { key: 'em_conserto', label: 'Manutenção de Bancada', desc: 'Troca de peças e microssoldas sob microscópio.' },
      { key: 'pronto', label: 'Finalizado & Testado', desc: 'Equipamento aprovado em todos os sensores de carga e toque.' },
      { key: 'entregue', label: 'Entregue & Garantia', desc: 'Aparelho retirado pelo proprietário com garantia ativa.' }
    ];

    // Se estiver cancelado ou desistiu, alteramos o final da timeline
    if (currentOS.status === 'cancelado') {
      allStages.splice(3, 3, { key: 'cancelado', label: 'Serviço Cancelado', desc: 'Remontagem e arquivamento do ticket.' });
    } else if (currentOS.status === 'cliente_desistiu') {
      allStages.splice(2, 4, { key: 'cliente_desistiu', label: 'Devolvido sem Reparo', desc: 'Equipamento devolvido ao proprietário.' });
    }

    // Encontra o index do status atual do cliente
    let activeStageIndex = allStages.findIndex(s => s.key === currentOS.status);
    
    // Tratamentos especiais para status que mapeiam para o mesmo bloco visual
    if (activeStageIndex === -1) {
      if (currentOS.status === 'aprovado') activeStageIndex = 3; // Em conserto
      if (currentOS.status === 'aguardando_peça') activeStageIndex = 3; // Em conserto
    }

    timelineList.innerHTML = allStages.map((stage, idx) => {
      let itemClass = 'future';
      let dotContent = '⚪';
      let metaInfo = '';

      // Verifica se esse estágio já passou no histórico
      const histItem = sortedHistory.find(h => {
        if (h.status === stage.key) return true;
        if (stage.key === 'em_conserto' && ['aprovado', 'aguardando_peça', 'em_conserto'].includes(h.status)) return true;
        return false;
      });

      if (idx < activeStageIndex || currentOS.status === stage.key && histItem?.exited_at) {
        itemClass = 'completed';
        dotContent = '✓';
        
        if (histItem) {
          const dateStr = formatDateTime(histItem.entered_at);
          const durationStr = histItem.duration_seconds 
            ? `Concluído em ${formatSecondsDuration(histItem.duration_seconds)}`
            : 'Etapa concluída';
          metaInfo = `
            <div class="timeline-date">${dateStr}</div>
            <div class="timeline-duration">${durationStr}</div>
          `;
        }
      } else if (idx === activeStageIndex) {
        itemClass = 'active';
        dotContent = '🟢';
        
        if (histItem) {
          const dateStr = formatDateTime(histItem.entered_at);
          metaInfo = `
            <div class="timeline-date">Iniciado em ${dateStr}</div>
            <div class="timeline-duration" id="timeline-active-timer">⏱️ Aguardando...</div>
          `;
        }
      } else {
        // Future Stage
        dotContent = '⚪';
        metaInfo = `<div class="timeline-date">Próxima etapa</div>`;
      }

      return `
        <div class="timeline-item ${itemClass}">
          <div class="timeline-dot">${dotContent}</div>
          <div class="timeline-content">
            <div class="timeline-header">
              <h4 class="timeline-title">${stage.label}</h4>
              ${metaInfo}
            </div>
            <p class="timeline-desc">${stage.desc}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderPhotosGrid() {
    const photos = currentOS.photos || [];
    if (photos.length === 0) {
      clientPhotosSection.style.display = 'none';
      return;
    }

    clientPhotosSection.style.display = 'block';
    
    clientPhotosGrid.innerHTML = photos.map(photo => {
      const labelMap = { antes: 'Antes', durante: 'Reparo', depois: 'Pronto' };
      const displayLabel = labelMap[photo.tipo] || photo.tipo;

      return `
        <div class="photo-thumb">
          <img src="${photo.url}" alt="Foto de Bancada ${displayLabel}" class="thumb-img">
          <span class="photo-tag">${displayLabel}</span>
        </div>
      `;
    }).join('');

    // Attach Lightbox triggers to gallery thumb images
    clientPhotosGrid.querySelectorAll('.thumb-img').forEach(img => {
      img.addEventListener('click', (e) => {
        lightboxImg.src = e.target.src;
        lightbox.classList.add('open');
      });
    });
  }

  function setupWhatsAppCTA() {
    waFooter.style.display = 'flex';
    
    const clientName = currentOS.customer_name;
    const deviceStr = `${currentOS.equipamento.marca} ${currentOS.equipamento.modelo}`;
    const osNum = currentOS.os_number;

    const welcomeMsg = `Oi Iago! Estou acompanhando a OS #${osNum} do meu ${deviceStr} pelo link de rastreamento exclusivo e gostaria de tirar uma dúvida sobre o conserto...`;

    // Direct corporate whatsapp redirect
    btnWaClientCta.href = `https://wa.me/5511999999999?text=${encodeURIComponent(welcomeMsg)}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Active Timer Logic (Live updates active status duration)
  // ─────────────────────────────────────────────────────────────────────────────

  function startActiveTimer() {
    // Localiza o item ativo no histórico de status
    const activeHistoryItem = [...statusHistory]
      .reverse()
      .find(h => !h.exited_at);

    if (!activeHistoryItem) return;

    const enteredTime = new Date(activeHistoryItem.entered_at).getTime();

    // Função de tick imediato
    const tick = () => {
      const now = new Date().getTime();
      const diffSeconds = Math.floor((now - enteredTime) / 1000);

      // Formata a string de tempo gasto
      const durationStr = formatActiveDuration(diffSeconds);

      // Atualiza no Card Principal e na Timeline
      activeStatusTimer.textContent = `⏱️ Há ${durationStr} nesta etapa`;
      
      const timelineActiveTimer = document.getElementById('timeline-active-timer');
      if (timelineActiveTimer) {
        timelineActiveTimer.textContent = `⏱️ Há ${durationStr}`;
      }
    };

    // Roda uma vez de imediato
    tick();

    // Limpa intervalo anterior se existir
    if (timerInterval) clearInterval(timerInterval);

    // Roda a cada 60 segundos
    timerInterval = setInterval(tick, 60000);
  }

  // Formata o contador ativo: ex: "1 dia e 4 horas", "2 horas e 15 minutos", "menos de 1 minuto"
  function formatActiveDuration(seconds) {
    if (seconds < 60) return 'menos de 1 minuto';
    
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;

    let parts = [];
    if (days > 0) {
      parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
    }
    if (remainingHours > 0) {
      parts.push(`${remainingHours} ${remainingHours === 1 ? 'hora' : 'horas'}`);
    }
    if (remainingMinutes > 0 && days === 0) { // Não exibe minutos se já passaram dias pra não poluir
      parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}`);
    }

    return parts.join(' e ');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper Formatters
  // ─────────────────────────────────────────────────────────────────────────────

  function formatSecondsDuration(seconds) {
    if (!seconds || seconds < 60) return 'menos de 1 min';
    
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;

    let parts = [];
    if (days > 0) {
      parts.push(`${days}d`);
    }
    if (remainingHours > 0) {
      parts.push(`${remainingHours}h`);
    }
    if (remainingMinutes > 0 && days === 0) {
      parts.push(`${remainingMinutes}min`);
    }

    return parts.join(' ');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    
    const dateFormatted = d.toLocaleDateString('pt-BR');
    const timeFormatted = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dateFormatted} às ${timeFormatted}`;
  }

  function showError() {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    mainContent.style.display = 'none';
    waFooter.style.display = 'none';
  }
});
