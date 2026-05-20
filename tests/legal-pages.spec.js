// Smoke tests para páginas legais.
import { test, expect } from '@playwright/test';

test('/privacidade carrega e tem link de volta para home', async ({ page }) => {
  await page.goto('/privacidade');

  await expect(page.locator('h1')).toHaveText(/Política de Privacidade/);
  // Link de volta pra `/` (no header ou wordmark/footer)
  const homeLink = page.locator('a[href="/"]').first();
  await expect(homeLink).toBeVisible();
});

test('/termos carrega e tem link de volta para home', async ({ page }) => {
  await page.goto('/termos');

  await expect(page.locator('h1')).toHaveText(/Termos de Serviço/);
  const homeLink = page.locator('a[href="/"]').first();
  await expect(homeLink).toBeVisible();
});
