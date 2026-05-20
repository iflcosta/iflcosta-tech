// /assets/js/admin/clientes.js
// Vanilla JS Module — Customers Dashboard Interaction (Feature 005)

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('customer-search');
  const tagFilter = document.getElementById('customer-tag-filter');
  
  const loadingState = document.getElementById('clientes-loading');
  const emptyState = document.getElementById('clientes-empty');
  const tableContainer = document.getElementById('clientes-table-container');
  const tableBody = document.getElementById('clientes-table-body');
  const gridContainer = document.getElementById('clientes-grid-container');

  const addCustomerBtn = document.getElementById('add-customer-btn');

  // Modal Elements
  const modalBackdrop = document.getElementById('customer-modal-backdrop');
  const modalForm = document.getElementById('customer-form');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const modalFeedback = document.getElementById('modal-feedback');
  const modalTitle = document.getElementById('modal-title');
  const submitBtnText = document.getElementById('submit-btn-text');

  // Form Fields
  const custIdInput = document.getElementById('cust-id');
  const custNome = document.getElementById('cust-nome');
  const custTelefone = document.getElementById('cust-telefone');
  const custEmail = document.getElementById('cust-email');
  const custCpf = document.getElementById('cust-cpf');
  const custLogradouro = document.getElementById('cust-logradouro');
  const custNumero = document.getElementById('cust-numero');
  const custComplemento = document.getElementById('cust-complemento');
  const custBairro = document.getElementById('cust-bairro');
  const custCidade = document.getElementById('cust-cidade');
  const custUf = document.getElementById('cust-uf');
  const custCep = document.getElementById('cust-cep');
  const custTags = document.getElementById('cust-tags');
  const custObservacoes = document.getElementById('cust-observacoes');

  let customersList = [];

  // 1. Initial Load & Setup
  fetchCustomers();

  // Filters Event Listeners
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchCustomers, 400); // Debounce search
  });
  tagFilter.addEventListener('change', fetchCustomers);

  // Modal Actions
  addCustomerBtn.addEventListener('click', () => openCustomerModal());
  closeModalBtn.addEventListener('click', closeCustomerModal);
  cancelModalBtn.addEventListener('click', closeCustomerModal);
  modalForm.addEventListener('submit', handleCustomerSubmit);

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Functions
  // ─────────────────────────────────────────────────────────────────────────────

  async function fetchCustomers() {
    toggleLoading(true);

    const searchVal = searchInput.value.trim();
    const tagVal = tagFilter.value;

    const queryParams = new URLSearchParams();
    if (searchVal) queryParams.set('search', searchVal);
    if (tagVal) queryParams.set('tag', tagVal);

    try {
      const response = await fetch(`/api/admin/crm/customers?${queryParams.toString()}`);
      const resData = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) throw new Error(resData.message || 'Erro ao carregar clientes.');

      customersList = resData.data || [];
      renderCustomers(customersList);
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-error-text);">Erro ao carregar clientes: ${err.message}</td></tr>`;
      gridContainer.innerHTML = `<div style="text-align: center; color: var(--color-error-text); padding: var(--space-4);">Erro ao carregar clientes: ${err.message}</div>`;
    } finally {
      toggleLoading(false);
    }
  }

  function renderCustomers(customers) {
    if (customers.length === 0) {
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
    tableBody.innerHTML = customers.map(customer => {
      const addressStr = formatShortAddress(customer.endereco);
      const tagsStr = (customer.tags || []).map(t => `<span class="badge badge--sm badge--secondary">${escapeHtml(t)}</span>`).join(' ');

      return `
        <tr data-customer-id="${customer.id}">
          <td style="font-weight: var(--font-semibold);">${escapeHtml(customer.nome)}</td>
          <td>${formatPhone(customer.telefone)}</td>
          <td style="color: var(--color-text-secondary); font-size: var(--text-sm);">${escapeHtml(customer.email || '-')}</td>
          <td>${formatCpf(customer.cpf)}</td>
          <td style="color: var(--color-text-tertiary);">${addressStr}</td>
          <td><div class="cliente-tags-list">${tagsStr}</div></td>
        </tr>
      `;
    }).join('');

    // Render Grid Cards for Mobile
    gridContainer.innerHTML = customers.map(customer => {
      const tagsStr = (customer.tags || []).map(t => `<span class="badge badge--sm badge--secondary">${escapeHtml(t)}</span>`).join(' ');
      const addressStr = formatShortAddress(customer.endereco);

      return `
        <div class="cliente-card" data-customer-id="${customer.id}">
          <div class="cliente-card-header">
            <div>
              <h3 class="cliente-card-title">${escapeHtml(customer.nome)}</h3>
              <span style="font-size: var(--text-xs); color: var(--color-text-tertiary); display: block; margin-top: 2px;">
                ${formatPhone(customer.telefone)}
              </span>
            </div>
          </div>
          <div style="font-size: var(--text-sm); color: var(--color-text-secondary); display: flex; flex-direction: column; gap: 2px;">
            <span>E-mail: ${escapeHtml(customer.email || 'Não informado')}</span>
            <span>Região: ${addressStr}</span>
          </div>
          <div class="cliente-tags-list" style="border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-2); margin-top: var(--space-1);">
            ${tagsStr || '<span style="font-size: var(--text-xs); color: var(--color-text-tertiary);">Sem tags</span>'}
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    document.querySelectorAll('[data-customer-id]').forEach(element => {
      element.addEventListener('click', () => {
        const customerId = element.getAttribute('data-customer-id');
        window.location.href = `/admin/clientes/detalhes?id=${customerId}`;
      });
    });
  }

  function openCustomerModal(customer = null) {
    modalFeedback.style.display = 'none';

    if (customer) {
      modalTitle.textContent = 'Editar Cliente';
      submitBtnText.textContent = 'Salvar Alterações';
      
      // Fill Form Fields
      custIdInput.value = customer.id;
      custNome.value = customer.nome;
      custTelefone.value = customer.telefone;
      custEmail.value = customer.email || '';
      custCpf.value = customer.cpf || '';
      
      const addr = customer.endereco || {};
      custLogradouro.value = addr.logradouro || '';
      custNumero.value = addr.numero || '';
      custComplemento.value = addr.complemento || '';
      custBairro.value = addr.bairro || '';
      custCidade.value = addr.cidade || '';
      custUf.value = addr.uf || '';
      custCep.value = addr.cep || '';

      custTags.value = (customer.tags || []).join(', ');
      custObservacoes.value = customer.observacoes || '';
    } else {
      modalTitle.textContent = 'Novo Cliente';
      submitBtnText.textContent = 'Criar Cliente';
      
      // Clear Form Fields
      custIdInput.value = '';
      custNome.value = '';
      custTelefone.value = '';
      custEmail.value = '';
      custCpf.value = '';
      
      custLogradouro.value = '';
      custNumero.value = '';
      custComplemento.value = '';
      custBairro.value = '';
      custCidade.value = '';
      custUf.value = '';
      custCep.value = '';

      custTags.value = '';
      custObservacoes.value = '';
    }

    modalBackdrop.classList.add('open');
  }

  function closeCustomerModal() {
    modalBackdrop.classList.remove('open');
  }

  async function handleCustomerSubmit(e) {
    e.preventDefault();
    modalFeedback.style.display = 'none';

    const submitBtn = document.getElementById('submit-modal-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Salvando... 🔄</span>';

    // Address construction
    const address = {
      logradouro: custLogradouro.value.trim() || null,
      numero: custNumero.value.trim() || null,
      complemento: custComplemento.value.trim() || null,
      bairro: custBairro.value.trim() || null,
      cidade: custCidade.value.trim() || null,
      uf: custUf.value.trim().toUpperCase() || null,
      cep: custCep.value.replace(/\D/g, '') || null
    };

    // Parse Tags
    const tagsArray = custTags.value.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload = {
      nome: custNome.value.trim(),
      telefone: custTelefone.value.trim(),
      email: custEmail.value.trim() || null,
      cpf: custCpf.value.replace(/\D/g, '') || null,
      endereco: Object.values(address).some(v => v !== null) ? address : null,
      tags: tagsArray,
      observacoes: custObservacoes.value.trim() || null
    };

    const id = custIdInput.value;
    if (id) payload.id = id;

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
        throw new Error(resData.message || 'Falha ao salvar cliente.');
      }

      closeCustomerModal();
      fetchCustomers(); // Refresh grid/table

      // If it is a new client, we can redirect or show success
      if (!id) {
        alert('Cliente criado com sucesso!');
        // Redirect directly to details sheet
        window.location.href = `/admin/clientes/detalhes?id=${resData.data.id}`;
      } else {
        alert('Dados do cliente salvos!');
      }
    } catch (err) {
      console.error(err);
      modalFeedback.textContent = err.message;
      modalFeedback.style.display = 'block';
    } finally {
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

  function formatCpf(cpf) {
    if (!cpf) return '-';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
    }
    return cpf;
  }

  function formatShortAddress(endereco) {
    if (!endereco) return 'Não cadastrado';
    const { cidade, uf } = endereco;
    if (cidade && uf) return `${cidade} - ${uf}`;
    if (cidade) return cidade;
    return 'Não informado';
  }
});
