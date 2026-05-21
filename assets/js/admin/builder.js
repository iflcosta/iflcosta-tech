// /assets/js/admin/builder.js
// Vanilla JS Module — Custom PC Builder & Socket Compatibility (Feature 007)

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const presetSelect = document.getElementById('builder-preset-select');
  const componentSelects = document.querySelectorAll('.builder-component-select');
  const warningBanner = document.getElementById('builder-compatibility-warning');
  const warningText = document.getElementById('warning-text');
  
  const totalCostEl = document.getElementById('total-cost');
  const markupSlider = document.getElementById('markup-margin');
  const markupValEl = document.getElementById('markup-val');
  const suggestedPriceEl = document.getElementById('suggested-price');
  
  const btnCopyWa = document.getElementById('btn-copy-wa');
  const btnCreateOS = document.getElementById('btn-create-os');

  let allProducts = [];
  let allPresets = [];
  let selectedBuild = {
    Processador: null,
    'Placa-mãe': null,
    'Memória RAM': null,
    Armazenamento: null,
    'Placa de Vídeo': null,
    Fonte: null,
    Gabinete: null,
    Cooler: null
  };

  // Load Initial Data
  initBuilder();

  // Listeners
  markupSlider.addEventListener('input', (e) => {
    markupValEl.textContent = `${e.target.value}%`;
    calculateTotals();
  });

  componentSelects.forEach(select => {
    select.addEventListener('change', (e) => {
      const category = select.getAttribute('data-category');
      const productId = select.value;
      
      const prod = allProducts.find(p => p.id === productId);
      selectedBuild[category] = prod || null;

      // Update individual price and specs
      const slotEl = select.closest('.component-slot');
      const priceEl = slotEl.querySelector('.slot-price');
      const specLabelEl = slotEl.querySelector('.slot-spec-label');
      
      if (prod) {
        priceEl.textContent = `R$ ${prod.preco_venda.toFixed(2)}`;
        if (prod.specs && prod.specs.socket) {
          specLabelEl.textContent = `Socket: ${prod.specs.socket}`;
        } else {
          specLabelEl.textContent = 'Especificado';
        }
      } else {
        priceEl.textContent = 'R$ 0,00';
        specLabelEl.textContent = category === 'Processador' || category === 'Placa-mãe' ? 'Nenhum socket' : 'Não especificado';
      }

      validateCompatibility();
      calculateTotals();
    });
  });

  presetSelect.addEventListener('change', (e) => {
    const presetId = e.target.value;
    if (!presetId) {
      clearAllSlots();
      return;
    }

    const preset = allPresets.find(p => p.id === presetId);
    if (!preset) return;

    applyPreset(preset);
  });

  btnCopyWa.addEventListener('click', copyWhatsAppQuote);
  btnCreateOS.addEventListener('click', createOSFromBuild);

  // Core functions
  async function initBuilder() {
    await loadProducts();
    await loadPresets();
    populateComponentDropdowns();
  }

  async function loadProducts() {
    try {
      const response = await fetch('/api/admin/inventory/products?limit=100');
      if (response.ok) {
        const res = await response.json();
        allProducts = res.data;
      } else {
        throw new Error('Falha no GET');
      }
    } catch (err) {
      console.error('Erro ao carregar produtos da API:', err);
      allProducts = [];
    }
  }

  async function loadPresets() {
    try {
      const response = await fetch('/api/admin/inventory/presets');
      if (response.ok) {
        const res = await response.json();
        allPresets = res.data;
      } else {
        throw new Error('Falha no GET');
      }
    } catch (err) {
      console.error('Erro ao carregar presets da API:', err);
      allPresets = [];
    }

    presetSelect.innerHTML = '<option value="">Selecione um Preset...</option>' +
      allPresets.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('');
  }

  function populateComponentDropdowns() {
    componentSelects.forEach(select => {
      const category = select.getAttribute('data-category');
      
      const filtered = allProducts.filter(p => {
        const c = p.categoria ? p.categoria.toLowerCase() : '';
        const s = p.subcategoria ? p.subcategoria.toLowerCase() : '';
        const searchCat = category.toLowerCase();
        
        return c === 'componente_pc' && (s.includes(searchCat) || p.nome.toLowerCase().includes(searchCat));
      });

      const finalProducts = filtered.length > 0 ? filtered : allProducts.filter(p => p.nome.toLowerCase().includes(category.toLowerCase()));

      select.innerHTML = `<option value="">Selecione o(a) ${category}...</option>` +
        finalProducts.map(p => {
          const suffix = p.specs && p.specs.socket ? ` [${p.specs.socket}]` : '';
          return `<option value="${p.id}">${escapeHtml(p.nome)} - R$ ${p.preco_venda.toFixed(2)}${suffix}</option>`;
        }).join('');
    });
  }

  function clearAllSlots() {
    componentSelects.forEach(select => {
      select.value = '';
      select.dispatchEvent(new Event('change'));
    });
  }

  function applyPreset(preset) {
    clearAllSlots();
    
    for (const [category, term] of Object.entries(preset.components)) {
      const select = Array.from(componentSelects).find(s => s.getAttribute('data-category') === category);
      if (!select) continue;

      const options = Array.from(select.options);
      const matchedOption = options.find(opt => opt.text.toLowerCase().includes(term.toLowerCase()));
      
      if (matchedOption) {
        select.value = matchedOption.value;
        select.dispatchEvent(new Event('change'));
      }
    }
  }

  function validateCompatibility() {
    const cpu = selectedBuild['Processador'];
    const mobo = selectedBuild['Placa-mãe'];

    if (cpu && mobo && cpu.specs && mobo.specs && cpu.specs.socket && mobo.specs.socket) {
      if (cpu.specs.socket.toLowerCase().trim() !== mobo.specs.socket.toLowerCase().trim()) {
        warningText.textContent = `Aviso: Processador usa socket ${cpu.specs.socket.toUpperCase()}, mas a Placa-mãe usa ${mobo.specs.socket.toUpperCase()}! Eles são incompatíveis.`;
        warningBanner.style.display = 'flex';
        return;
      }
    }
    warningBanner.style.display = 'none';
  }

  function calculateTotals() {
    let totalCost = 0;
    
    for (const prod of Object.values(selectedBuild)) {
      if (prod) {
        totalCost += prod.custo_atual || 0;
      }
    }

    const markup = parseInt(markupSlider.value) || 0;
    const suggestedPrice = totalCost * (1 + (markup / 100));

    totalCostEl.textContent = `R$ ${totalCost.toFixed(2)}`;
    suggestedPriceEl.textContent = `R$ ${suggestedPrice.toFixed(2)}`;
  }

  function getFormattedBuildText() {
    let text = `💻 *Orçamento Personalizado - Iago Lopes | Hardware & Tech*\n`;
    text += `--------------------------------------------------\n`;
    
    let hasComponents = false;
    for (const [category, prod] of Object.entries(selectedBuild)) {
      if (prod) {
        text += `• *${category}:* ${prod.nome} - R$ ${prod.preco_venda.toFixed(2)}\n`;
        hasComponents = true;
      }
    }

    if (!hasComponents) return null;

    const markup = parseInt(markupSlider.value) || 0;
    let totalCost = 0;
    for (const prod of Object.values(selectedBuild)) {
      if (prod) totalCost += prod.custo_atual || 0;
    }
    const suggestedPrice = totalCost * (1 + (markup / 100));

    text += `--------------------------------------------------\n`;
    text += `💰 *Preço Sugerido:* R$ ${suggestedPrice.toFixed(2)} (em até 12x)\n\n`;
    text += `🔗 *Acompanhe seu atendimento via WhatsApp*\n`;
    return text;
  }

  function copyWhatsAppQuote() {
    const text = getFormattedBuildText();
    if (!text) {
      alert('Selecione pelo menos um componente para gerar o orçamento.');
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      alert('Orçamento formatado copiado para a área de transferência!');
    }).catch(err => {
      console.error('Falha ao copiar:', err);
      alert('Erro ao copiar. Copie manualmente.');
    });
  }

  async function createOSFromBuild() {
    const text = getFormattedBuildText();
    if (!text) {
      alert('Selecione pelo menos um componente para criar a OS.');
      return;
    }

    let customerId = 'temp-customer-id';
    
    try {
      const resp = await fetch('/api/admin/crm/customers?limit=1');
      if (resp.ok) {
        const res = await resp.json();
        if (res.data && res.data.length > 0) {
          customerId = res.data[0].id;
        }
      }
    } catch (e) {
      console.error('Erro ao obter clientes da API:', e);
    }

    let totalCost = 0;
    for (const prod of Object.values(selectedBuild)) {
      if (prod) totalCost += prod.custo_atual || 0;
    }
    const markup = parseInt(markupSlider.value) || 0;
    const suggestedPrice = totalCost * (1 + (markup / 100));

    const osNumber = Math.floor(1000 + Math.random() * 9000);
    const trackingToken = crypto.randomUUID ? crypto.randomUUID() : 'tok-' + Math.random().toString(36).substring(2, 9);
    
    const osPayload = {
      customer_id: customerId,
      os_number: osNumber,
      status: 'rascunho',
      equipamento: {
        tipo: 'Computador',
        marca: 'Custom Build',
        modelo: 'PC Personalizado',
        serial: null
      },
      problema_reportado: 'Montagem e configuração de PC Customizado.',
      laudo: `Peças Selecionadas:\n` + Object.entries(selectedBuild)
        .filter(([_, p]) => p !== null)
        .map(([c, p]) => `- ${c}: ${p.nome}`).join('\n'),
      valor_cobrado: parseFloat(suggestedPrice.toFixed(2)),
      valor_custo_peças: parseFloat(totalCost.toFixed(2)),
      garantia_dias: 90,
      prazo_prometido: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tracking_token: trackingToken,
      created_at: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/admin/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(osPayload)
      });

      if (response.ok) {
        const res = await response.json();
        window.location.href = `/admin/os/detalhes?id=${res.data.id}`;
      } else {
        throw new Error('Falha ao criar OS na API');
      }
    } catch (err) {
      console.error('Erro ao criar OS via API:', err);
      alert('Erro ao criar Ordem de Serviço. Verifique sua conexão e tente novamente.');
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
});
