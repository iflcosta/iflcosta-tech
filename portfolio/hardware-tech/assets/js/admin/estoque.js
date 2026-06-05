// /assets/js/admin/estoque.js
// Vanilla JS Module — Catálogo de Estoque e Movimentações (Feature 007)

document.addEventListener('DOMContentLoaded', () => {
  // ── DOM: listagem ──
  const searchInput = document.getElementById('prod-search');
  const categoriaFilter = document.getElementById('prod-categoria-filter');
  const baixoFilter = document.getElementById('prod-baixo-filter');

  const loadingState = document.getElementById('prod-loading');
  const emptyState = document.getElementById('prod-empty');
  const resultsWrap = document.getElementById('prod-results');
  const tableBody = document.getElementById('prod-table-body');
  const gridContainer = document.getElementById('prod-grid-container');

  const statTotal = document.getElementById('stat-total');
  const statCusto = document.getElementById('stat-custo');
  const statVenda = document.getElementById('stat-venda');
  const statBaixo = document.getElementById('stat-baixo');

  const addProductBtn = document.getElementById('add-product-btn');
  const addMovementBtn = document.getElementById('add-movement-btn');

  // ── DOM: modal de produto ──
  const productBackdrop = document.getElementById('product-modal-backdrop');
  const productForm = document.getElementById('product-form');
  const productModalTitle = document.getElementById('product-modal-title');
  const productModalClose = document.getElementById('product-modal-close');
  const productCancelBtn = document.getElementById('product-cancel-btn');
  const productDeleteBtn = document.getElementById('product-delete-btn');
  const productSubmitText = document.getElementById('product-submit-text');
  const productFeedback = document.getElementById('product-feedback');
  const fNome = document.getElementById('product-nome');
  const fCategoria = document.getElementById('product-categoria');
  const fSubcategoria = document.getElementById('product-subcategoria');
  const fMarca = document.getElementById('product-marca');
  const fModelo = document.getElementById('product-modelo');
  const fSku = document.getElementById('product-sku');
  const fCusto = document.getElementById('product-custo');
  const fVenda = document.getElementById('product-venda');
  const fQtyMin = document.getElementById('product-qtymin');
  const fFornNome = document.getElementById('product-forn-nome');
  const fFornTel = document.getElementById('product-forn-tel');

  // ── DOM: modal de movimentação ──
  const movementBackdrop = document.getElementById('movement-modal-backdrop');
  const movementForm = document.getElementById('movement-form');
  const movementModalClose = document.getElementById('movement-modal-close');
  const movementCancelBtn = document.getElementById('movement-cancel-btn');
  const movementSubmitText = document.getElementById('movement-submit-text');
  const movementFeedback = document.getElementById('movement-feedback');
  const mProduto = document.getElementById('movement-produto');
  const mTipo = document.getElementById('movement-tipo');
  const mQty = document.getElementById('movement-qty');
  const mCusto = document.getElementById('movement-custo');
  const mNf = document.getElementById('movement-nf');
  const mNfField = document.getElementById('movement-nf-field');
  const mObs = document.getElementById('movement-obs');
  const mHint = document.getElementById('movement-hint');

  const CATEGORIA_LABELS = { 'peça': 'Peça', 'acessório': 'Acessório', 'componente_pc': 'Componente PC' };

  let productsList = [];
  let editingId = null;

  fetchProducts();

  // ── Listeners ──
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderList, 250);
  });
  categoriaFilter.addEventListener('change', renderList);
  baixoFilter.addEventListener('change', renderList);

  addProductBtn.addEventListener('click', () => openProductModal(null));
  addMovementBtn.addEventListener('click', () => openMovementModal(null, 'entrada'));

  productModalClose.addEventListener('click', closeProductModal);
  productCancelBtn.addEventListener('click', closeProductModal);
  productForm.addEventListener('submit', handleProductSubmit);
  productDeleteBtn.addEventListener('click', handleProductDelete);
  productBackdrop.addEventListener('click', (e) => { if (e.target === productBackdrop) closeProductModal(); });

  movementModalClose.addEventListener('click', closeMovementModal);
  movementCancelBtn.addEventListener('click', closeMovementModal);
  movementForm.addEventListener('submit', handleMovementSubmit);
  movementBackdrop.addEventListener('click', (e) => { if (e.target === movementBackdrop) closeMovementModal(); });
  mTipo.addEventListener('change', syncMovementType);

  // ───────────────────────────────────────────────────────────
  // Dados
  // ───────────────────────────────────────────────────────────
  async function fetchProducts() {
    toggleLoading(true);
    try {
      const response = await fetch('/api/admin/inventory/products?limit=200');
      if (response.status === 401) { window.location.href = "../../../admin/login'; return; }
      if (!response.ok) throw new Error('Falha no GET de produtos');
      const resData = await response.json();
      productsList = resData.data || [];
    } catch (err) {
      console.error('Erro ao carregar produtos da API:', err);
      productsList = [];
    } finally {
      renderList();
      toggleLoading(false);
    }
  }

  function renderList() {
    const searchVal = searchInput.value.trim().toLowerCase();
    const catVal = categoriaFilter.value;
    const onlyBaixo = baixoFilter.checked;

    const filtered = productsList.filter(p => {
      const matchesSearch = !searchVal ||
        (p.nome && p.nome.toLowerCase().includes(searchVal)) ||
        (p.sku && p.sku.toLowerCase().includes(searchVal)) ||
        (p.marca && p.marca.toLowerCase().includes(searchVal)) ||
        (p.modelo && p.modelo.toLowerCase().includes(searchVal));
      const matchesCat = !catVal || p.categoria === catVal;
      const matchesBaixo = !onlyBaixo || isAlerta(p);
      return matchesSearch && matchesCat && matchesBaixo;
    });

    renderStats(productsList);

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      resultsWrap.style.display = 'none';
      return;
    }
    emptyState.style.display = 'none';
    resultsWrap.style.display = 'block';

    filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

    tableBody.innerHTML = filtered.map(rowHtml).join('');
    gridContainer.innerHTML = filtered.map(cardHtml).join('');

    document.querySelectorAll('[data-prod-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-mov-btn]')) return;
        const prod = productsList.find(p => String(p.id) === String(el.getAttribute('data-prod-id')));
        if (prod) openProductModal(prod);
      });
    });
    document.querySelectorAll('[data-mov-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMovementModal(btn.getAttribute('data-mov-btn'), 'entrada');
      });
    });
  }

  function renderStats(list) {
    statTotal.textContent = list.length;
    const custo = list.reduce((s, p) => s + qtyOf(p) * (Number(p.custo_atual) || 0), 0);
    const venda = list.reduce((s, p) => s + qtyOf(p) * (Number(p.preco_venda) || 0), 0);
    statCusto.textContent = formatBRL(custo);
    statVenda.textContent = formatBRL(venda);
    statBaixo.textContent = list.filter(isAlerta).length;
  }

  function rowHtml(p) {
    const forn = p.fornecedor && p.fornecedor.nome ? escapeHtml(p.fornecedor.nome) : '—';
    const sub = [p.marca, p.modelo].filter(Boolean).map(escapeHtml).join(' · ')
      || (p.sku ? 'SKU ' + escapeHtml(p.sku) : '—');
    return `
      <tr data-prod-id="${escapeHtml(p.id)}" class="${isAlerta(p) ? 'prod-row-alerta' : ''}">
        <td style="font-weight: var(--font-semibold);">
          ${escapeHtml(p.nome)}
          <span style="display:block; font-size:10px; color:var(--color-text-tertiary); font-weight:normal; margin-top:2px;">${sub}</span>
        </td>
        <td><span class="categoria-pill">${CATEGORIA_LABELS[p.categoria] || escapeHtml(p.categoria)}</span></td>
        <td>
          ${formatBRL(p.custo_atual)}
          <span style="display:block; font-size:10px; color:var(--color-success); margin-top:2px;">Venda: ${formatBRL(p.preco_venda)}</span>
        </td>
        <td>${stockBadge(p)}</td>
        <td style="color: var(--color-text-secondary);">${forn}</td>
        <td><button type="button" class="icon-btn" data-mov-btn="${escapeHtml(p.id)}">Movimentar</button></td>
      </tr>`;
  }

  function cardHtml(p) {
    const forn = p.fornecedor && p.fornecedor.nome ? escapeHtml(p.fornecedor.nome) : '—';
    const sub = [p.marca, p.modelo].filter(Boolean).map(escapeHtml).join(' · ') || '—';
    return `
      <div class="prod-card ${isAlerta(p) ? 'prod-row-alerta' : ''}" data-prod-id="${escapeHtml(p.id)}">
        <div class="prod-card-header">
          <div>
            <h3 class="prod-card-title">${escapeHtml(p.nome)}</h3>
            <div class="prod-card-meta">${sub}</div>
          </div>
          ${stockBadge(p)}
        </div>
        <div class="prod-card-body">
          <span><span class="categoria-pill">${CATEGORIA_LABELS[p.categoria] || escapeHtml(p.categoria)}</span></span>
          <span>Custo ${formatBRL(p.custo_atual)} · Venda <strong style="color:var(--color-text-primary);">${formatBRL(p.preco_venda)}</strong></span>
          <span style="font-size:var(--text-xs); color:var(--color-text-tertiary);">Fornecedor: ${forn}</span>
        </div>
        <div class="prod-card-footer">
          <span style="font-size:var(--text-xs); color:var(--color-text-secondary);">Toque para editar</span>
          <button type="button" class="icon-btn" data-mov-btn="${escapeHtml(p.id)}">📥 Movimentar</button>
        </div>
      </div>`;
  }

  // ───────────────────────────────────────────────────────────
  // Modal de produto
  // ───────────────────────────────────────────────────────────
  function openProductModal(product) {
    productFeedback.style.display = 'none';
    if (product) {
      editingId = product.id;
      productModalTitle.textContent = 'Editar Produto';
      productSubmitText.textContent = 'Salvar Alterações';
      productDeleteBtn.style.display = 'inline-flex';
      fNome.value = product.nome || '';
      fCategoria.value = product.categoria || 'peça';
      fSubcategoria.value = product.subcategoria || '';
      fMarca.value = product.marca || '';
      fModelo.value = product.modelo || '';
      fSku.value = product.sku || '';
      fCusto.value = product.custo_atual != null ? product.custo_atual : '';
      fVenda.value = product.preco_venda != null ? product.preco_venda : '';
      fQtyMin.value = product.qty_minima != null ? product.qty_minima : '';
      fFornNome.value = (product.fornecedor && product.fornecedor.nome) || '';
      fFornTel.value = (product.fornecedor && product.fornecedor.telefone) || '';
    } else {
      editingId = null;
      productModalTitle.textContent = 'Novo Produto';
      productSubmitText.textContent = 'Cadastrar Produto';
      productDeleteBtn.style.display = 'none';
      productForm.reset();
      fCategoria.value = 'peça';
    }
    productBackdrop.classList.add('is-open');
  }

  function closeProductModal() {
    productBackdrop.classList.remove('is-open');
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    productFeedback.style.display = 'none';

    const nome = fNome.value.trim();
    if (nome.length < 2) {
      showFeedback(productFeedback, 'Informe um nome com ao menos 2 caracteres.');
      return;
    }

    const payload = {
      nome,
      categoria: fCategoria.value,
      subcategoria: fSubcategoria.value.trim() || null,
      marca: fMarca.value.trim() || null,
      modelo: fModelo.value.trim() || null,
      sku: fSku.value.trim() || null,
      custo_atual: parseFloat(fCusto.value) || 0,
      preco_venda: parseFloat(fVenda.value) || 0,
      qty_minima: parseInt(fQtyMin.value) || 0,
      fornecedor: buildFornecedor(),
    };

    const isEdit = !!editingId;
    const submitBtn = productForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    productSubmitText.textContent = 'Salvando...';

    try {
      let response;
      try {
        response = await fetch('/api/admin/inventory/products', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isEdit ? { id: editingId, ...payload } : payload)
        });
      } catch (netErr) {
        throw netErr;
      }
      if (response.status === 401) { window.location.href = "../../../admin/login'; return; }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        showFeedback(productFeedback, errData.message || 'Erro ao salvar produto.');
        return;
      }
      const resData = await response.json();
      upsertLocal(resData.data);
      closeProductModal();
      renderList();
    } finally {
      submitBtn.disabled = false;
      productSubmitText.textContent = isEdit ? 'Salvar Alterações' : 'Cadastrar Produto';
    }
  }

  async function handleProductDelete() {
    if (!editingId) return;
    if (!confirm('Excluir este produto do catálogo?')) return;

    try {
      let response;
      try {
        response = await fetch(`/api/admin/inventory/products?id=${encodeURIComponent(editingId)}`, { method: 'DELETE' });
      } catch (netErr) {
        throw netErr;
      }
      if (response.status === 401) { window.location.href = "../../../admin/login'; return; }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        showFeedback(productFeedback, errData.message || 'Erro ao excluir produto.');
        return;
      }
      productsList = productsList.filter(p => String(p.id) !== String(editingId));
      closeProductModal();
      renderList();
    } catch (err) {
      showFeedback(productFeedback, 'Erro ao excluir produto.');
    }
  }

  // ───────────────────────────────────────────────────────────
  // Modal de movimentação
  // ───────────────────────────────────────────────────────────
  function openMovementModal(productId, tipo) {
    movementFeedback.style.display = 'none';
    movementForm.reset();
    populateMovementProducts();
    mTipo.value = tipo || 'entrada';
    if (productId) mProduto.value = String(productId);
    syncMovementType();
    movementBackdrop.classList.add('is-open');
  }

  function closeMovementModal() {
    movementBackdrop.classList.remove('is-open');
  }

  function populateMovementProducts() {
    const opts = productsList
      .slice()
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
      .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nome)}${p.marca ? ' — ' + escapeHtml(p.marca) : ''}</option>`)
      .join('');
    mProduto.innerHTML = '<option value="">Selecione o produto...</option>' + opts;
  }

  function syncMovementType() {
    const isEntrada = mTipo.value === 'entrada';
    mNfField.style.display = isEntrada ? '' : 'none';
    mHint.textContent = isEntrada
      ? 'Entradas somam ao estoque (compra, reposição).'
      : 'Ajustes/baixas subtraem do estoque (perda, quebra, contagem).';
  }

  async function handleMovementSubmit(e) {
    e.preventDefault();
    movementFeedback.style.display = 'none';

    const productId = mProduto.value;
    if (!productId) { showFeedback(movementFeedback, 'Selecione um produto.'); return; }

    const qty = parseInt(mQty.value);
    if (isNaN(qty) || qty <= 0) { showFeedback(movementFeedback, 'A quantidade deve ser maior que zero.'); return; }

    const payload = {
      product_id: productId,
      tipo: mTipo.value,
      qty,
      nf: mNf.value.trim() || null,
      observacao: mObs.value.trim() || null,
    };
    if (mCusto.value !== '') payload.custo_unitario = parseFloat(mCusto.value);

    const submitBtn = movementForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    movementSubmitText.textContent = 'Registrando...';

    try {
      let response;
      try {
        response = await fetch('/api/admin/inventory/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (netErr) {
        throw netErr;
      }
      if (response.status === 401) { window.location.href = "../../../admin/login'; return; }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        showFeedback(movementFeedback, errData.message || 'Erro ao registrar movimentação.');
        return;
      }
      const resData = await response.json();
      if (resData.data && resData.data.products) {
        const prod = productsList.find(p => String(p.id) === String(resData.data.products.id));
        if (prod) Object.assign(prod, resData.data.products);
      }
      closeMovementModal();
      renderList();
    } finally {
      submitBtn.disabled = false;
      movementSubmitText.textContent = 'Registrar';
    }
  }

  // ───────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────
  function qtyOf(p) { return Number(p.qty_atual) || 0; }

  function isAlerta(p) {
    const min = Number(p.qty_minima) || 0;
    return min > 0 && qtyOf(p) <= min;
  }

  function stockBadge(p) {
    const qty = qtyOf(p);
    if (isAlerta(p)) return `<span class="badge-stock badge-stock--baixo">⚠ ${qty} un · baixo</span>`;
    if (qty <= 0) return `<span class="badge-stock badge-stock--zero">sem estoque</span>`;
    return `<span class="badge-stock badge-stock--ok">${qty} un</span>`;
  }

  function buildFornecedor() {
    const f = {};
    const nome = fFornNome.value.trim();
    const tel = fFornTel.value.trim();
    if (nome) f.nome = nome;
    if (tel) f.telefone = tel;
    return f;
  }

  function upsertLocal(product) {
    if (!product) return;
    const idx = productsList.findIndex(p => String(p.id) === String(product.id));
    if (idx >= 0) productsList[idx] = { ...productsList[idx], ...product };
    else productsList.push(product);
  }




  function toggleLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
      emptyState.style.display = 'none';
      resultsWrap.style.display = 'none';
    }
  }

  function showFeedback(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
  }

  function formatBRL(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function escapeHtml(text) {
    if (text == null) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

});
