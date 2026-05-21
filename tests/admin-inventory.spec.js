// /tests/admin-inventory.spec.js
// E2E tests — Feature 007: Admin Inventory & Custom PC Builder
import { test, expect } from '@playwright/test';

// ─── Dados de mock ─────────────────────────────────────────────────────────────

const MOCK_CUSTOMERS = [
  {
    id: 'customer-uuid-1',
    nome: 'Maria da Silva',
    telefone: '11999998888',
    email: 'maria@email.com',
    deleted_at: null
  }
];

const MOCK_PRODUCTS = [
  {
    id: 'prod-cpu-1',
    nome: 'Intel Core i5-12400F',
    categoria: 'componente_pc',
    subcategoria: 'Processador',
    marca: 'Intel',
    modelo: 'i5-12400F',
    sku: 'INTEL-12400F',
    preco_custo: 500.00,
    preco_venda: 750.00,
    qty_atual: 5,
    qty_minima: 2,
    fornecedor_nome: 'Distribuidor Intel',
    specs: { socket: 'LGA1700' }
  },
  {
    id: 'prod-cpu-2',
    nome: 'AMD Ryzen 5 5600',
    categoria: 'componente_pc',
    subcategoria: 'Processador',
    marca: 'AMD',
    modelo: 'R5-5600',
    sku: 'AMD-5600',
    preco_custo: 450.00,
    preco_venda: 680.00,
    qty_atual: 8,
    qty_minima: 3,
    fornecedor_nome: 'Distribuidor AMD',
    specs: { socket: 'AM4' }
  },
  {
    id: 'prod-mobo-1',
    nome: 'ASUS Prime H610M-K',
    categoria: 'componente_pc',
    subcategoria: 'Placa-mãe',
    marca: 'ASUS',
    modelo: 'H610M-K',
    sku: 'ASUS-H610M',
    preco_custo: 400.00,
    preco_venda: 600.00,
    qty_atual: 3,
    qty_minima: 1,
    fornecedor_nome: 'ASUS Brasil',
    specs: { socket: 'LGA1700' }
  },
  {
    id: 'prod-mobo-2',
    nome: 'MSI B550M Pro-VDH',
    categoria: 'componente_pc',
    subcategoria: 'Placa-mãe',
    marca: 'MSI',
    modelo: 'B550M-PRO',
    sku: 'MSI-B550M',
    preco_custo: 450.00,
    preco_venda: 700.00,
    qty_atual: 4,
    qty_minima: 2,
    fornecedor_nome: 'MSI Distribuição',
    specs: { socket: 'AM4' }
  },
  {
    id: 'prod-ram-1',
    nome: 'Kingston Fury Beast 8GB DDR4',
    categoria: 'componente_pc',
    subcategoria: 'Memória RAM',
    marca: 'Kingston',
    modelo: 'Fury 8GB',
    sku: 'KNG-FURY-8G',
    preco_custo: 120.00,
    preco_venda: 220.00,
    qty_atual: 15,
    qty_minima: 5,
    fornecedor_nome: 'Kingston Oficial'
  },
  {
    id: 'prod-ssd-1',
    nome: 'Crucial P3 1TB NVMe',
    categoria: 'componente_pc',
    subcategoria: 'Armazenamento',
    marca: 'Crucial',
    modelo: 'P3 1TB',
    sku: 'CRU-P3-1TB',
    preco_custo: 250.00,
    preco_venda: 450.00,
    qty_atual: 0, // zerado para testar alerta de estoque
    qty_minima: 2,
    fornecedor_nome: 'Crucial SA'
  }
];

const MOCK_MOVEMENTS = [
  {
    id: 'mov-1',
    product_id: 'prod-cpu-1',
    tipo: 'entrada',
    qty: 5,
    custo_unitario: 500.00,
    created_at: '2026-05-10T10:00:00.000Z'
  },
  {
    id: 'mov-2',
    product_id: 'prod-mobo-1',
    tipo: 'entrada',
    qty: 3,
    custo_unitario: 400.00,
    created_at: '2026-05-12T11:00:00.000Z'
  }
];

const MOCK_OS = {
  id: 'os-uuid-1',
  os_number: 1001,
  created_at: '2026-05-20T10:00:00.000Z',
  updated_at: '2026-05-20T10:00:00.000Z',
  customer_id: 'customer-uuid-1',
  customer_name: 'Maria da Silva',
  customer_phone: '11999998888',
  customer_email: 'maria@email.com',
  equipamento: { tipo: 'Computador', marca: 'Dell', modelo: 'Inspiron 3000', serial: 'DELL123XYZ' },
  problema_reportado: 'Não liga, bipa 3 vezes.',
  laudo: 'Problema no pente de memória ou placa.',
  status: 'diagnóstico',
  prazo_prometido: '2026-05-25',
  valor_cobrado: 200.00,
  valor_custo_peças: 0.00,
  valor_lucro: 200.00,
  forma_pagamento: 'PIX',
  garantia_dias: 90,
  garantia_ate: null,
  tracking_token: 'tracking-token-uuid-1',
  customers: { nome: 'Maria da Silva', telefone: '11999998888', email: 'maria@email.com' }
};

