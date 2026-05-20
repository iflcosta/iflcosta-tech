// /assets/js/admin/leads.js
// Vanilla JS Module — Leads Panel Interaction (Feature 005)

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('lead-search');
  const statusFilter = document.getElementById('lead-status-filter');
  const urgencyFilter = document.getElementById('lead-urgency-filter');
  
  const loadingState = document.getElementById('leads-loading');
  const emptyState = document.getElementById('leads-empty');
  const tableContainer = document.getElementById('leads-table-container');
  const tableBody = document.getElementById('leads-table-body');
  const gridContainer = document.getElementById('leads-grid-container');

  // Drawer Elements
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const leadDrawer = document.getElementById('lead-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const drawerLeadName = document.getElementById('drawer-lead-name');
  const drawerLeadService = document.getElementById('drawer-lead-service');
  const drawerStatusSelect = document.getElementById('drawer-status-select');
  const drawerLeadDate = document.getElementById('drawer-lead-date');
  const drawerLeadUrgency = document.getElementById('drawer-lead-urgency');
  const drawerLeadPhone = document.getElementById('drawer-lead-phone');
  const drawerLeadOrigin = document.getElementById('drawer-lead-origin');
  const drawerLeadEmail = document.getElementById('drawer-lead-email');
  const drawerLeadCity = document.getElementById('drawer-lead-city');
  const drawerLeadMessage = document.getElementById('drawer-lead-message');
  const drawerLeadNotes = document.getElementById('drawer-lead-notes');
  const saveNotesBtn = document.getElementById('save-notes-btn');
  const notesStatusText = document.getElementById('notes-status');
  const drawerWhatsappBtn = document.getElementById('drawer-whatsapp-btn');
  const convertLeadBtn = document.getElementById('convert-lead-btn');

  // Conversion Modal Elements
  const conversionBackdrop = document.getElementById('conversion-backdrop');
  const conversionForm = document.getElementById('conversion-form');
  const closeConversionBtn = document.getElementById('close-conversion-btn');
  const cancelConversionBtn = document.getElementById('cancel-conversion-btn');
  const conversionFeedback = document.getElementById('conversion-feedback');

  // Form Fields
  const convNome = document.getElementById('conv-nome');
  const convTelefone = document.getElementById('conv-telefone');
  const convEmail = document.getElementById('conv-email');
  const convCpf = document.getElementById('conv-cpf');
  const convLogradouro = document.getElementById('conv-logradouro');
  const convNumero = document.getElementById('conv-numero');
  const convComplemento = document.getElementById('conv-complemento');
  const convBairro = document.getElementById('conv-bairro');
  const convCidade = document.getElementById('conv-cidade');
  const convUf = document.getElementById('conv-uf');
  const convCep = document.getElementById('conv-cep');
  const convTags = document.getElementById('conv-tags');
  const convObservacoes = document.getElementById('conv-observacoes');

  let activeLead = null;
  let leadsList = [];
  let saveNotesTimeout = null;

  // 1. Initial Load & Setup
  fetchLeads();

  // Event Listeners for Filters
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchLeads, 400); // Debounce search
  });
  statusFilter.addEventListener('change', fetchLeads);
  urgencyFilter.addEventListener('change', fetchLeads);

  // Close Drawer
  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);

  // Status Change in Drawer
  drawerStatusSelect.addEventListener('change', async () => {
    if (!activeLead) return;
    const newStatus = drawerStatusSelect.value;
    try {
      const response = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeLead.id, status: newStatus })
      });
      const resData = await response.json();
      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      if (!response.ok) throw new Error(resData.message || 'Erro ao alterar status.');

      // Update local state and UI
      activeLead.status = newStatus;
      fetchLeads(); // Refresh list to show updated status badges
    } catch (err) {
      alert(`Erro: ${err.message}`);
      drawerStatusSelect.value = activeLead.status; // Revert select
    }
  });

  // Save Notes (Manual / Auto-save)
  saveNotesBtn.addEventListener('click', saveNotes);
  drawerLeadNotes.addEventListener('input', () => {
    notesStatusText.textContent = 'Alterações pendentes...';
    notesStatusText.style.color = 'var(--color-text-secondary)';
    clearTimeout(saveNotesTimeout);
    saveNotesTimeout = setTimeout(saveNotes, 1500); // Auto-save after 1.5s idle
  });

  // Conversion Flow Trigger
  convertLeadBtn.addEventListener('click', openConversionModal);
  closeConversionBtn.addEventListener('click', closeConversionModal);
  cancelConversionBtn.addEventListener('click', closeConversionModal);

  conversionForm.addEventListener('submit', handleConversionSubmit);

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Functions
  // ─────────────────────────────────────────────────────────────────────────────

  async function fetchLeads() {
    toggleLoading(true);
    
    const searchVal = searchInput.value.trim();
    const statusVal = statusFilter.value;
    const urgencyVal = urgencyFilter.value;

    const queryParams = new URLSearchParams();
    if (searchVal) queryParams.set('search', searchVal);
    if (statusVal) queryParams.set('status', statusVal);
    if (urgencyVal) queryParams.set('urgency', urgencyVal);

    try {
      const response = await fetch(`/api/admin/crm/leads?${queryParams.toString()}`);
      const resData = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) throw new Error(resData.message || 'Erro ao carregar leads.');

      leadsList = resData.data || [];
      renderLeads(leadsList);
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-error-text);">Erro ao carregar leads: ${err.message}</td></tr>`;
      gridContainer.innerHTML = `<div style="text-align: center; color: var(--color-error-text); padding: var(--space-4);">Erro ao carregar leads: ${err.message}</div>`;
    } finally {
      toggleLoading(false);
    }
  }

  function renderLeads(leads) {
    if (leads.length === 0) {
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

    // Render Table
    tableBody.innerHTML = leads.map(lead => {
      const formattedDate = new Date(lead.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <tr data-lead-id="${lead.id}">
          <td style="color: var(--color-text-secondary);">${formattedDate}</td>
          <td style="font-weight: var(--font-semibold);">${escapeHtml(lead.nome)}</td>
          <td>${formatPhone(lead.telefone)}</td>
          <td><span class="badge badge--brand">${escapeHtml(lead.servico)}</span></td>
          <td><span class="badge urgency-badge--${lead.urgency}">${formatUrgency(lead.urgency)}</span></td>
          <td style="color: var(--color-text-tertiary); font-size: var(--text-xs);">${escapeHtml(lead.origem || 'Website')}</td>
          <td><span class="badge badge--${getStatusColor(lead.status)}">${formatStatus(lead.status)}</span></td>
        </tr>
      `;
    }).join('');

    // Render Grid Cards for Mobile
    gridContainer.innerHTML = leads.map(lead => {
      const formattedDate = new Date(lead.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="lead-card" data-lead-id="${lead.id}">
          <div class="lead-card-header">
            <div>
              <h3 class="lead-card-title">${escapeHtml(lead.nome)}</h3>
              <span class="badge badge--brand" style="margin-top: 4px;">${escapeHtml(lead.servico)}</span>
            </div>
            <span class="lead-card-date">${formattedDate}</span>
          </div>
          <p style="margin: 0; font-size: var(--text-sm); color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(lead.mensagem || 'Sem mensagem')}
          </p>
          <div class="lead-card-footer">
            <span class="badge urgency-badge--${lead.urgency}">${formatUrgency(lead.urgency)}</span>
            <span class="badge badge--${getStatusColor(lead.status)}">${formatStatus(lead.status)}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    document.querySelectorAll('[data-lead-id]').forEach(element => {
      element.addEventListener('click', () => {
        const leadId = element.getAttribute('data-lead-id');
        const lead = leadsList.find(l => l.id === leadId);
        if (lead) openDrawer(lead);
      });
    });
  }

  function openDrawer(lead) {
    activeLead = lead;
    
    // Fill Drawer Content
    drawerLeadName.textContent = lead.nome;
    drawerLeadService.textContent = lead.servico;
    drawerStatusSelect.value = lead.status;
    
    drawerLeadDate.textContent = new Date(lead.created_at).toLocaleString('pt-BR');
    drawerLeadUrgency.innerHTML = `<span class="badge urgency-badge--${lead.urgency}">${formatUrgency(lead.urgency)}</span>`;
    drawerLeadPhone.textContent = formatPhone(lead.telefone);
    drawerLeadOrigin.textContent = lead.origem || 'Website';
    drawerLeadEmail.textContent = lead.email || 'Não informado';
    drawerLeadCity.textContent = lead.cidade ? `${lead.cidade}${lead.estado ? ` - ${lead.estado}` : ''}` : 'Não informado';
    drawerLeadMessage.textContent = lead.mensagem || 'Nenhuma mensagem adicional.';
    drawerLeadNotes.value = lead.notes || '';
    notesStatusText.textContent = lead.notes ? 'Notas salvas' : '';
    notesStatusText.style.color = 'var(--color-text-tertiary)';

    // WhatsApp CTA
    const cleanPhone = lead.telefone.replace(/\D/g, '');
    const waText = encodeURIComponent(`Olá ${lead.nome.split(' ')[0]}! Aqui é o Iago Lopes da IL Hardware & Tech. Recebi seu contato sobre o orçamento para ${lead.servico} e gostaria de...`);
    drawerWhatsappBtn.href = `https://wa.me/55${cleanPhone}?text=${waText}`;

    // Hide or show Conversion Button based on status
    if (lead.status === 'convertido') {
      convertLeadBtn.innerHTML = '<span>👤 Cliente Convertido</span>';
      convertLeadBtn.disabled = true;
      convertLeadBtn.style.opacity = '0.7';
      convertLeadBtn.style.cursor = 'not-allowed';
    } else {
      convertLeadBtn.innerHTML = '<span>👤 Marcar como Cliente</span>';
      convertLeadBtn.disabled = false;
      convertLeadBtn.style.opacity = '1';
      convertLeadBtn.style.cursor = 'pointer';
    }

    // Toggle CSS classes to open
    drawerBackdrop.classList.add('is-open');
    leadDrawer.classList.add('is-open');
  }

  function closeDrawer() {
    clearTimeout(saveNotesTimeout);
    drawerBackdrop.classList.remove('is-open');
    leadDrawer.classList.remove('is-open');
    activeLead = null;
  }

  async function saveNotes() {
    if (!activeLead) return;
    clearTimeout(saveNotesTimeout);

    notesStatusText.textContent = 'Salvando notas...';
    notesStatusText.style.color = 'var(--color-text-secondary)';

    const newNotes = drawerLeadNotes.value;

    try {
      const response = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeLead.id, notes: newNotes })
      });
      const resData = await response.json();
      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      if (!response.ok) throw new Error(resData.message || 'Erro ao salvar notas.');

      activeLead.notes = newNotes;
      notesStatusText.textContent = 'Notas salvas com sucesso!';
      notesStatusText.style.color = 'var(--color-success)';
      
      // Update our local lead list so details persist if reopened
      const listLead = leadsList.find(l => l.id === activeLead.id);
      if (listLead) listLead.notes = newNotes;
    } catch (err) {
      notesStatusText.textContent = 'Erro ao salvar!';
      notesStatusText.style.color = 'var(--color-error-text)';
      alert(`Falha ao salvar notas: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Conversion Modal Logic
  // ─────────────────────────────────────────────────────────────────────────────

  function openConversionModal() {
    if (!activeLead) return;
    
    // Auto-fill fields from activeLead
    convNome.value = activeLead.nome;
    convTelefone.value = activeLead.telefone.replace(/\D/g, '');
    convEmail.value = activeLead.email || '';
    convCpf.value = '';
    
    // Clear Address
    convLogradouro.value = '';
    convNumero.value = '';
    convComplemento.value = '';
    convBairro.value = '';
    convCidade.value = activeLead.cidade || '';
    convUf.value = activeLead.estado || '';
    convCep.value = '';

    // Auto-fill custom fields
    convTags.value = 'lead-convertido';
    convObservacoes.value = activeLead.notes || '';
    conversionFeedback.style.display = 'none';

    // Show modal
    conversionBackdrop.classList.add('open');
  }

  function closeConversionModal() {
    conversionBackdrop.classList.remove('open');
  }

  async function handleConversionSubmit(e) {
    e.preventDefault();
    if (!activeLead) return;

    conversionFeedback.style.display = 'none';
    const submitBtn = document.getElementById('submit-conversion-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Convertendo... 🔄</span>';

    // Build Address Object
    const address = {
      logradouro: convLogradouro.value.trim() || null,
      numero: convNumero.value.trim() || null,
      complemento: convComplemento.value.trim() || null,
      bairro: convBairro.value.trim() || null,
      cidade: convCidade.value.trim() || null,
      uf: convUf.value.trim().toUpperCase() || null,
      cep: convCep.value.replace(/\D/g, '') || null
    };

    // Clean tags
    const tagsArray = convTags.value.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload = {
      leadId: activeLead.id,
      nome: convNome.value.trim(),
      telefone: convTelefone.value.trim(),
      email: convEmail.value.trim() || null,
      cpf: convCpf.value.replace(/\D/g, '') || null,
      endereco: Object.values(address).some(v => v !== null) ? address : null,
      tags: tagsArray,
      observacoes: convObservacoes.value.trim() || null
    };

    try {
      const response = await fetch('/api/admin/crm/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      
      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error(resData.message || 'Falha na conversão de cliente.');
      }

      // Success feedback
      alert(resData.message || 'Cliente convertido com sucesso!');
      
      // Close all modals
      closeConversionModal();
      closeDrawer();

      // Redireciona para Ficha do Cliente
      window.location.href = `/admin/clientes/detalhes?id=${resData.customerId}`;
    } catch (err) {
      console.error(err);
      conversionFeedback.textContent = err.message;
      conversionFeedback.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  // Helper Utilities
  function toggleLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
      emptyState.style.display = 'none';
      tableContainer.style.display = 'none';
      gridContainer.style.display = 'none';
    }
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

  function formatPhone(phone) {
    if (!phone) return '-';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    } else if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  }

  function formatUrgency(urgency) {
    const map = {
      'hoje': 'Hoje ⚠️',
      'essa_semana': 'Esta Semana',
      'sem_pressa': 'Sem Pressa'
    };
    return map[urgency] || urgency;
  }

  function formatStatus(status) {
    const map = {
      'novo': 'Novo',
      'contatado': 'Contatado',
      'orcamento_enviado': 'Orç. Enviado',
      'convertido': 'Convertido',
      'perdido': 'Perdido'
    };
    return map[status] || status;
  }

  function getStatusColor(status) {
    const map = {
      'novo': 'warning',
      'contatado': 'info',
      'orcamento_enviado': 'brand',
      'convertido': 'success',
      'perdido': 'danger'
    };
    return map[status] || 'secondary';
  }
});
