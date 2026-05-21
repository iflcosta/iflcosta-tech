// /tests/admin-financeiro.spec.js
// E2E tests — Feature 010: Painel Financeiro
// Viewport padrão: Pixel 5 (393×851) — mobile-first conforme playwright.config.js
import { test, expect } from '@playwright/test';

// ─── Dados de mock ─────────────────────────────────────────────────────────────

const MOCK_ESTE_MES = {
  ok: true,
  periodo: { from: '2026-05-01T00:00:00.000Z', to: '2026-05-31T23:59:59.000Z', label: 'Este mês' },
  resumo: { receita: 3200.00, lucro: 1850.00, ticket_medio: 533.33, os_count: 6 },
  a_receber: {
    total: 750.00,
    lista: [
      { id: 'os-uuid-1', os_number: 'OS-2026-0003', customer_nome: 'João Souza', equipamento: 'Apple iPhone 12', valor_cobrado: 450.00, payment_status: 'pendente' },
      { id: 'os-uuid-2', os_number: 'OS-2026-0007', customer_nome: 'Ana Costa', equipamento: 'Dell Inspiron 15', valor_cobrado: 300.00, payment_status: 'parcial' },
    ],
  },
  grafico: [
    { mes: '2025-12', label: 'dez/25', receita: 1800, lucro: 900 },
    { mes: '2026-01', label: 'jan/26', receita: 2100, lucro: 1100 },
    { mes: '2026-02', label: 'fev/26', receita: 2500, lucro: 1300 },
    { mes: '2026-03', label: 'mar/26', receita: 2800, lucro: 1500 },
    { mes: '2026-04', label: 'abr/26', receita: 3000, lucro: 1700 },
    { mes: '2026-05', label: 'mai/26', receita: 3200, lucro: 1850 },
  ],
};

const MOCK_MES_ANTERIOR = {
  ...MOCK_ESTE_MES,
  periodo: { from: '2026-04-01T00:00:00.000Z', to: '2026-04-30T23:59:59.000Z', label: 'Mês anterior' },
  resumo: { receita: 3000.00, lucro: 1700.00, ticket_medio: 500.00, os_count: 6 },
};

const MOCK_VAZIO = {
  ...MOCK_ESTE_MES,
  resumo: { receita: 0, lucro: 0, ticket_medio: 0, os_count: 0 },
  a_receber: { total: 0, lista: [] },
};

// ─── beforeEach ────────────────────────────────────────────────────────────────

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch (e) { /* noop */ }
  });

  // Mock da API de financeiro — responde conforme o parâmetro 'periodo'
  await page.route(url => url.pathname === '/api/admin/financeiro', async (route) => {
    const urlObj = new URL(route.request().url());
    const periodo = urlObj.searchParams.get('periodo') || 'este_mes';
    const body = periodo === 'mes_anterior' ? MOCK_MES_ANTERIOR : MOCK_ESTE_MES;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
});

// ─── Testes ────────────────────────────────────────────────────────────────────

test.describe('Feature 010 — Painel Financeiro', () => {

  test('T01 — Página carrega com título e 4 cards de resumo preenchidos', async ({ page }) => {
    await page.goto('/admin/financeiro');
    await expect(page).toHaveTitle(/Financeiro — Iago Lopes/);
    await expect(page.locator('.page-title')).toHaveText('Financeiro');

    // Cards refletem os valores do mock
    await expect(page.locator('#card-receita')).toContainText('3.200,00');
    await expect(page.locator('#card-lucro')).toContainText('1.850,00');
    await expect(page.locator('#card-receber')).toContainText('750,00');
    await expect(page.locator('#card-ticket')).toContainText('533,33');

    // Subtítulos
    await expect(page.locator('#card-os-count')).toContainText('6 OS');
    await expect(page.locator('#card-margem')).toContainText('%');
  });

  test('T02 — Filtro de período troca os dados exibidos', async ({ page }) => {
    await page.goto('/admin/financeiro');
    await expect(page.locator('#card-receita')).toContainText('3.200,00');

    // Clica em "Mês anterior" — deve re-buscar e atualizar os cards
    await page.locator('.fin-period-btn[data-periodo="mes_anterior"]').click();

    await expect(page.locator('#card-receita')).toContainText('3.000,00');
    await expect(page.locator('#card-lucro')).toContainText('1.700,00');

    // O botão clicado fica ativo
    await expect(page.locator('.fin-period-btn[data-periodo="mes_anterior"]')).toHaveClass(/active/);
    await expect(page.locator('.fin-period-btn[data-periodo="este_mes"]')).not.toHaveClass(/active/);
  });

  test('T03 — Tabela A Receber lista OS pendentes com link para a ficha', async ({ page }) => {
    await page.goto('/admin/financeiro');

    // Aguarda a tabela renderizar
    await expect(page.locator('#receber-container table')).toBeVisible();

    // Duas OS na lista de mock
    const rows = page.locator('#receber-container tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(page.locator('#receber-container')).toContainText('OS-2026-0003');
    await expect(page.locator('#receber-container')).toContainText('João Souza');

    // Link para a ficha da OS
    const link = page.locator('#receber-container a[href="/admin/os/detalhes?id=os-uuid-1"]');
    await expect(link).toBeVisible();

    // Pills de situação de pagamento
    await expect(page.locator('.payment-pill.pendente')).toBeVisible();
    await expect(page.locator('.payment-pill.parcial')).toBeVisible();
  });

  test('T04 — Estado vazio quando não há valores a receber', async ({ page }) => {
    // Sobrescreve o mock para retornar tudo zerado
    await page.route(url => url.pathname === '/api/admin/financeiro', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VAZIO),
      });
    });

    await page.goto('/admin/financeiro');
    await expect(page.locator('#receber-container')).toContainText('Nenhum valor a receber');
    await expect(page.locator('#card-receita')).toContainText('0,00');
  });

  test('T05 — Botão "Personalizado" exibe os campos de data', async ({ page }) => {
    await page.goto('/admin/financeiro');

    // Range customizado começa oculto
    await expect(page.locator('#custom-range')).not.toBeVisible();

    await page.locator('.fin-period-btn[data-periodo="custom"]').click();

    // Campos de data aparecem
    await expect(page.locator('#custom-range')).toBeVisible();
    await expect(page.locator('#date-from')).toBeVisible();
    await expect(page.locator('#date-to')).toBeVisible();
  });

  test('T06 — Canvas do gráfico de tendência está presente', async ({ page }) => {
    await page.goto('/admin/financeiro');
    const canvas = page.locator('#grafico-financeiro');
    await expect(canvas).toBeVisible();

    // O canvas tem dimensão renderizada (financeiro.js define width/height)
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

});
