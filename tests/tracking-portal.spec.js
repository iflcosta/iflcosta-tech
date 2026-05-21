// /tests/tracking-portal.spec.js
// E2E Tests — Feature 006: Portal Público de Rastreamento de OS (Tracking Upgrade)
// Testes T13–T19 cobrindo as novas funcionalidades do portal /rastrear
import { test, expect } from '@playwright/test';

// ─── Mocks de dados sanitizados (como a API de tracking retorna) ─────────────

const MOCK_OS_CLASSIC = {
  os_number: 'OS-2026-0001',
  status: 'diagnostico',
  is_custom_pc: false,
  payment_status: 'pendente',
  digital_warranty_code: 'WARR-2026-A1B2C3',
  garantia_dias: 90,
  prazo_prometido: '2026-05-25T18:00:00.000Z',
  created_at: '2026-05-20T10:00:00.000Z',
  entregue_at: null,
  cliente: { nome: 'Maria' },
  equipamento: {
    tipo: 'Celular',
    marca: 'Apple',
    modelo: 'iPhone 13 Pro',
    serial: 'F17F****B123',
  },
  fotos: [
    { id: 'p1', url: '/assets/images/placeholder.jpg', tipo: 'antes' },
  ],
  historico: [
    {
      id: 'h1',
      status: 'rascunho',
      entered_at: '2026-05-20T10:00:00.000Z',
      exited_at: '2026-05-20T10:02:00.000Z',
      duration_seconds: 120,
      public_notes: null,
    },
    {
      id: 'h2',
      status: 'diagnostico',
      entered_at: '2026-05-20T10:02:00.000Z',
      exited_at: null,
      duration_seconds: null,
      public_notes: 'Aparelho aberto para analise interna dos componentes.',
    },
  ],
  pecas: [
    {
      id: 'pc1',
      qty: 1,
      nome: 'Modulo de Tela Original Apple',
      categoria: 'peca',
      subcategoria: 'Tela',
      component_category: null,
      specs: {},
    },
  ],
};

const MOCK_OS_CUSTOM_PC = {
  ...MOCK_OS_CLASSIC,
  os_number: 'OS-2026-0002',
  status: 'em_conserto',
  is_custom_pc: true,
  payment_status: 'parcial',
  digital_warranty_code: 'WARR-2026-D4E5F6',
  cliente: { nome: 'Joao' },
  equipamento: {
    tipo: 'Custom PC',
    marca: 'Custom Build',
    modelo: 'Gamer Pro 2026',
    serial: 'N/A',
  },
  historico: [
    {
      id: 'h1',
      status: 'rascunho',
      entered_at: '2026-05-19T09:00:00.000Z',
      exited_at: '2026-05-19T09:10:00.000Z',
      duration_seconds: 600,
      public_notes: null,
    },
    {
      id: 'h2',
      status: 'em_conserto',
      entered_at: '2026-05-20T08:00:00.000Z',
      exited_at: null,
      duration_seconds: null,
      public_notes: 'Montagem em andamento. CPU e RAM instaladas com sucesso.',
    },
  ],
  pecas: [
    {
      id: 'pc1',
      qty: 1,
      nome: 'Intel Core i9-14900K',
      categoria: 'componente_pc',
      component_category: 'CPU',
      specs: { cores: 24, threads: 32, speed: 5600 },
    },
    {
      id: 'pc2',
      qty: 2,
      nome: 'Kingston Fury Beast DDR5 32GB',
      categoria: 'componente_pc',
      component_category: 'RAM',
      specs: { capacity: 64, speed: 6000 },
    },
    {
      id: 'pc3',
      qty: 1,
      nome: 'NVIDIA RTX 4080 Super',
      categoria: 'componente_pc',
      component_category: 'GPU',
      specs: { vram: 16 },
    },
  ],
};

// ─── Helpers de mock de rede ──────────────────────────────────────────────────

async function mockTrackingApi(page) {
  await page.route(
    (url) => url.pathname === '/api/admin/os/tracking',
    async (route) => {
      const params = new URL(route.request().url()).searchParams;
      const token  = params.get('token') || params.get('tracking_token');

      if (token === 'token-classico') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: MOCK_OS_CLASSIC }),
        });
      } else if (token === 'token-custom-pc') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: MOCK_OS_CUSTOM_PC }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'not_found' }),
        });
      }
    }
  );
}

// Helper: espera o conteúdo principal aparecer
async function waitForContent(page) {
  await expect(page.locator('#tracking-content')).toBeVisible({ timeout: 15000 });
}

// ─── beforeEach ───────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.dismiss());
  await mockTrackingApi(page);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T13 — Número da OS no header
