// Smoke tests da landing pública "Iago Lopes | Hardware & Tech"
// Cada test() é isolado; setup compartilhado em test.beforeEach.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  // Garante estado limpo: sem cookies, sem consent salvo, sem theme.
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch (e) {
      /* noop */
    }
  });
});

test('home renderiza com todas seções principais', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Iago Lopes \| Hardware & Tech/);

  await expect(page.locator('#hero-title')).toBeVisible();
  await expect(page.locator('#servicos')).toBeVisible();
  await expect(page.locator('#como-funciona')).toBeVisible();
  await expect(page.locator('#por-que')).toBeVisible();
  await expect(page.locator('#areas')).toBeVisible();
  await expect(page.locator('#faq')).toBeVisible();
  await expect(page.locator('#contato')).toBeVisible();
  await expect(page.locator('footer.site-footer')).toBeVisible();
});

test('theme toggle alterna entre claro e escuro', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');
  const initial = await html.getAttribute('data-theme');

  await page.locator('[data-theme-toggle]').click();
  const afterFirst = await html.getAttribute('data-theme');
  expect(afterFirst).not.toBeNull();
  expect(afterFirst).not.toBe(initial);

  await page.locator('[data-theme-toggle]').click();
  const afterSecond = await html.getAttribute('data-theme');
  expect(afterSecond).not.toBe(afterFirst);

  const stored = await page.evaluate(() => localStorage.getItem('ifl-theme'));
  expect(stored).toBeTruthy();
});

test('modal de orçamento abre, fecha por X, e fecha por Esc', async ({ page }) => {
  await page.goto('/');

  const backdrop = page.locator('[data-modal]');
  await expect(backdrop).not.toHaveClass(/is-open/);

  await page.locator('[data-modal-open][data-cta-location="hero"]').click();
  await expect(backdrop).toHaveClass(/is-open/);
  await expect(page.locator('#modal-title')).toBeVisible();
  await expect(page.locator('#modal-title')).toHaveText(/Pedir orçamento/);

  await page.locator('[data-modal-close]').first().click();
  await expect(backdrop).not.toHaveClass(/is-open/);

  // Reabre e fecha com Esc
  await page.locator('[data-modal-open][data-cta-location="hero"]').click();
  await expect(backdrop).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(backdrop).not.toHaveClass(/is-open/);
});

test('chips de serviço selecionam um por vez no modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-modal-open][data-cta-location="hero"]').click();

  const customPc = page.locator('.modal .chip[data-service="custom-pc"]');
  const celular = page.locator('.modal .chip[data-service="celular"]');

  await customPc.click();
  await expect(customPc).toHaveClass(/is-active/);

  await celular.click();
  await expect(celular).toHaveClass(/is-active/);
  await expect(customPc).not.toHaveClass(/is-active/);

  // Garante que só um chip está ativo
  const activeCount = await page.locator('.modal .chip.is-active').count();
  expect(activeCount).toBe(1);
});

test('submit do form sem checkbox de consent falha (browser-level validation)', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-modal-open][data-cta-location="hero"]').click();

  await page.locator('#nome').fill('Fulano de Teste');
  await page.locator('#whats').fill('(11) 99999-9999');

  // form tem novalidate, então checkValidity() é o canal correto
  const isValid = await page.evaluate(() => {
    const f = document.querySelector('[data-orcamento-form]');
    return f ? f.checkValidity() : null;
  });
  expect(isValid).toBe(false);

  const consentValidation = await page.locator('input[name="consent"]').evaluate(
    (el) => el.validationMessage
  );
  expect(consentValidation.length).toBeGreaterThan(0);
});

test('FAQ expande e colapsa', async ({ page }) => {
  await page.goto('/');

  const first = page.locator('details.faq-item').first();
  await expect(first).not.toHaveAttribute('open', '');

  await first.locator('summary').click();
  await expect(first).toHaveAttribute('open', '');

  await first.locator('summary').click();
  await expect(first).not.toHaveAttribute('open', '');
});

test('WhatsApp float aparece após scroll do hero', async ({ page }) => {
  await page.goto('/');

  const waFloat = page.locator('[data-wa-float]');
  await expect(waFloat).not.toHaveClass(/is-visible/);

  // Scrolla pra além de ~30% da altura do hero (JS dispara em y > heroHeight * 0.3)
  await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const h = hero ? hero.offsetHeight : window.innerHeight;
    window.scrollTo(0, Math.floor(h * 0.6));
  });

  await expect(waFloat).toHaveClass(/is-visible/, { timeout: 1500 });
});

test('banner LGPD aparece após delay e persiste escolha', async ({ page }) => {
  await page.goto('/');

  const banner = page.locator('[data-consent-banner]');
  // O JS atrasa em 1500ms; expect com timeout flexível cobre isso.
  await expect(banner).toBeVisible({ timeout: 3000 });

  await page.locator('[data-consent="essential"]').click();
  await expect(banner).toBeHidden({ timeout: 2000 });

  const stored = await page.evaluate(() => localStorage.getItem('ifl-consent'));
  expect(stored).toBe('essential');
});

test('skip link funciona', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const focusedClass = await page.evaluate(() =>
    document.activeElement ? document.activeElement.className : ''
  );
  expect(focusedClass).toContain('skip-link');

  await page.keyboard.press('Enter');
  // Após enter, o foco/scroll vai pra #main
  await expect(page).toHaveURL(/#main/);
});

test('navegação por âncora dos links do header faz scroll suave', async ({ page }) => {
  // O nav só aparece em ≥ 768px; redimensiona pra desktop.
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');

  await page.locator('.site-nav a[href="#servicos"]').click();

  await expect(page).toHaveURL(/#servicos/);

  // Aguarda o smooth scroll completar
  await expect.poll(async () => page.evaluate(() => window.scrollY), {
    timeout: 2000,
  }).toBeGreaterThan(0);
});
