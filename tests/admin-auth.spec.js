// Smoke/E2E tests para autenticação e navegação do Painel Admin (Feature 004)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ context, page }) => {
  // Garante estado limpo: sem cookies, sem localStorage
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch (e) {
      /* noop */
    }
  });
});

test.describe('Tela de Login Admin', () => {
  test('deve carregar com elementos acessíveis e formulários adequados', async ({ page }) => {
    await page.goto('/admin/login');

    await expect(page).toHaveTitle(/Entrar no Painel — Iago Lopes/);
    await expect(page.locator('#login-title')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#submit-btn')).toBeVisible();

    // O campo de senha deve começar oculto/colapsado
    const passwordSection = page.locator('#password-section');
    await expect(passwordSection).not.toHaveClass(/expanded/);

    // Axe a11y audit
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    // Filtra apenas violações graves/críticas
    const criticalViolations = accessibilityResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(criticalViolations.length).toBe(0);
  });

  test('deve alternar a exibição da seção de senha tradicional', async ({ page }) => {
    await page.goto('/admin/login');

    const toggleBtn = page.locator('#toggle-password-btn');
    const passwordSection = page.locator('#password-section');
    const passwordInput = page.locator('#password');

    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(passwordSection).not.toHaveClass(/expanded/);

    // Clica para expandir
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(passwordSection).toHaveClass(/expanded/);
    await expect(passwordInput).toBeFocused();

    // Clica para colapsar novamente
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(passwordSection).not.toHaveClass(/expanded/);
  });

  test('deve exibir mensagem de feedback ao tentar enviar e-mail inválido', async ({ page }) => {
    await page.goto('/admin/login');

    await page.locator('#email').fill('invalido-email');
    await page.locator('#submit-btn').click();

    const feedback = page.locator('#feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveClass(/feedback-message--error/);
    await expect(feedback).toHaveText('Insira um e-mail válido.');
  });
});

test.describe('Navegação e Layout do Painel Admin', () => {
  // Nota: Como o middleware Vercel roda no Edge em produção, localmente com o static serve,
  // nós acessamos diretamente o /admin sem cookies reais de auth do middleware.
  // Vamos validar o carregamento dos elementos de layout e navegação do admin shell.
  
  test('deve renderizar Sidebar, Header, Drawer e Menu do Usuário no Dashboard', async ({ page }) => {
    // A sidebar é desktop-only (display:none < 1024px) — força viewport desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin');

    await expect(page).toHaveTitle(/Dashboard — Iago Lopes/);

    // Elementos principais do Shell estrutural do admin
    await expect(page.locator('.admin-sidebar')).toBeVisible();
    await expect(page.locator('.admin-header')).toBeVisible();
    
    // Links de navegação essenciais na Sidebar
    const dashboardLink = page.locator('.admin-sidebar a[href="/admin"]').first();
    const leadsLink = page.locator('.admin-sidebar a[href="/admin/leads"]').first();
    const clientesLink = page.locator('.admin-sidebar a[href="/admin/clientes"]').first();
    const osLink = page.locator('.admin-sidebar a[href="/admin/os"]').first();
    const estoqueLink = page.locator('.admin-sidebar a[href="/admin/estoque"]').first();
    const wikiLink = page.locator('.admin-sidebar a[href="/admin/wiki"]').first();
    const configLink = page.locator('.admin-sidebar a[href="/admin/configuracoes"]').first();

    await expect(dashboardLink).toBeVisible();
    await expect(leadsLink).toBeVisible();
    await expect(clientesLink).toBeVisible();
    await expect(osLink).toBeVisible();
    await expect(estoqueLink).toBeVisible();
    await expect(wikiLink).toBeVisible();
    await expect(configLink).toBeVisible();

    // Verifica que o link do Dashboard está marcado como ativo
    await expect(dashboardLink).toHaveClass(/active/);
  });

  test('deve interagir com menu hambúrguer (mobile drawer) e fechar via botão X', async ({ page }) => {
    // Força viewport mobile-first
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');

    const drawer = page.locator('#admin-drawer');
    const backdrop = page.locator('#drawer-backdrop');
    const hamburgerBtn = page.locator('#hamburger-btn');
    const closeBtn = page.locator('#close-drawer-btn');

    await expect(drawer).not.toHaveClass(/open/);
    await expect(backdrop).not.toHaveClass(/open/);

    // Abre o menu lateral
    await hamburgerBtn.click();
    await expect(drawer).toHaveClass(/open/);
    await expect(backdrop).toHaveClass(/open/);

    // Fecha o menu lateral
    await closeBtn.click();
    await expect(drawer).not.toHaveClass(/open/);
    await expect(backdrop).not.toHaveClass(/open/);
  });

  test('deve alternar temas persistentes claro e escuro no admin', async ({ page }) => {
    await page.goto('/admin');

    const html = page.locator('html');
    const themeBtn = page.locator('#theme-toggle-btn');
    
    // Captura estado inicial
    const initialTheme = await html.getAttribute('data-theme') || 'light';

    // Clica para alternar
    await themeBtn.click();
    const nextTheme = await html.getAttribute('data-theme');
    expect(nextTheme).not.toBeNull();
    expect(nextTheme).not.toBe(initialTheme);

    // Verifica persistência no localStorage
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedTheme).toBe(nextTheme);
  });

  test('deve carregar stubs corretamente com o link de menu ativo correto', async ({ page }) => {
    // O link ativo é checado na sidebar (desktop-only) — força viewport desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    const pagesToVerify = [
      { url: '/admin/leads', title: /Leads — Iago Lopes/, text: 'Gestão de Leads' },
      { url: '/admin/clientes', title: /Clientes — Iago Lopes/, text: 'Fichas de Clientes' },
      { url: '/admin/os', title: /Ordens de Serviço — Iago Lopes/, text: 'Ordens de Serviço' },
      { url: '/admin/estoque', title: /Estoque — Iago Lopes/, text: 'Estoque & Peças' },
      { url: '/admin/wiki', title: /Wiki — Iago Lopes/, text: 'Wiki & Procedimentos' },
      { url: '/admin/configuracoes', title: /Configurações — Iago Lopes/, text: 'Configurações' }
    ];

    for (const p of pagesToVerify) {
      await page.goto(p.url);
      await expect(page).toHaveTitle(p.title);
      await expect(page.locator('.page-title')).toHaveText(p.text);
      
      // O link correto na Sidebar deve estar marcado como ativo
      const activeLink = page.locator(`.admin-sidebar a.admin-nav-item.active[href="${p.url}"]`);
      await expect(activeLink).toBeVisible();
    }
  });

  test('deve conter botão de logout com redirecionamento de api', async ({ page }) => {
    // O 1º link de logout fica na sidebar (desktop-only) — força viewport desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/configuracoes');

    const logoutBtn = page.locator('a[href="/api/admin/auth-logout"]').first();
    await expect(logoutBtn).toBeVisible();
    await expect(logoutBtn).toHaveAttribute('href', '/api/admin/auth-logout');
  });
});