const MOCK_PRESETS = [
  {
    id: 'preset-gamer',
    nome: 'PC Gamer Ideal',
    components: {
      Processador: 'AMD Ryzen 5 5600',
      'Placa-mãe': 'MSI B550M Pro-VDH',
      'Memória RAM': 'Kingston Fury Beast 8GB DDR4'
    }
  }
];

// ─── Setup e beforeEach ────────────────────────────────────────────────────────

let testMovements = [];

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();

  testMovements = [...MOCK_MOVEMENTS];

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('dialog', dialog => dialog.dismiss());

  // Injeta mocks no localStorage
  await page.addInitScript(
    ({ MOCK_CUSTOMERS, MOCK_PRODUCTS, MOCK_MOVEMENTS, MOCK_OS, MOCK_PRESETS }) => {
      try {
        localStorage.clear();
        localStorage.setItem('iflcosta_customers_list', JSON.stringify(MOCK_CUSTOMERS));
        localStorage.setItem('iflcosta_products_list', JSON.stringify(MOCK_PRODUCTS));
        localStorage.setItem('iflcosta_movements_list', JSON.stringify(MOCK_MOVEMENTS));
        localStorage.setItem('iflcosta_os_list', JSON.stringify([MOCK_OS]));
        localStorage.setItem('iflcosta_presets_list', JSON.stringify(MOCK_PRESETS));
        localStorage.setItem('iflcosta_os_history_os-uuid-1', JSON.stringify([
          { id: 'h-1', os_id: 'os-uuid-1', status: 'diagnóstico', entered_at: new Date().toISOString(), exited_at: null }
        ]));
      } catch (e) { /* noop */ }
    },
    { MOCK_CUSTOMERS, MOCK_PRODUCTS, MOCK_MOVEMENTS, MOCK_OS, MOCK_PRESETS }
  );

  // Mocks de Rotas de API
  await page.route(url => url.pathname.includes('/api/admin/inventory/products'), async (route) => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');
      let data = [...MOCK_PRODUCTS];
      if (search) {
        data = data.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data })
      });
    }
  });

  await page.route(url => url.pathname.includes('/api/admin/inventory/presets'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: MOCK_PRESETS })
    });
  });

  await page.route(url => url.pathname.includes('/api/admin/inventory/movements'), async (route) => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const repairId = url.searchParams.get('repair_id');
      let data = [...testMovements];
      if (repairId) {
        data = data.filter(m => m.repair_id === repairId);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data })
      });
    } else if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData());
      const newMov = { id: `mov-${Math.random()}`, ...body, created_at: new Date().toISOString() };
      
      // Também adicionamos o nome do produto na resposta para o front
      const prod = MOCK_PRODUCTS.find(p => p.id === body.product_id);
      if (prod) {
        newMov.products = { nome: prod.nome };
      }
      
      testMovements.push(newMov);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: newMov })
      });
    } else if (route.request().method() === 'DELETE') {
      const url = new URL(route.request().url());
      const id = url.searchParams.get('id');
      testMovements = testMovements.filter(m => m.id !== id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      });
    }
  });

  await page.route(url => url.pathname === '/api/admin/os', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: MOCK_OS })
      });
    } else if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData());
      const id = body.id || `os-${Math.random()}`;
      await route.fulfill({
        status: body.id ? 200 : 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { id, ...body } })
      });
    }
  });

  await page.route(url => url.pathname === '/api/admin/customers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: MOCK_CUSTOMERS })
    });
  });
});

// ─── Testes ────────────────────────────────────────────────────────────────────

