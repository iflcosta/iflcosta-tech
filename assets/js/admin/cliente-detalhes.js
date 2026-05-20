// /assets/js/admin/cliente-detalhes.js
// Vanilla JS Module — Customer Details Sheet Interactions (Feature 005)

document.addEventListener('DOMContentLoaded', () => {
  // Capture customer ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('id');

  // DOM Layout Sections
  const loadingSection = document.getElementById('details-loading');
  const errorSection = document.getElementById('details-error');
  const contentSection = document.getElementById('details-content');

  // Error Card Elements
  const errorTitle = document.getElementById('error-title');
  const errorDesc = document.getElementById('error-desc');

  // Profile Header Elements
  const headerClientName = document.getElementById('header-client-name');
  const headerClientPhoneSub = document.getElementById('header-client-phone-sub');
  const headerClientTags = document.getElementById('header-client-tags');
  const contactCallBtn = document.getElementById('contact-call-btn');
  const contactWhatsappBtn = document.getElementById('contact-whatsapp-btn');

  // Profile Form Elements
  const editProfileForm = document.getElementById('edit-profile-form');
  const editNome = document.getElementById('edit-nome');
  const editTelefone = document.getElementById('edit-telefone');
  const editEmail = document.getElementById('edit-email');
  const editCpf = document.getElementById('edit-cpf');
  const editLogradouro = document.getElementById('edit-logradouro');
  const editNumero = document.getElementById('edit-numero');
  const editComplemento = document.getElementById('edit-complemento');
  const editBairro = document.getElementById('edit-bairro');
  const editCidade = document.getElementById('edit-cidade');
  const editUf = document.getElementById('edit-uf');
  const editCep = document.getElementById('edit-cep');
  const editTags = document.getElementById('edit-tags');

  // Notes Elements
  const clientObservacoes = document.getElementById('client-observacoes');
  const saveNotesBtn = document.getElementById('save-notes-btn');
  const notesSaveStatus = document.getElementById('notes-save-status');

  // Leads History Elements
  const leadsCountBadge = document.getElementById('leads-count-badge');
  const leadsHistoryContainer = document.getElementById('leads-history-container');

  // Delete Modal Elements
  const deleteCustomerBtn = document.getElementById('delete-customer-btn');
  const deleteModalBackdrop = document.getElementById('delete-modal-backdrop');
  const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const deleteClientNameBold = document.getElementById('delete-client-name-bold');

  let currentCustomerData = null;
  let autoSaveNotesTimeout = null;

  // 1. Initial Router check
  if (!customerId) {
    showError('Identificador Ausente', 'A URL informada não contém um parâmetro de consulta de ID válido.');
    return;
  }

  fetchCustomerDetails();

  // Profile Edit form submit listener
  editProfileForm.addEventListener('submit', handleProfileUpdate);

  // Notes Auto-save & Manual save listeners
  saveNotesBtn.addEventListener('click', saveTechnicalNotes);
  clientObservacoes.addEventListener('input', () => {
    notesSaveStatus.textContent = 'Alterações pendentes...';
    notesSaveStatus.style.color = 'var(--color-text-secondary)';
    clearTimeout(autoSaveNotesTimeout);
    autoSaveNotesTimeout = setTimeout(saveTechnicalNotes, 2000); // Auto-save notes after 2s idle
  });

  // Danger Zone - Exclusão lógica
  deleteCustomerBtn.addEventListener('click', openDeleteModal);
  closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  confirmDeleteBtn.addEventListener('click', handleLogicalDelete);

  // ─────────────────────────────────────────────────────────────────────────────
  // Service Fetchers & Renders
  // ─────────────────────────────────────────────────────────────────────────────

  async function fetchCustomerDetails() {
    toggleLoading(true);
    try {
      const response = await fetch(`/api/admin/crm/customers?id=${customerId}`);
      const resData = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error(resData.message || 'Erro ao carregar detalhes do cliente.');
      }

      currentCustomerData = resData.data;
      renderCustomerDetails(currentCustomerData);
    } catch (err) {
      console.error(err);
      showError('Falha no Servidor', err.message);
    } finally {
      toggleLoading(false);
    }
  }

  function renderCustomerDetails(customer) {
    // 1. Header bindings
    headerClientName.textContent = customer.nome;
    headerClientPhoneSub.textContent = `WhatsApp: ${formatPhone(customer.telefone)} ${customer.cpf ? `· CPF: ${formatCpf(customer.cpf)}` : ''}`;
    
    // Quick Contact actions
    contactCallBtn.href = `tel:+55${customer.telefone}`;
    
    const waText = encodeURIComponent(`Olá ${customer.nome.split(' ')[0]}! Aqui é o Iago Lopes da IL Hardware & Tech. Tudo bem? Entro em contato para...`);
    contactWhatsappBtn.href = `https://wa.me/55${customer.telefone}?text=${waText}`;

    // Tags list
    headerClientTags.innerHTML = (customer.tags || []).map(t => `
      <span class="badge badge--brand">${escapeHtml(t)}</span>
    `).join('');

    // 2. Profile input values
    editNome.value = customer.nome;
    editTelefone.value = customer.telefone;
    editEmail.value = customer.email || '';
    editCpf.value = customer.cpf || '';

    const address = customer.endereco || {};
    editLogradouro.value = address.logradouro || '';
    editNumero.value = address.numero || '';
    editComplemento.value = address.complemento || '';
    editBairro.value = address.bairro || '';
    editCidade.value = address.cidade || '';
    editUf.value = address.uf || '';
    editCep.value = address.cep || '';

    editTags.value = (customer.tags || []).join(', ');

    // 3. Technical Notes observations
    clientObservacoes.value = customer.observacoes || '';
    notesSaveStatus.textContent = customer.observacoes ? 'Observações salvas' : 'Sem observações';
    notesSaveStatus.style.color = 'var(--color-text-tertiary)';

    // 4. Leads historical lists
    const leads = customer.leads || [];
    leadsCountBadge.textContent = leads.length;

    if (leads.length === 0) {
      leadsHistoryContainer.innerHTML = `
        <div style="text-align: center; padding: var(--space-4); color: var(--color-text-tertiary); font-size: var(--text-xs);">
          Nenhum orçamento / lead de origem registrado para este cliente.
        </div>
      `;
    } else {
      leadsHistoryContainer.innerHTML = leads.map(lead => {
        const leadDate = new Date(lead.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        return `
          <div class="history-item">
            <div>
              <span style="font-weight: var(--font-semibold); font-size: var(--text-sm); display: block;">
                ${escapeHtml(lead.servico)}
              </span>
              <span style="font-size: var(--text-xs); color: var(--color-text-tertiary);">
                Enviado em ${leadDate} · Status: ${formatLeadStatus(lead.status)}
              </span>
            </div>
            <a href="/admin/leads" class="btn btn--secondary btn--sm" style="min-height: 28px; padding: 2px 8px; font-size: 11px; text-decoration: none;">Ver Leads</a>
          </div>
        `;
      }).join('');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const saveBtn = document.getElementById('save-profile-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Salvando... 🔄</span>';

    // Build Address
    const address = {
      logradouro: editLogradouro.value.trim() || null,
      numero: editNumero.value.trim() || null,
      complemento: editComplemento.value.trim() || null,
      bairro: editBairro.value.trim() || null,
      cidade: editCidade.value.trim() || null,
      uf: editUf.value.trim().toUpperCase() || null,
      cep: editCep.value.replace(/\D/g, '') || null
    };

    // Build Tags array
    const tagsArray = editTags.value.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload = {
      id: customerId,
      nome: editNome.value.trim(),
      telefone: editTelefone.value.trim(),
      email: editEmail.value.trim() || null,
      cpf: editCpf.value.replace(/\D/g, '') || null,
      endereco: Object.values(address).some(v => v !== null) ? address : null,
      tags: tagsArray,
      observacoes: clientObservacoes.value.trim() || null
    };

    try {
      const response = await fetch('/api/admin/crm/customers', {
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
        throw new Error(resData.message || 'Falha ao salvar dados do perfil do cliente.');
      }

      alert('Dados cadastrais atualizados com sucesso!');
      
      // Update local state and refresh headers
      currentCustomerData = resData.data;
      headerClientName.textContent = currentCustomerData.nome;
      headerClientPhoneSub.textContent = `WhatsApp: ${formatPhone(currentCustomerData.telefone)} ${currentCustomerData.cpf ? `· CPF: ${formatCpf(currentCustomerData.cpf)}` : ''}`;
      headerClientTags.innerHTML = (currentCustomerData.tags || []).map(t => `
        <span class="badge badge--brand">${escapeHtml(t)}</span>
      `).join('');
    } catch (err) {
      console.error(err);
      alert(`Falha ao salvar: ${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }

  async function saveTechnicalNotes() {
    if (!currentCustomerData) return;
    clearTimeout(autoSaveNotesTimeout);

    notesSaveStatus.textContent = 'Salvando observações...';
    notesSaveStatus.style.color = 'var(--color-text-secondary)';

    const newObservacoes = clientObservacoes.value;

    try {
      const response = await fetch('/api/admin/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: customerId,
          nome: currentCustomerData.nome,
          telefone: currentCustomerData.telefone,
          observacoes: newObservacoes
        })
      });
      const resData = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) throw new Error(resData.message || 'Erro ao gravar notas no banco.');

      currentCustomerData.observacoes = newObservacoes;
      notesSaveStatus.textContent = 'Observações salvas!';
      notesSaveStatus.style.color = 'var(--color-success)';
    } catch (err) {
      console.error(err);
      notesSaveStatus.textContent = 'Erro ao salvar notas!';
      notesSaveStatus.style.color = 'var(--color-error-text)';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Danger Zone Logical Delete
  // ─────────────────────────────────────────────────────────────────────────────

  function openDeleteModal() {
    if (!currentCustomerData) return;
    deleteClientNameBold.textContent = currentCustomerData.nome;
    deleteModalBackdrop.classList.add('is-open');
  }

  function closeDeleteModal() {
    deleteModalBackdrop.classList.remove('is-open');
  }

  async function handleLogicalDelete() {
    if (!currentCustomerData) return;
    
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.innerHTML = '<span>Excluindo... 🔄</span>';

    try {
      const response = await fetch(`/api/admin/crm/customers?id=${customerId}`, {
        method: 'DELETE'
      });
      const resData = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error(resData.message || 'Erro ao realizar soft delete.');
      }

      alert('Cadastro do cliente excluído logicamente com sucesso!');
      closeDeleteModal();
      window.location.href = '/admin/clientes';
    } catch (err) {
      console.error(err);
      alert(`Falha ao excluir: ${err.message}`);
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.innerHTML = '<span>Sim, Excluir Cadastro</span>';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Display & UI Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  function toggleLoading(show) {
    loadingSection.style.display = show ? 'block' : 'none';
    if (show) {
      errorSection.style.display = 'none';
      contentSection.style.display = 'none';
    } else {
      contentSection.style.display = 'flex';
    }
  }

  function showError(title, desc) {
    loadingSection.style.display = 'none';
    contentSection.style.display = 'none';
    
    errorTitle.textContent = title;
    errorDesc.textContent = desc;
    errorSection.style.display = 'block';
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

  function formatCpf(cpf) {
    if (!cpf) return '-';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
    }
    return cpf;
  }

  function formatLeadStatus(status) {
    const map = {
      'novo': 'Novo',
      'contatado': 'Contatado',
      'orcamento_enviado': 'Orçamento Enviado',
      'convertido': 'Convertido ✅',
      'perdido': 'Perdido ❌'
    };
    return map[status] || status;
  }
});