// ═══════════════════════════════════════════════════════════════════════════════
test('T13 — Portal: exibe numero da OS no formato OS-YYYY-NNNN no badge do header', async ({ page }) => {
  await page.goto('/rastrear?token=token-classico');
  await waitForContent(page);

  const badge = page.locator('#os-number-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('OS-2026-0001');
});

// ═══════════════════════════════════════════════════════════════════════════════
// T14 — Notas públicas aparecem na timeline
// ═══════════════════════════════════════════════════════════════════════════════
test('T14 — Portal: public_notes aparecem no card de status ativo e na timeline', async ({ page }) => {
  await page.goto('/rastrear?token=token-classico');
  await waitForContent(page);

  // Nota no card de status ativo
  const activeNote = page.locator('#active-note');
  await expect(activeNote).toBeVisible();
  await expect(activeNote).toContainText('Aparelho aberto para analise interna');

  // Nota na timeline (classe .tl-public-note)
  const tlNotes = page.locator('.tl-public-note');
  const count   = await tlNotes.count();
  expect(count).toBeGreaterThanOrEqual(1);
  await expect(tlNotes.first()).toContainText('Aparelho aberto para analise interna');
});

// ═══════════════════════════════════════════════════════════════════════════════
// T15 — Custom PC: grid de hardware renderizado
// ═══════════════════════════════════════════════════════════════════════════════
test('T15 — Portal Custom PC: grid de hardware e renderizado com is_custom_pc=true', async ({ page }) => {
  await page.goto('/rastrear?token=token-custom-pc');
  await waitForContent(page);

  // Badge CUSTOM PC visivel
  const badgePC = page.locator('#badge-custom-pc');
  await expect(badgePC).toBeVisible();

  // Grid de hardware existe
  const pcGrid = page.locator('.pc-grid');
  await expect(pcGrid).toBeVisible();

  // Exatamente 3 cards (CPU, RAM, GPU do mock)
  const cards = page.locator('.pc-card');
  await expect(cards).toHaveCount(3);

  // Primeiro card: CPU com nome do processador
  await expect(cards.first()).toContainText('Intel Core i9-14900K');

  // Todos os cards têm badge "Instalado"
  const instaladoBadges = page.locator('.pc-card-status');
  await expect(instaladoBadges).toHaveCount(3);
  await expect(instaladoBadges.first()).toContainText('Instalado');
});

// ═══════════════════════════════════════════════════════════════════════════════
// T16 — Layout clássico de peças (sem Custom PC)
// ═══════════════════════════════════════════════════════════════════════════════
test('T16 — Portal classico: lista de pecas simples sem precos exibida', async ({ page }) => {
  await page.goto('/rastrear?token=token-classico');
  await waitForContent(page);

  // Badge CUSTOM PC nao deve estar visivel
  const badgePC = page.locator('#badge-custom-pc');
  await expect(badgePC).not.toBeVisible();

  // Grid de Custom PC nao existe
  await expect(page.locator('.pc-grid')).toHaveCount(0);

  // Lista classica de pecas visivel
  const parts = page.locator('.part-row');
  await expect(parts).toHaveCount(1);
  await expect(parts.first()).toContainText('Modulo de Tela Original Apple');

  // Sem formato de preço (R$ X,XX) no conteudo principal
  const contentText = await page.locator('#tracking-content').innerText();
  const hasBRLPrice = /R\$\s*\d+[,.]\d{2}/.test(contentText);
  expect(hasBRLPrice).toBe(false);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T17 — Garantia digital e botão de cópia
// ═══════════════════════════════════════════════════════════════════════════════
test('T17 — Portal: codigo de garantia exibido e botao de copia funciona', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/rastrear?token=token-classico');
  await waitForContent(page);

  // Bloco de garantia visivel
  const codeBlock = page.locator('#w-code-block');
  await expect(codeBlock).toBeVisible();

  // Codigo correto
  const codeEl = page.locator('#w-code');
  await expect(codeEl).toBeVisible();
  await expect(codeEl).toContainText('WARR-2026-A1B2C3');

  // Clicar em "Copiar"
  const btnCopy = page.locator('#btn-copy-warranty');
  await expect(btnCopy).toBeVisible();
  await btnCopy.click();

  // Feedback visual de copiado
  await expect(btnCopy).toContainText('Copiado', { timeout: 2000 });

  // Conteudo do clipboard
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe('WARR-2026-A1B2C3');
});

// ═══════════════════════════════════════════════════════════════════════════════
// T18 — Badge de payment_status
// ═══════════════════════════════════════════════════════════════════════════════
test('T18 — Portal: badge de payment_status exibe texto correto para pendente e parcial', async ({ page }) => {
  // pendente
  await page.goto('/rastrear?token=token-classico');
  await waitForContent(page);

  const badge1 = page.locator('#w-payment .payment-badge');
  await expect(badge1).toBeVisible();
  await expect(badge1).toContainText('Acerto na Retirada');
  await expect(badge1).toHaveClass(/pendente/);

  // parcial (Custom PC)
  await page.goto('/rastrear?token=token-custom-pc');
  await waitForContent(page);

  const badge2 = page.locator('#w-payment .payment-badge');
  await expect(badge2).toContainText('Entrada Paga');
  await expect(badge2).toHaveClass(/parcial/);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T19 — Token inválido: tela de erro amigável
// ═══════════════════════════════════════════════════════════════════════════════
test('T19 — Portal: token invalido exibe tela de erro e esconde conteudo', async ({ page }) => {
  await page.goto('/rastrear?token=token-invalido-qualquer');

  const errorBox = page.locator('#tracking-error');
  await expect(errorBox).toBeVisible({ timeout: 10000 });
  // Texto de erro visivel
  await expect(errorBox).toContainText('Inv');

  // Conteudo principal oculto
  await expect(page.locator('#tracking-content')).not.toBeVisible();
  // Footer WhatsApp oculto
  await expect(page.locator('#wa-footer')).not.toBeVisible();
});