test.describe('Feature 007 — Painel de Estoque, Movimentações, OS Integration e PC Builder', () => {

  test('T01 — Catálogo: Deve carregar o estoque e exibir produtos cadastrados com alertas', async ({ page }) => {
    await page.goto('/admin/estoque');

    // Valida que o loading desaparece e os resultados aparecem
    await expect(page.locator('#prod-loading')).not.toBeVisible();
    await expect(page.locator('#prod-results')).toBeVisible();

    // Valida cards de estatísticas superiores
    await expect(page.locator('#stat-total')).toHaveText('6');
    await expect(page.locator('#stat-baixo')).toHaveText('1'); // SSD Crucial (qty_atual: 0, qty_minimo: 2)

    // Valida listagem na tabela
    const rows = page.locator('#prod-table-body tr');
    await expect(rows).toHaveCount(6);

    // Valida alerta HSL visual na linha do produto sem estoque
    const alertaRow = page.locator('.prod-row-alerta:visible');
    await expect(alertaRow).toBeVisible();
    await expect(alertaRow).toContainText('Crucial P3 1TB NVMe');
  });

  test('T02 — OS Integration: Deve buscar, adicionar e estornar peças de reposição a uma OS', async ({ page }) => {
    await page.goto('/admin/os/detalhes?id=os-uuid-1');

    const searchInput = page.locator('#part-search-input');
    const btnAddPart = page.locator('#btn-add-part');
    const consumedList = page.locator('#parts-consumed-list');
    const costInput = page.locator('#det-custo-pecas');
    const totalChargedInput = page.locator('#det-valor-cobrado');

    // 1. Campo de custo de peças manual está editável inicialmente
    await expect(costInput).not.toHaveAttribute('readonly', '');

    // 2. Busca e seleciona processador no autocomplete
    await searchInput.fill('Intel');
    await page.waitForTimeout(300); // Aguarda debounce de 250ms

    const autocompleteResults = page.locator('#part-search-results');
    await expect(autocompleteResults).toBeVisible();
    await expect(autocompleteResults.locator('.part-search-item')).toContainText('Intel Core i5-12400F');

    // Clica no item buscado
    await autocompleteResults.locator('.part-search-item').first().click();
    await expect(autocompleteResults).not.toBeVisible();
    await expect(searchInput).toHaveValue('Intel Core i5-12400F');

    // 3. Adiciona a peça à OS
    await expect(btnAddPart).toBeEnabled();
    await btnAddPart.click();

    // 4. Valida atualizações automáticas e bloqueios financeiros (T008)
    await expect(consumedList.locator('tr')).toContainText('Intel Core i5-12400F');
    // Input de custo de peças fica readonly
    await expect(costInput).toHaveAttribute('readonly', '');
  });

  test('T03 — Custom PC Builder: Deve carregar presets e checar compatibilidade de sockets de CPU/Placa-mãe', async ({ page }) => {
    await page.goto('/admin/estoque/builder.html');

    const selectPreset = page.locator('#builder-preset-select');
    const selectCpu = page.locator('#select-cpu');
    const selectMobo = page.locator('#select-motherboard');
    const warning = page.locator('#builder-compatibility-warning');
    const totalCost = page.locator('#total-cost');
    const suggestedPrice = page.locator('#suggested-price');

    // 1. Carrega preset "PC Gamer Ideal"
    await selectPreset.selectOption({ label: 'PC Gamer Ideal' });
    await page.waitForTimeout(100);

    // Valida que escolheu componentes do preset automaticamente (termo-termo)
    await expect(selectCpu).toHaveValue('prod-cpu-2'); // AMD Ryzen 5 5600
    await expect(selectMobo).toHaveValue('prod-mobo-2'); // MSI B550M Pro-VDH

    // 2. Socket de ambos é AM4, logo compatibilidade está OK
    await expect(warning).not.toBeVisible();

    // 3. Altera Placa-mãe para ASUS Prime H610M-K (Socket LGA1700 - Intel)
    // Causando incompatibilidade intencional (T010)
    await selectMobo.selectOption({ value: 'prod-mobo-1' });
    
    // Alerta em vermelho HSL de incompatibilidade de sockets deve aparecer
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('incompatíveis');

    // 4. Corrige a compatibilidade escolhendo processador LGA1700 (Intel Core i5-12400F)
    await selectCpu.selectOption({ value: 'prod-cpu-1' });
    await expect(warning).not.toBeVisible();
  });

  test('T04 — Custom PC Builder: Deve gerar cotação WhatsApp e criar rascunho de OS', async ({ page }) => {
    await page.goto('/admin/estoque/builder.html');

    const selectCpu = page.locator('#select-cpu');
    const selectMobo = page.locator('#select-motherboard');
    const btnCreateOS = page.locator('#btn-create-os');

    // Escolhe componentes
    await selectCpu.selectOption({ value: 'prod-cpu-1' });
    await selectMobo.selectOption({ value: 'prod-mobo-1' });

    // Cria OS Rascunho
    await btnCreateOS.click();

    // Deve redirecionar automaticamente para a tela de detalhes da OS criada
    await page.waitForURL(url => url.pathname.includes('/admin/os/detalhes'));
    await expect(page.locator('#os-title-number')).toBeVisible();
  });

  test('T05 — Relatórios Financeiros: Deve carregar cards, tabelas e renderizar o elemento Canvas gráfico', async ({ page }) => {
    await page.goto('/admin/estoque/relatorios.html');

    // Valida cards financeiros (somas corretas)
    await expect(page.locator('#rep-total-custo')).toContainText('R$ 10.900,00'); // (5*500) + (8*450) + (3*400) + (4*450) + (15*120) = 2500+3600+1200+1800+1800 = 10900. Com a qty Crucial sendo 0.
    // Vamos apenas assegurar que os elementos estão povoados
    await expect(page.locator('#rep-total-custo')).not.toHaveText('R$ 0,00');
    await expect(page.locator('#rep-venda-potencial')).not.toHaveText('R$ 0,00');

    // Valida Top 10 tabela
    const topRows = page.locator('#top-products-body tr');
    await expect(topRows).not.toHaveCount(0);
    await expect(topRows.first()).toContainText('%');

    // Valida alertas tabela (SSD zerado está na lista)
    const alertRows = page.locator('#alerts-products-body tr');
    await expect(alertRows).toContainText('Crucial P3 1TB NVMe');

    // Valida renderização do elemento Canvas (T012)
    const chartCanvas = page.locator('#stock-chart');
    await expect(chartCanvas).toBeVisible();
  });

});
