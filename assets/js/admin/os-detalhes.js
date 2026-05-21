// /assets/js/admin/os-detalhes.js
// Vanilla JS Module — OS Detailed Ficha & State Transition Management (Feature 006)

document.addEventListener('DOMContentLoaded', () => {
  // Parse OS ID from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const osId = urlParams.get('id');

  if (!osId) {
    alert('Erro: ID da Ordem de Serviço não fornecido.');
    window.location.href = '/admin/os';
    return;
  }

  // DOM Elements
  const loadingState = document.getElementById('os-details-loading');
  const detailsContent = document.getElementById('os-details-content');
  const osTitleNumber = document.getElementById('os-title-number');
  const osHeaderStatusBadge = document.getElementById('os-header-status-badge');
  const osCustomerLink = document.getElementById('os-customer-link');
  const osDeviceSummary = document.getElementById('os-device-summary');

  // Forms and details inputs
  const detEquipTipo = document.getElementById('det-equip-tipo');
  const detEquipMarca = document.getElementById('det-equip-marca');
  const detEquipModelo = document.getElementById('det-equip-modelo');
  const detEquipSerial = document.getElementById('det-equip-serial');
  const detProblema = document.getElementById('det-problema');
  const detLaudo = document.getElementById('det-laudo');

  // Checklist
  const checklistContainer = document.getElementById('checklist-items');
  const btnAddChecklist = document.getElementById('btn-add-checklist');

  // Photos
  const btnUploadPhoto = document.getElementById('btn-upload-photo');
  const photoFileInput = document.getElementById('photo-file-input');
  const photoUploadSelector = document.getElementById('photo-upload-selector');
  const photoTypeSelect = document.getElementById('photo-type');
  const btnConfirmUpload = document.getElementById('btn-confirm-upload');
  const btnCancelUpload = document.getElementById('btn-cancel-upload');
  const uploadCompressFeedback = document.getElementById('upload-compress-feedback');
  const photoList = document.getElementById('photo-list');

  // Status transitions
  const detStatusLabelBadge = document.getElementById('os-status-label-badge');
  const detStatusSelect = document.getElementById('det-status-select');
  const detStatusNotes = document.getElementById('det-status-notes');
  const btnSaveStatus = document.getElementById('btn-save-status');

  // Values
  const detValorCobrado = document.getElementById('det-valor-cobrado');
  const detCustoPecas = document.getElementById('det-custo-pecas');
  const detLucroValor = document.getElementById('det-lucro-valor');
  const detLucroMargem = document.getElementById('det-lucro-margem');
  const detFormaPagamento = document.getElementById('det-forma-pagamento');
  const detIsCustomPc = document.getElementById('det-is-custom-pc');
  const detPaymentStatus = document.getElementById('det-payment-status');
  const detStatusPublicNotes = document.getElementById('det-status-public-notes');

  // Deadlines and warranties
  const detPrazoPrometido = document.getElementById('det-prazo-prometido');
  const detGarantiaDias = document.getElementById('det-garantia-dias');
  const detGarantiaAte = document.getElementById('det-garantia-ate');

  // Action Buttons
  const btnSaveAll = document.getElementById('btn-save-all');
  const btnPrint = document.getElementById('btn-print');
  const btnWhatsapp = document.getElementById('btn-whatsapp');

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  // Peças de Reposição (T008)
  const partSearchInput = document.getElementById('part-search-input');
  const btnAddPart = document.getElementById('btn-add-part');
  const partSearchResults = document.getElementById('part-search-results');
  const partsConsumedList = document.getElementById('parts-consumed-list');
  let selectedPart = null;
  let osMovements = [];

  let currentOS = null;
  let osHistory = [];
  let currentFileToUpload = null;

  // 1. Load OS Data
  loadOSDetails();

  // 2. Setup Event Listeners
  detValorCobrado.addEventListener('input', calculateProfitMargin);
  detCustoPecas.addEventListener('input', calculateProfitMargin);
  detGarantiaDias.addEventListener('input', calculateWarrantyExpiry);

  // Checklist Actions
  btnAddChecklist.addEventListener('click', handleAddChecklistItem);

  // Image Upload Flows
  btnUploadPhoto.addEventListener('click', () => photoFileInput.click());
  photoFileInput.addEventListener('change', handleFileSelected);
  btnCancelUpload.addEventListener('click', cancelPhotoUpload);
  btnConfirmUpload.addEventListener('click', executePhotoUpload);

  // Lightbox actions
  lightboxClose.addEventListener('click', () => lightbox.classList.remove('open'));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('open');
  });

  // Action Bar Triggers
  btnSaveAll.addEventListener('click', saveAllOSChanges);
  btnSaveStatus.addEventListener('click', saveStatusTransition);
  btnPrint.addEventListener('click', () => window.print());
  btnWhatsapp.addEventListener('click', triggerWhatsAppMessage);

  // Peças de Reposição (T008)
  let partSearchTimeout = null;
  partSearchInput.addEventListener('input', () => {
    clearTimeout(partSearchTimeout);
    partSearchTimeout = setTimeout(handlePartSearch, 250);
  });
  btnAddPart.addEventListener('click', handleAddPartToOS);

  // Fechar autocomplete ao clicar fora
  document.addEventListener('click', (e) => {
    if (e.target !== partSearchInput && e.target !== partSearchResults) {
      partSearchResults.style.display = 'none';
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Loading Logic
  // ─────────────────────────────────────────────────────────────────────────────

  async function loadOSDetails() {
    loadingState.style.display = 'block';
    detailsContent.style.display = 'none';

    try {
      // Tenta buscar da API
      const response = await fetch(`/api/admin/os?id=${osId}`);
      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (response.ok) {
        const resData = await response.json();
        currentOS = resData.data;
        if (currentOS) {
          currentOS.customer_name = currentOS.customer_name || (currentOS.customers ? currentOS.customers.nome : '');
          currentOS.customer_phone = currentOS.customer_phone || (currentOS.customers ? currentOS.customers.telefone : '');
          currentOS.customer_email = currentOS.customer_email || (currentOS.customers ? currentOS.customers.email : '');
        }
      } else {
        throw new Error('Falha no GET');
      }
    } catch (err) {
      console.log('Buscando dados locais do localStorage para a OS:', osId);
      const stored = localStorage.getItem('iflcosta_os_list');
      const list = stored ? JSON.parse(stored) : [];
      currentOS = list.find(o => o.id === osId);
    }

    if (!currentOS) {
      alert('Ordem de Serviço não encontrada.');
      window.location.href = '/admin/os';
      return;
    }

    // Carrega o histórico de status da OS
    loadStatusHistory();

    // Preenche as informações na tela
    renderOSDetails();

    // Carrega peças vinculadas à OS (T008)
    await loadOSParts();
    
    loadingState.style.display = 'none';
    detailsContent.style.display = 'grid';
  }

  function loadStatusHistory() {
    const historyKey = `iflcosta_os_history_${currentOS.id}`;
    const stored = localStorage.getItem(historyKey);
    osHistory = stored ? JSON.parse(stored) : [];
    if (osHistory.length === 0) {
      // Cria histórico inicial se não houver
      osHistory = [
        {
          id: 'hist-init',
          os_id: currentOS.id,
          status: currentOS.status,
          entered_at: currentOS.created_at || new Date().toISOString(),
          exited_at: null
        }
      ];
      localStorage.setItem(historyKey, JSON.stringify(osHistory));
    }
  }

  function renderOSDetails() {
    // Header
    osTitleNumber.textContent = `Ordem de Serviço #${currentOS.os_number}`;
    osCustomerLink.textContent = escapeHtml(currentOS.customer_name);
    osCustomerLink.href = `/admin/clientes/detalhes?id=${currentOS.customer_id}`;
    
    const deviceStr = `${currentOS.equipamento.marca} ${currentOS.equipamento.modelo}`;
    osDeviceSummary.textContent = deviceStr;

    // Badges Status
    const statusBadgeHtml = getStatusBadgeHtml(currentOS.status);
    osHeaderStatusBadge.innerHTML = statusBadgeHtml;
    detStatusLabelBadge.innerHTML = statusBadgeHtml;
    
    // Altera cores do banner conforme o status
    const osStatusBannerCard = document.getElementById('os-status-banner-card');
    osStatusBannerCard.className = `status-banner badge-os--${currentOS.status}`;

    // Equipamento Inputs
    detEquipTipo.value = currentOS.equipamento.tipo;
    detEquipMarca.value = currentOS.equipamento.marca;
    detEquipModelo.value = currentOS.equipamento.modelo;
    detEquipSerial.value = currentOS.equipamento.serial || '';

    // Defeito e Laudo
    detProblema.value = currentOS.problema_reportado;
    detLaudo.value = currentOS.laudo || '';

    // Valores
    detValorCobrado.value = currentOS.valor_cobrado || '';
    detCustoPecas.value = currentOS.valor_custo_peças || '';
    detFormaPagamento.value = currentOS.forma_pagamento || '';
    
    if (detIsCustomPc) detIsCustomPc.checked = currentOS.is_custom_pc || false;
    if (detPaymentStatus) detPaymentStatus.value = currentOS.payment_status || 'pendente';

    // Prazos e Garantias
    detPrazoPrometido.value = currentOS.prazo_prometido;
    detGarantiaDias.value = currentOS.garantia_dias !== undefined ? currentOS.garantia_dias : 90;

    // Código de garantia digital (read-only)
    const warrantyCodeEl = document.getElementById('det-warranty-code');
    if (warrantyCodeEl) {
      warrantyCodeEl.value = currentOS.digital_warranty_code || '—';
    }
    const btnCopyWarranty = document.getElementById('btn-copy-warranty-code');
    if (btnCopyWarranty && currentOS.digital_warranty_code) {
      btnCopyWarranty.onclick = () => {
        navigator.clipboard.writeText(currentOS.digital_warranty_code).then(() => {
          btnCopyWarranty.textContent = '✅';
          setTimeout(() => { btnCopyWarranty.textContent = '📋'; }, 1500);
        });
      };
    }

    // Calcular Lucro e Expiração de Garantia
    calculateProfitMargin();
    calculateWarrantyExpiry();

    // Renderiza Checklist
    renderChecklist();

    // Renderiza Fotos
    renderPhotos();

    // Renderiza Status Transitions Dropdown
    renderStatusTransitionsDropdown();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Status Transitions Logic (Máquina de Estados)
  // ─────────────────────────────────────────────────────────────────────────────

  // Define os caminhos válidos da máquina de estados
  function renderStatusTransitionsDropdown() {
    const transitions = {
      rascunho: ['diagnóstico', 'cancelado'],
      diagnóstico: ['aguardando_aprovação', 'cancelado'],
      aguardando_aprovação: ['aprovado', 'cliente_desistiu', 'cancelado'],
      aprovado: ['aguardando_peça', 'em_conserto', 'cancelado'],
      aguardando_peça: ['em_conserto', 'cancelado'],
      em_conserto: ['pronto', 'cancelado'],
      pronto: ['entregue', 'cancelado'],
      entregue: ['diagnóstico'], // Permite reabrir diagnóstico se voltar em garantia
      cancelado: ['diagnóstico'],
      cliente_desistiu: ['diagnóstico']
    };

    const allowed = transitions[currentOS.status] || ['diagnóstico'];
    
    const labelMap = {
      rascunho: 'Rascunho (Inicial)',
      diagnóstico: 'Em Diagnóstico Técnico 🔍',
      aguardando_aprovação: 'Aguardando Aprovação do Orçamento ⏳',
      aprovado: 'Orçamento Aprovado 🛠️',
      aguardando_peça: 'Aguardando Chegada de Peça 📦',
      em_conserto: 'Em Manutenção/Bancada ⚙️',
      pronto: 'Reparo Concluído / Pronto! 🎉',
      entregue: 'Aparelho Entregue ao Cliente 🚪',
      cancelado: 'Serviço Cancelado ❌',
      cliente_desistiu: 'Cliente Desistiu (Devolução) 🛑'
    };

    detStatusSelect.innerHTML = '<option value="">Selecione novo status...</option>' + 
      allowed.map(status => `<option value="${status}">${labelMap[status]}</option>`).join('');
    
    detStatusNotes.value = '';
    if (detStatusPublicNotes) detStatusPublicNotes.value = '';
  }

  // Save specific status transition and record in timeline
  async function saveStatusTransition() {
    const nextStatus = detStatusSelect.value;
    const notesText = detStatusNotes.value.trim();
    const publicNotesText = detStatusPublicNotes ? detStatusPublicNotes.value.trim() : '';

    if (!nextStatus) {
      alert('Selecione um status de transição válido.');
      return;
    }

    const previousStatus = currentOS.status;
    currentOS.status = nextStatus;
    
    if (nextStatus === 'entregue' && !currentOS.entregue_at) {
      currentOS.entregue_at = new Date().toISOString();
    }

    // Grava no histórico local
    const historyKey = `iflcosta_os_history_${currentOS.id}`;
    
    // Fechar status anterior
    if (osHistory.length > 0) {
      const last = osHistory[osHistory.length - 1];
      if (!last.exited_at) {
        last.exited_at = new Date().toISOString();
        last.duration_seconds = Math.floor((new Date() - new Date(last.entered_at)) / 1000);
        last.notes = notesText || null;
        last.public_notes = publicNotesText || null;
      }
    }

    // Cria novo status
    osHistory.push({
      id: crypto.randomUUID ? crypto.randomUUID() : 'hist-' + Math.random().toString(36).substring(2, 9),
      os_id: currentOS.id,
      status: nextStatus,
      entered_at: new Date().toISOString(),
      exited_at: null,
      notes: notesText || null,
      public_notes: publicNotesText || null
    });

    localStorage.setItem(historyKey, JSON.stringify(osHistory));

    // Salva a OS localmente
    saveOSDataDirectly();

    // Sincroniza via API
    try {
      const response = await fetch('/api/admin/os/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentOS.id,
          status: nextStatus,
          notes: notesText || null,
          public_notes: publicNotesText || null
        })
      });

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) throw new Error('Falha ao atualizar status na API');

      alert(`Status atualizado com sucesso no servidor e localmente de ${previousStatus.toUpperCase()} para ${nextStatus.toUpperCase()}!`);
    } catch (err) {
      console.warn('Erro ao atualizar status na API, gravado no localStorage de backup.', err);
      alert(`Status atualizado localmente (Modo Offline) de ${previousStatus.toUpperCase()} para ${nextStatus.toUpperCase()}!`);
    }

    // Rerenderiza
    renderOSDetails();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Checklist Management
  // ─────────────────────────────────────────────────────────────────────────────

  function renderChecklist() {
    const items = currentOS.checklist || [];
    if (items.length === 0) {
      checklistContainer.innerHTML = '<p style="font-size: var(--text-xs); color: var(--color-text-tertiary);">Nenhum teste funcional cadastrado para este equipamento.</p>';
      return;
    }

    checklistContainer.innerHTML = items.map((item, index) => {
      const id = `chk-${index}`;
      const checkedAttribute = item.checked ? 'checked' : '';

      return `
        <div class="checklist-item">
          <label for="${id}">
            <input type="checkbox" id="${id}" data-checklist-index="${index}" ${checkedAttribute}>
            <span>${escapeHtml(item.label)}</span>
          </label>
          <button type="button" class="btn-delete-checklist" data-checklist-index="${index}" style="background: none; border: none; color: var(--color-text-tertiary); cursor: pointer; font-size: 11px;" title="Remover teste">✕</button>
        </div>
      `;
    }).join('');

    // Attach checkbox changes
    checklistContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-checklist-index'));
        currentOS.checklist[index].checked = e.target.checked;
        saveOSDataDirectly(); // Auto-save checklist state
      });
    });

    // Attach deletion clicks
    checklistContainer.querySelectorAll('.btn-delete-checklist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.getAttribute('data-checklist-index'));
        currentOS.checklist.splice(index, 1);
        saveOSDataDirectly();
        renderChecklist();
      });
    });
  }

  function handleAddChecklistItem() {
    const name = prompt('Qual o nome do teste funcional a ser adicionado?');
    if (!name || name.trim().length < 2) return;

    if (!currentOS.checklist) currentOS.checklist = [];
    
    currentOS.checklist.push({
      label: name.trim(),
      checked: false
    });

    saveOSDataDirectly();
    renderChecklist();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Financial & Warranty Dynamic Math
  // ─────────────────────────────────────────────────────────────────────────────

  function calculateProfitMargin() {
    const cobrado = parseFloat(detValorCobrado.value) || 0;
    const custo = parseFloat(detCustoPecas.value) || 0;
    
    const lucro = cobrado - custo;
    const margem = cobrado > 0 ? (lucro / cobrado) * 100 : 0;

    detLucroValor.textContent = `R$ ${lucro.toFixed(2)}`;
    detLucroMargem.textContent = `${margem.toFixed(0)}%`;

    // Visual feedback
    if (lucro < 0) {
      detLucroValor.style.color = 'var(--color-danger)';
    } else if (lucro > 0) {
      detLucroValor.style.color = 'var(--color-success)';
    } else {
      detLucroValor.style.color = 'var(--color-text-secondary)';
    }
  }

  function calculateWarrantyExpiry() {
    const dias = parseInt(detGarantiaDias.value) || 0;
    
    if (currentOS.status !== 'entregue' && !currentOS.entregue_at) {
      detGarantiaAte.value = 'Ao entregar o aparelho';
      return;
    }

    const baseDate = currentOS.entregue_at ? new Date(currentOS.entregue_at) : new Date();
    baseDate.setDate(baseDate.getDate() + dias);
    
    detGarantiaAte.value = baseDate.toLocaleDateString('pt-BR');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Compressão Client-side (HTML5 Canvas) & Upload de Fotos
  // ─────────────────────────────────────────────────────────────────────────────

  function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentFileToUpload = file;
    photoUploadSelector.style.display = 'block';
    uploadCompressFeedback.innerHTML = `Imagem selecionada: <b>${file.name}</b> (${(file.size / 1024 / 1024).toFixed(2)} MB)<br>Aguardando compressão...`;
  }

  function cancelPhotoUpload() {
    currentFileToUpload = null;
    photoFileInput.value = '';
    photoUploadSelector.style.display = 'none';
  }

  async function executePhotoUpload() {
    if (!currentFileToUpload) return;

    const btnConfirm = document.getElementById('btn-confirm-upload');
    const originalText = btnConfirm.innerHTML;
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = 'Processando... ⚙️';

    const category = photoTypeSelect.value;

    try {
      // 1. Executa compressão client-side nativa em Canvas
      uploadCompressFeedback.innerHTML = 'Comprimindo imagem com HTML5 Canvas... ⏳';
      const compressedResult = await compressImageNative(currentFileToUpload, 1920, 0.8);

      const ratio = ((1 - compressedResult.compressedSize / compressedResult.originalSize) * 100).toFixed(0);
      uploadCompressFeedback.innerHTML = `✓ Compactado em <b>${ratio}%</b>! Tamanho original: ${(compressedResult.originalSize / 1024).toFixed(0)}KB → Comprimido: ${(compressedResult.compressedSize / 1024).toFixed(0)}KB. Enviando ao Supabase... ☁️`;

      // 2. Tenta fazer upload para API Supabase real ou simula localmente
      let finalUrl = '';
      try {
        const formData = new FormData();
        formData.append('photo', compressedResult.blob, `photo-${category}.jpg`);
        formData.append('os_id', currentOS.id);
        formData.append('category', category);

        const response = await fetch('/api/admin/os/photos', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const resData = await response.json();
          finalUrl = resData.data.url;
        } else {
          throw new Error('Falha no upload backend');
        }
      } catch (uploadErr) {
        console.warn('API /api/admin/os/photos não respondeu. Convertendo para Base64/ObjectURL para persistência local...', uploadErr);
        // Fallback local robusto convertendo o Blob em DataURL
        finalUrl = await blobToDataURL(compressedResult.blob);
      }

      // 3. Atualiza os dados da OS com a nova foto
      if (!currentOS.photos) currentOS.photos = [];
      
      currentOS.photos.push({
        id: 'photo-' + Math.random().toString(36).substring(2, 9),
        url: finalUrl,
        tipo: category,
        uploaded_at: new Date().toISOString()
      });

      saveOSDataDirectly();
      renderPhotos();
      cancelPhotoUpload();
      alert('Foto comprimida e anexada com sucesso!');

    } catch (err) {
      console.error(err);
      alert('Erro ao comprimir ou fazer upload da foto: ' + err.message);
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = originalText;
    }
  }

  // Pure Native JS compression using HTML5 Canvas (max 1920px, JPEG 80% quality)
  function compressImageNative(file, maxSide = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionamento proporcional se necessário
          if (width > height) {
            if (width > maxSide) {
              height = Math.round((height * maxSide) / width);
              width = maxSide;
            }
          } else {
            if (height > maxSide) {
              width = Math.round((width * maxSide) / height);
              height = maxSide;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Converte para Blob JPEG
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                blob,
                width,
                height,
                originalSize: file.size,
                compressedSize: blob.size
              });
            } else {
              reject(new Error('Falha ao exportar imagem do Canvas.'));
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('Erro ao processar imagem física.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo da câmera/computador.'));
      reader.readAsDataURL(file);
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function renderPhotos() {
    const photos = currentOS.photos || [];
    if (photos.length === 0) {
      photoList.innerHTML = '<p style="font-size: var(--text-xs); color: var(--color-text-tertiary); grid-column: span 3; text-align: center;">Nenhuma foto anexada de bancada.</p>';
      return;
    }

    photoList.innerHTML = photos.map(photo => {
      const labelMap = { antes: 'Antes', durante: 'Durante', depois: 'Depois' };
      const displayLabel = labelMap[photo.tipo] || photo.tipo;

      return `
        <div class="photo-card" data-photo-id="${photo.id}">
          <span class="photo-badge">${displayLabel}</span>
          <img src="${photo.url}" alt="Foto de Bancada ${displayLabel}" class="bancada-img">
          <button type="button" class="photo-delete-btn" data-photo-id="${photo.id}" title="Deletar foto">✕</button>
        </div>
      `;
    }).join('');

    // Attach Lightbox Triggers
    photoList.querySelectorAll('.bancada-img').forEach(img => {
      img.addEventListener('click', (e) => {
        lightboxImg.src = e.target.src;
        lightbox.classList.add('open');
      });
    });

    // Attach Deletion Triggers
    photoList.querySelectorAll('.photo-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Deseja excluir permanentemente esta foto de bancada?')) return;
        
        const photoId = btn.getAttribute('data-photo-id');
        currentOS.photos = currentOS.photos.filter(p => p.id !== photoId);
        
        saveOSDataDirectly();
        renderPhotos();
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Action Buttons Saving and APIs
  // ─────────────────────────────────────────────────────────────────────────────

  async function saveAllOSChanges() {
    const btnSave = document.getElementById('btn-save-all');
    const originalText = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.innerHTML = '<span>Salvando Tudo... 🔄</span>';

    // Update current OS with inputs
    currentOS.equipamento.tipo = detEquipTipo.value;
    currentOS.equipamento.marca = detEquipMarca.value.trim();
    currentOS.equipamento.modelo = detEquipModelo.value.trim();
    currentOS.equipamento.serial = detEquipSerial.value.trim() || null;
    
    currentOS.laudo = detLaudo.value.trim() || null;
    currentOS.valor_cobrado = parseFloat(detValorCobrado.value) || 0;
    currentOS.valor_custo_peças = parseFloat(detCustoPecas.value) || 0;
    currentOS.valor_lucro = currentOS.valor_cobrado - currentOS.valor_custo_peças;
    currentOS.forma_pagamento = detFormaPagamento.value;
    
    currentOS.prazo_prometido = detPrazoPrometido.value;
    currentOS.garantia_dias = parseInt(detGarantiaDias.value) || 0;
    
    currentOS.is_custom_pc = detIsCustomPc ? detIsCustomPc.checked : false;
    currentOS.payment_status = detPaymentStatus ? detPaymentStatus.value : 'pendente';

    try {
      const response = await fetch('/api/admin/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentOS)
      });

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) throw new Error('Erro na API');
      
      alert('Toda a ficha da Ordem de Serviço foi salva com sucesso no banco!');
    } catch (err) {
      console.warn('API indisponível. Persistindo de forma offline em localStorage...', err);
      
      const stored = localStorage.getItem('iflcosta_os_list');
      let list = stored ? JSON.parse(stored) : [];
      list = list.map(o => o.id === currentOS.id ? currentOS : o);
      localStorage.setItem('iflcosta_os_list', JSON.stringify(list));
      
      alert('Dados gravados localmente (Modo Offline) com sucesso!');
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = originalText;
      renderOSDetails();
    }
  }

  function saveOSDataDirectly() {
    const stored = localStorage.getItem('iflcosta_os_list');
    let list = stored ? JSON.parse(stored) : [];
    list = list.map(o => o.id === currentOS.id ? currentOS : o);
    localStorage.setItem('iflcosta_os_list', JSON.stringify(list));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WhatsApp Notification Message Generator
  // ─────────────────────────────────────────────────────────────────────────────

  function triggerWhatsAppMessage() {
    const cleanPhone = currentOS.customer_phone.replace(/\D/g, '');
    const clientName = currentOS.customer_name.split(' ')[0]; // First name
    const deviceStr = `${currentOS.equipamento.marca} ${currentOS.equipamento.modelo}`;
    const valueFormatted = parseFloat(currentOS.valor_cobrado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const trackingLink = `${window.location.origin}/rastrear?token=${currentOS.tracking_token}`;
    
    let text = '';
    
    switch (currentOS.status) {
      case 'diagnóstico':
        text = `Olá ${clientName}! O seu ${deviceStr} entrou em diagnóstico técnico em nossa assistência técnica. Acompanhe as fotos de bancada e o status em tempo real aqui: ${trackingLink}`;
        break;
      case 'aguardando_aprovação':
        text = `Olá ${clientName}! O diagnóstico do seu ${deviceStr} foi finalizado. Laudo: ${currentOS.laudo || 'reparo necessário'}.\nTotal: ${valueFormatted}.\nVocê pode ver todos os detalhes e aprovar no link de rastreamento exclusivo: ${trackingLink}`;
        break;
      case 'aprovado':
        text = `Oba! O orçamento foi aprovado, ${clientName}. 🛠️ Já iniciamos o serviço no seu ${deviceStr}.\nAcompanhe cada etapa no link: ${trackingLink}`;
        break;
      case 'aguardando_peça':
        text = `Olá ${clientName}! Tivemos que encomendar uma peça para concluir a manutenção do seu ${deviceStr}. Fique tranquilo, ela já foi comprada e deve chegar em breve.\nVeja o status de trâmite da peça em: ${trackingLink}`;
        break;
      case 'em_conserto':
        text = `Seu ${deviceStr} está na bancada sob reparos, ${clientName}! Acompanhe o progresso técnico no link: ${trackingLink}`;
        break;
      case 'pronto':
        text = `Ótima notícia, ${clientName}! Seu ${deviceStr} está PRONTO! 🎉 Fizemos todos os testes de bancada de energia e sensores e ele passou com 100% de sucesso.\nPode retirar na loja hoje.\nVeja as fotos dele pronto no link: ${trackingLink}`;
        break;
      case 'entregue':
        const expiry = detGarantiaAte.value;
        text = `Agradecemos a confiança, ${clientName}! Seu ${deviceStr} foi entregue.\nA sua garantia é válida por ${currentOS.garantia_dias || 90} dias (até ${expiry}).\nO histórico das fotos e o certificado digital de garantia estão disponíveis no link de rastreamento: ${trackingLink}`;
        break;
      case 'cancelado':
        text = `Olá ${clientName}. Confirmamos o cancelamento do serviço para o seu ${deviceStr}. O aparelho já foi remontado e está disponível para retirada na loja.\nDetalhes adicionais: ${trackingLink}`;
        break;
      default:
        text = `Olá ${clientName}! Acompanhe o status do conserto do seu ${deviceStr} em tempo real no nosso canal oficial: ${trackingLink}`;
    }

    const waUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  }

  // UI status mapping helpers
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Peças de Reposição & Estoque Logic (T008)
  // ─────────────────────────────────────────────────────────────────────────────

  async function handlePartSearch() {
    const val = partSearchInput.value.trim();
    if (val.length < 2) {
      partSearchResults.style.display = 'none';
      btnAddPart.disabled = true;
      selectedPart = null;
      return;
    }

    try {
      const response = await fetch(`/api/admin/inventory/products?search=${encodeURIComponent(val)}&limit=10`);
      if (response.ok) {
        const res = await response.json();
        renderPartSearchResults(res.data);
      } else {
        throw new Error('Falha ao buscar da API');
      }
    } catch (err) {
      console.warn('Erro ao buscar produtos da API. Usando localStorage...', err);
      const stored = localStorage.getItem('iflcosta_products_list');
      const list = stored ? JSON.parse(stored) : [];
      const filtered = list.filter(p => 
        (p.nome.toLowerCase().includes(val.toLowerCase()) || 
         p.sku.toLowerCase().includes(val.toLowerCase()) || 
         (p.marca && p.marca.toLowerCase().includes(val.toLowerCase())))
      ).slice(0, 10);
      renderPartSearchResults(filtered);
    }
  }

  function renderPartSearchResults(products) {
    const available = products.filter(p => p.qty_atual > 0);
    
    if (available.length === 0) {
      partSearchResults.innerHTML = `<div style="padding: var(--space-2); font-size: var(--text-xs); color: var(--color-text-tertiary);">Nenhuma peça com estoque disponível.</div>`;
      partSearchResults.style.display = 'block';
      btnAddPart.disabled = true;
      selectedPart = null;
      return;
    }

    partSearchResults.innerHTML = available.map(p => `
      <div class="part-search-item" data-id="${p.id}" style="padding: var(--space-2); cursor: pointer; border-bottom: 1px solid var(--color-border-subtle); font-size: var(--text-sm); transition: background var(--transition-fast);">
        <div style="font-weight: var(--font-bold);">${escapeHtml(p.nome)}</div>
        <div style="font-size: var(--text-xs); color: var(--color-text-secondary); display: flex; justify-content: space-between; margin-top: 2px;">
          <span>SKU: ${escapeHtml(p.sku)} | Estoque: ${p.qty_atual}</span>
          <span style="font-weight: var(--font-bold); color: var(--color-primary);">R$ ${p.preco_venda.toFixed(2)}</span>
        </div>
      </div>
    `).join('');

    partSearchResults.style.display = 'block';

    partSearchResults.querySelectorAll('.part-search-item').forEach(item => {
      item.addEventListener('mouseenter', () => item.style.background = 'var(--color-bg-primary)');
      item.addEventListener('mouseleave', () => item.style.background = 'none');
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        selectedPart = available.find(p => p.id === id);
        if (selectedPart) {
          partSearchInput.value = selectedPart.nome;
          partSearchResults.style.display = 'none';
          btnAddPart.disabled = false;
        }
      });
    });
  }

  async function handleAddPartToOS() {
    if (!selectedPart) return;

    btnAddPart.disabled = true;
    const qty = 1;
    const movementPayload = {
      product_id: selectedPart.id,
      tipo: 'saída',
      qty: qty,
      repair_id: osId,
      custo_unitario: selectedPart.preco_custo,
      observacao: `Consumo na OS #${currentOS.os_number || ''}`
    };

    try {
      const response = await fetch('/api/admin/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementPayload)
      });

      if (!response.ok) throw new Error('Falha ao adicionar movimento');
      
      const novoValorCobrado = (parseFloat(detValorCobrado.value) || 0) + selectedPart.preco_venda;
      detValorCobrado.value = novoValorCobrado.toFixed(2);
      
      await saveAllOSChanges();
      
    } catch (err) {
      console.warn('Falha na API de movimentações. Gravando em localStorage...', err);

      const productsStored = localStorage.getItem('iflcosta_products_list');
      if (productsStored) {
        let productsList = JSON.parse(productsStored);
        productsList = productsList.map(p => {
          if (p.id === selectedPart.id) {
            p.qty_atual = Math.max(0, p.qty_atual - qty);
          }
          return p;
        });
        localStorage.setItem('iflcosta_products_list', JSON.stringify(productsList));
      }

      const movementsStored = localStorage.getItem('iflcosta_movements_list');
      const movementsList = movementsStored ? JSON.parse(movementsStored) : [];
      const newMovement = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'mov-' + Math.random().toString(36).substring(2, 9),
        ...movementPayload,
        created_at: new Date().toISOString()
      };
      movementsList.push(newMovement);
      localStorage.setItem('iflcosta_movements_list', JSON.stringify(movementsList));

      const partsCost = movementsList
        .filter(m => m.repair_id === osId && m.tipo === 'saída')
        .reduce((sum, m) => sum + (m.qty * m.custo_unitario), 0);
      
      currentOS.valor_custo_peças = partsCost;
      detCustoPecas.value = partsCost.toFixed(2);

      const novoValorCobrado = (parseFloat(detValorCobrado.value) || 0) + selectedPart.preco_venda;
      detValorCobrado.value = novoValorCobrado.toFixed(2);
      currentOS.valor_cobrado = novoValorCobrado;
      currentOS.valor_lucro = currentOS.valor_cobrado - currentOS.valor_custo_peças;

      saveOSDataDirectly();
      calculateProfitMargin();
    } finally {
      partSearchInput.value = '';
      selectedPart = null;
      btnAddPart.disabled = true;
      await loadOSDetails();
    }
  }

  async function loadOSParts() {
    try {
      const response = await fetch(`/api/admin/inventory/movements?repair_id=${osId}`);
      if (response.ok) {
        const res = await response.json();
        osMovements = res.data;
      } else {
        throw new Error('Falha no GET de movimentos');
      }
    } catch (err) {
      console.warn('Erro ao carregar movimentos da API. Buscando localmente...', err);
      const stored = localStorage.getItem('iflcosta_movements_list');
      const movements = stored ? JSON.parse(stored) : [];
      
      const productsStored = localStorage.getItem('iflcosta_products_list');
      const products = productsStored ? JSON.parse(productsStored) : [];

      osMovements = movements
        .filter(m => m.repair_id === osId)
        .map(m => {
          const prod = products.find(p => p.id === m.product_id);
          return {
            ...m,
            products: prod ? { nome: prod.nome } : { nome: 'Peça Desconhecida' }
          };
        });
    }

    renderOSPartsList();
  }

  function renderOSPartsList() {
    if (osMovements.length === 0) {
      partsConsumedList.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-tertiary); padding: var(--space-4) 0;">Nenhuma peça vinculada a esta Ordem de Serviço.</td></tr>`;
      detCustoPecas.readOnly = false;
      return;
    }

    detCustoPecas.readOnly = true;

    partsConsumedList.innerHTML = osMovements.map(m => {
      const total = m.qty * m.custo_unitario;
      const partName = m.products ? m.products.nome : 'Peça';
      return `
        <tr style="border-bottom: 1px solid var(--color-border-subtle);">
          <td style="padding: var(--space-2) 0; font-weight: var(--font-medium);">${escapeHtml(partName)}</td>
          <td style="padding: var(--space-2) 0; text-align: center;">${m.qty}</td>
          <td style="padding: var(--space-2) 0; text-align: right;">R$ ${m.custo_unitario.toFixed(2)}</td>
          <td style="padding: var(--space-2) 0; text-align: right; font-weight: var(--font-bold);">R$ ${total.toFixed(2)}</td>
          <td style="padding: var(--space-2) 0; text-align: center;">
            <button type="button" class="btn-delete-part" data-id="${m.id}" style="background: none; border: none; color: var(--color-danger); cursor: pointer; font-size: var(--text-sm); font-weight: var(--font-bold);" title="Estornar peça">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    partsConsumedList.querySelectorAll('.btn-delete-part').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mid = btn.getAttribute('data-id');
        if (!confirm('Deseja realmente remover esta peça e estornar o estoque?')) return;

        try {
          const response = await fetch(`/api/admin/inventory/movements?id=${mid}`, {
            method: 'DELETE'
          });

          if (!response.ok) throw new Error('Falha ao excluir movimento');

          const mov = osMovements.find(m => m.id === mid);
          if (mov) {
            let precoVenda = 0;
            try {
              const prodResp = await fetch(`/api/admin/inventory/products?id=${mov.product_id}`);
              if (prodResp.ok) {
                const prodData = await prodResp.json();
                precoVenda = prodData.data.preco_venda;
              }
            } catch (pErr) {
              console.log('Não foi possível buscar preco_venda do produto via API.');
            }

            if (precoVenda > 0) {
              const novoCobrado = Math.max(0, (parseFloat(detValorCobrado.value) || 0) - precoVenda);
              detValorCobrado.value = novoCobrado.toFixed(2);
            }
          }

          await saveAllOSChanges();

        } catch (err) {
          console.warn('Erro ao deletar movimento via API. Executando localmente...', err);
          
          const mov = osMovements.find(m => m.id === mid);
          if (mov) {
            const productsStored = localStorage.getItem('iflcosta_products_list');
            if (productsStored) {
              let productsList = JSON.parse(productsStored);
              productsList = productsList.map(p => {
                if (p.id === mov.product_id) {
                  p.qty_atual += mov.qty;
                }
                return p;
              });
              localStorage.setItem('iflcosta_products_list', JSON.stringify(productsList));
            }

            const movementsStored = localStorage.getItem('iflcosta_movements_list');
            if (movementsStored) {
              let movementsList = JSON.parse(movementsStored);
              movementsList = movementsList.filter(m => m.id !== mid);
              localStorage.setItem('iflcosta_movements_list', JSON.stringify(movementsList));

              const partsCost = movementsList
                .filter(m => m.repair_id === osId && m.tipo === 'saída')
                .reduce((sum, m) => sum + (m.qty * m.custo_unitario), 0);
              
              currentOS.valor_custo_peças = partsCost;
              detCustoPecas.value = partsCost.toFixed(2);
            }

            const productsStoredList = productsStored ? JSON.parse(productsStored) : [];
            const prod = productsStoredList.find(p => p.id === mov.product_id);
            if (prod) {
              const novoCobrado = Math.max(0, (parseFloat(detValorCobrado.value) || 0) - prod.preco_venda);
              detValorCobrado.value = novoCobrado.toFixed(2);
              currentOS.valor_cobrado = novoCobrado;
            }
            
            currentOS.valor_lucro = currentOS.valor_cobrado - currentOS.valor_custo_peças;
            saveOSDataDirectly();
            calculateProfitMargin();
          }
        } finally {
          await loadOSDetails();
        }
      });
    });
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
