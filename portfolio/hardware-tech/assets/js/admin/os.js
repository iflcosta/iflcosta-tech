// /assets/js/admin/os.js
// Vanilla JS Module — OS Dashboard & Repair Creation (Feature 006)

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('os-search');
  const statusFilter = document.getElementById('os-status-filter');
  const atrasadasFilter = document.getElementById('os-atrasadas-filter');
  
  const loadingState = document.getElementById('os-loading');
  const emptyState = document.getElementById('os-empty');
  const tableContainer = document.getElementById('os-table-container');
  const tableBody = document.getElementById('os-table-body');
  const gridContainer = document.getElementById('os-grid-container');

  const addOsBtn = document.getElementById('add-os-btn');

  // Modal Elements
  const modalBackdrop = document.getElementById('os-modal-backdrop');
  const modalForm = document.getElementById('os-form');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const modalFeedback = document.getElementById('modal-feedback');
  
  // Form Fields
  const osCustomerId = document.getElementById('os-customer-id');
  const osEquipTipo = document.getElementById('os-equip-tipo');
  const osEquipMarca = document.getElementById('os-equip-marca');
  const osEquipModelo = document.getElementById('os-equip-modelo');
  const osEquipSerial = document.getElementById('os-equip-serial');
  const osProblema = document.getElementById('os-problema');
  const osPrazo = document.getElementById('os-prazo');
  const osValorEstimado = document.getElementById('os-valor-estimado');
  const osLaudo = document.getElementById('os-laudo');

  let osList = [];
  let customersList = [];

  // 1. Initial Load & Setup
  fetchCustomers();
  fetchOS();

  // Event Listeners
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderList, 300); // Debounce search
  });

  statusFilter.addEventListener('change', renderList);
  atrasadasFilter.addEventListener('change', renderList);

  // Modal Actions
  addOsBtn.addEventListener('click', openOsModal);
  closeModalBtn.addEventListener('click', closeOsModal);
  cancelModalBtn.addEventListener('click', closeOsModal);
  modalForm.addEventListener('submit', handleOsSubmit);

  // Close modal when clicking backdrop
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeOsModal();
  });

  // Set default deadline to today + 3 days in form
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 3);
  osPrazo.value = defaultDate.toISOString().split('T')[0];

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Functions
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch actual CRM customers to link to the OS
  async function fetchCustomers() {
    try {
      const response = await fetch('/api/admin/crm/customers');
      if (response.status === 401) {
        window.location.href = "../../../admin/login';
        return;
      }
      
      if (response.ok) {
        const resData = await response.json();
        customersList = resData.data || [];
      } else {
        throw new Error('Falha no GET');
      }
    } catch (err) {
      console.error('Erro ao carregar clientes da API:', err);
      customersList = [];
    } finally {
      populateCustomerSelect(customersList);
    }
  }

  function populateCustomerSelect(customers) {
    osCustomerId.innerHTML = '<option value="">Selecione o Cliente...</option>' + 
      customers.map(c => `<option value="${c.id}">${escapeHtml(c.nome)} (${formatPhone(c.telefone)})</option>`).join('');
  }

  // Fetch Ordens de Serviço
  async function fetchOS() {
    toggleLoading(true);
    try {
      const response = await fetch('/api/admin/os');
      if (response.status === 401) {
        window.location.href = "../../../admin/login';
        return;
      }

      if (response.ok) {
        const resData = await response.json();
        osList = (resData.data || []).map(os => ({
          ...os,
          customer_name: os.customer_name || (os.customers ? os.customers.nome : ''),
          customer_phone: os.customer_phone || (os.customers ? os.customers.telefone : ''),
          customer_email: os.customer_email || (os.customers ? os.customers.email : '')
        }));
      } else {
        throw new Error('Falha ao ler OS');
      }
    } catch (err) {
      console.error('Erro ao carregar OS:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-error-text);padding:var(--space-6);">Erro ao carregar Ordens de Serviço. Verifique sua conexão.</td></tr>`;
      osList = [];
    } finally {
      renderList();
      toggleLoading(false);
    }
  }

  // Render OS (Tabela no desktop e grid de cards no mobile)
  function renderList() {
    const searchVal = searchInput.value.trim().toLowerCase();
    const statusVal = statusFilter.value;
    const apenasAtrasadas = atrasadasFilter.checked;

    // Filter logic
    const filteredOS = osList.filter(os => {
      // 1. Text search (Customer, OS number, Device brand/model)
      const matchesSearch = !searchVal || 
        os.os_number.toString().includes(searchVal) ||
        (os.customer_name && os.customer_name.toLowerCase().includes(searchVal)) ||
        (os.equipamento.marca && os.equipamento.marca.toLowerCase().includes(searchVal)) ||
        (os.equipamento.modelo && os.equipamento.modelo.toLowerCase().includes(searchVal));

      // 2. Status Filter
      const matchesStatus = !statusVal || os.status === statusVal;

      // 3. Overdue SLA Filter (deadline passed and status is not terminal [entregue, cancelado, desistiu])
      const isAtrasada = isOSOverdue(os);
      const matchesAtrasadas = !apenasAtrasadas || isAtrasada;

      return matchesSearch && matchesStatus && matchesAtrasadas;
    });

    // Handle Empty state
    if (filteredOS.length === 0) {
      emptyState.style.display = 'block';
      tableContainer.style.display = 'none';
      gridContainer.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    if (window.innerWidth >= 1024) {
      tableContainer.style.display = 'block';
      gridContainer.style.display = 'none';
    } else {
      tableContainer.style.display = 'none';
      gridContainer.style.display = 'grid';
    }

    // Sort: deadline closer/overdue first, then newest
    filteredOS.sort((a, b) => {
      const isTerminalA = ['entregue', 'cancelado', 'cliente_desistiu'].includes(a.status);
      const isTerminalB = ['entregue', 'cancelado', 'cliente_desistiu'].includes(b.status);
      
      // Keep terminal states at the bottom
      if (isTerminalA && !isTerminalB) return 1;
      if (!isTerminalA && isTerminalB) return -1;

      return new Date(a.prazo_prometido) - new Date(b.prazo_prometido);
    });

    // Render Desktop Table
    tableBody.innerHTML = filteredOS.map(os => {
      const isAtrasada = isOSOverdue(os);
      const rowClass = isAtrasada ? 'os-atrasada' : '';
      const statusBadge = getStatusBadgeHtml(os.status);
      const formattedDate = formatDate(os.created_at);
      const formattedDeadline = formatDate(os.prazo_prometido);
      
      const deadlineHtml = isAtrasada 
        ? `<span class="text-atrasado">⚠️ ${formattedDeadline}</span>` 
        : formattedDeadline;

      const margem = os.valor_cobrado - (os.valor_custo_peças || 0);

      return `
        <tr class="${rowClass}" data-os-id="${os.id}">
          <td style="font-weight: var(--font-semibold);">
            #${os.os_number}
            <span style="display: block; font-size: 10px; color: var(--color-text-tertiary); font-weight: normal; margin-top: 2px;">
              ${formattedDate}
            </span>
          </td>
          <td style="font-weight: var(--font-semibold);">${escapeHtml(os.customer_name)}</td>
          <td>
            ${escapeHtml(os.equipamento.marca)} ${escapeHtml(os.equipamento.modelo)}
            <span style="display: block; font-size: 10px; color: var(--color-text-tertiary);">
              ${escapeHtml(os.equipamento.tipo)} ${os.equipamento.serial ? '· SN: ' + escapeHtml(os.equipamento.serial) : ''}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td>${deadlineHtml}</td>
          <td style="font-weight: var(--font-semibold);">
            R$ ${parseFloat(os.valor_cobrado || 0).toFixed(2)}
            <span style="display: block; font-size: 10px; color: var(--color-success); font-weight: normal; margin-top: 2px;">
              Margem: R$ ${margem.toFixed(2)}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    // Render Mobile Grid Cards
    gridContainer.innerHTML = filteredOS.map(os => {
      const isAtrasada = isOSOverdue(os);
      const statusBadge = getStatusBadgeHtml(os.status);
      const formattedDeadline = formatDate(os.prazo_prometido);
      const formattedDate = formatDate(os.created_at);
      const deadlineHtml = isAtrasada 
        ? `<span class="text-atrasado">⚠️ ${formattedDeadline} (Atrasada)</span>` 
        : `Prazo: ${formattedDeadline}`;

      return `
        <div class="os-card ${isAtrasada ? 'os-atrasada' : ''}" data-os-id="${os.id}">
          <div class="os-card-header">
            <div>
              <h3 class="os-card-title">${escapeHtml(os.customer_name)}</h3>
              <div class="os-card-meta">OS #${os.os_number} · Abertura: ${formattedDate}</div>
            </div>
            ${statusBadge}
          </div>
          <div class="os-card-body">
            <span style="font-weight: var(--font-semibold); color: var(--color-text-primary);">
              ${escapeHtml(os.equipamento.marca)} ${escapeHtml(os.equipamento.modelo)}
            </span>
            <span style="font-size: var(--text-xs); color: var(--color-text-tertiary);">
              Defeito: ${escapeHtml(os.problema_reportado)}
            </span>
          </div>
          <div class="os-card-footer">
            <span style="font-size: var(--text-xs); color: var(--color-text-secondary); display: flex; flex-direction: column;">
              ${deadlineHtml}
            </span>
            <span style="font-weight: var(--font-semibold); color: var(--color-brand);">
              R$ ${parseFloat(os.valor_cobrado || 0).toFixed(2)}
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Click navigation events to go to OS Details
    document.querySelectorAll('[data-os-id]').forEach(element => {
      element.addEventListener('click', () => {
        const osId = element.getAttribute('data-os-id');
        window.location.href = `/admin/os/detalhes?id=${osId}`;
      });
    });
  }

  // Handle New OS form submission
  async function handleOsSubmit(e) {
    e.preventDefault();
    modalFeedback.style.display = 'none';

    const selectedCustId = osCustomerId.value;
    const selectedCust = customersList.find(c => c.id === selectedCustId);
    
    if (!selectedCust) {
      showModalError('Por favor, selecione um cliente válido.');
      return;
    }

    const submitBtn = document.getElementById('submit-modal-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Salvando... 🔄</span>';

    const payload = {
      customer_id: selectedCustId,
      customer_name: selectedCust.nome,
      customer_phone: selectedCust.telefone,
      equipamento: {
        tipo: osEquipTipo.value,
        marca: osEquipMarca.value.trim(),
        modelo: osEquipModelo.value.trim(),
        serial: osEquipSerial.value.trim() || null
      },
      problema_reportado: osProblema.value.trim(),
      laudo: osLaudo.value.trim() || null,
      prazo_prometido: osPrazo.value,
      status: 'rascunho', // Initial status
      valor_cobrado: parseFloat(osValorEstimado.value || 0),
      valor_custo_peças: 0,
      valor_lucro: parseFloat(osValorEstimado.value || 0),
      created_at: new Date().toISOString(),
      tracking_token: crypto.randomUUID ? crypto.randomUUID() : 'tracking-' + Math.random().toString(36).substring(2, 11),
      checklist: getDeviceChecklistPreset(osEquipTipo.value),
      photos: []
    };

    try {
      const response = await fetch('/api/admin/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        window.location.href = "../../../admin/login';
        return;
      }

      if (response.ok) {
        const resData = await response.json();
        closeOsModal();
        window.location.href = `/admin/os/detalhes?id=${resData.data.id}`;
      } else {
        throw new Error('Falha ao gravar OS na API.');
      }
    } catch (err) {
      console.error('Erro ao criar OS:', err);
      showModalError(`Erro ao criar OS: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Modal & Helper Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  function openOsModal() {
    modalFeedback.style.display = 'none';
    
    // Clear fields but preserve deadline default
    osCustomerId.value = '';
    osEquipTipo.value = 'Celular';
    osEquipMarca.value = '';
    osEquipModelo.value = '';
    osEquipSerial.value = '';
    osProblema.value = '';
    osValorEstimado.value = '';
    osLaudo.value = '';

    modalBackdrop.classList.add('is-open');
  }

  function closeOsModal() {
    modalBackdrop.classList.remove('is-open');
  }

  function showModalError(msg) {
    modalFeedback.textContent = msg;
    modalFeedback.style.display = 'block';
  }

  function toggleLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
      emptyState.style.display = 'none';
      tableContainer.style.display = 'none';
      gridContainer.style.display = 'none';
    }
  }

  function isOSOverdue(os) {
    if (['entregue', 'cancelado', 'cliente_desistiu'].includes(os.status)) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(os.prazo_prometido);
    return deadline < today;
  }

  function getStatusBadgeHtml(status) {
    const labelMap = {
      rascunho: 'Rascunho',
      diagnóstico: 'Diagnóstico',
      aguardando_aprovação: 'Aguardando Aprovação',
      aprovado: 'Aprovado',
      aguardando_peça: 'Aguardando Peça',
      em_conserto: 'Em Conserto',
      pronto: 'Pronto',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
      cliente_desistiu: 'Cliente Desistiu'
    };
    
    const displayLabel = labelMap[status] || status;
    return `<span class="badge-os badge-os--${status}">${displayLabel}</span>`;
  }

  function getDeviceChecklistPreset(tipo) {
    const cellphonePreset = [
      { label: 'Bateria e Carga', checked: false },
      { label: 'Rede Celular & Wi-Fi', checked: false },
      { label: 'Tela Touchscreen', checked: false },
      { label: 'Câmera Traseira / Frontal', checked: false },
      { label: 'Microfone & Alto-falante', checked: false },
      { label: 'Sensores (Giro/Face ID)', checked: false },
      { label: 'Botões Físicos', checked: false }
    ];

    const computerPreset = [
      { label: 'Inicialização (POST/BIOS)', checked: false },
      { label: 'Armazenamento (SSD/S.M.A.R.T)', checked: false },
      { label: 'Memória RAM (MemTest)', checked: false },
      { label: 'Placa de Vídeo / Vídeo Integrado', checked: false },
      { label: 'Temperaturas e Refrigeração', checked: false },
      { label: 'Sistemas Operacionais & Drivers', checked: false },
      { label: 'Varredura de Vírus/Malwares', checked: false }
    ];

    const generalPreset = [
      { label: 'Inspeção Visual Externa', checked: false },
      { label: 'Liga / Dá Vídeo', checked: false },
      { label: 'Entradas USB e Conexões', checked: false },
      { label: 'Teste de Carga / Alimentação', checked: false },
      { label: 'Funcionalidade Principal', checked: false }
    ];

    if (tipo === 'Celular') return cellphonePreset;
    if (tipo === 'Notebook' || tipo === 'Desktop') return computerPreset;
    return generalPreset;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  function formatPhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phone;
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
