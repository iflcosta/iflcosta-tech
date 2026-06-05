// /assets/js/admin/layout.js
// Injetor dinâmico do layout base do admin (Feature 004)

document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.admin-shell');
  if (!shell) return;

  const pathname = window.location.pathname;

  // 1. Definição dos itens de navegação do painel
  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Leads', path: "../../../admin/leads', icon: '⚡' },
    { label: 'Clientes', path: "../../../admin/clientes', icon: '👥' },
    { label: 'Ordens de Serviço', path: "../../../admin/os', icon: '🛠️' },
    { label: 'Estoque', path: "../../../admin/estoque', icon: '📦' },
    { label: 'Financeiro', path: "../../../admin/financeiro', icon: '💰' },
    { label: 'Wiki', path: "../../../admin/wiki', icon: '📖' },
    { label: 'Configurações', path: "../../../admin/configuracoes', icon: '⚙️' }
  ];

  // Identifica qual item de menu está ativo
  const getActiveIndex = () => {
    const path = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    return navItems.findIndex(item => {
      if (item.path === '/admin') {
        return path === '/admin';
      }
      return path.startsWith(item.path);
    });
  };

  const activeIndex = getActiveIndex();

  // 2. Monta o HTML do Menu Lateral (Sidebar)
  const navHtml = navItems.map((item, index) => {
    const isActive = index === activeIndex ? 'active' : '';
    return `<a href="${item.path}" class="admin-nav-item ${isActive}">
      <span>${item.icon}</span>
      <span>${item.label}</span>
    </a>`;
  }).join('');

  const sidebarHtml = `
    <aside class="admin-sidebar">
      <div class="admin-logo-wrapper">
        <a href="/admin" class="admin-logo">IL | Hardware & Tech</a>
      </div>
      <nav class="admin-nav">
        ${navHtml}
      </nav>
      <div class="admin-user-menu">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div class="user-avatar">IL</div>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: var(--text-sm); font-weight: var(--font-semibold);">Iago Lopes</span>
            <span style="font-size: 10px; color: var(--color-text-tertiary);">Administrador</span>
          </div>
        </div>
        <a href="/api/admin/auth-logout" style="text-decoration: none; font-size: var(--text-base); opacity: 0.7; transition: opacity var(--duration-fast);" title="Sair do painel">🚪</a>
      </div>
    </aside>
  `;

  // 3. Monta o HTML do Header
  const headerHtml = `
    <header class="admin-header">
      <div class="admin-header-left">
        <button id="hamburger-btn" class="hamburger-btn" aria-label="Abrir menu de navegação">☰</button>
        <span style="font-weight: var(--font-semibold); font-size: var(--text-sm); color: var(--color-text-secondary);" class="desktop-only-text">Painel de Gestão Solo</span>
      </div>
      <div class="admin-header-right">
        <button id="theme-toggle-btn" class="hamburger-btn" aria-label="Alternar tema" style="font-size: var(--text-base);">🌓</button>
        <a href="/api/admin/auth-logout" class="btn btn--outline" style="padding: var(--space-2) var(--space-3); font-size: var(--text-xs); border-radius: var(--radius-md); display: inline-flex; align-items: center; gap: var(--space-2); text-decoration: none; border-color: var(--color-border-subtle); color: var(--color-text-secondary);">
          <span>Sair</span>
        </a>
      </div>
    </header>
  `;

  // 4. Monta o Drawer (Menu Mobile)
  const drawerHtml = `
    <div id="drawer-backdrop" class="admin-drawer-backdrop"></div>
    <div id="admin-drawer" class="admin-drawer">
      <div class="admin-drawer-header">
        <span style="font-weight: var(--font-bold); font-size: var(--text-base);">Menu</span>
        <button id="close-drawer-btn" class="hamburger-btn">✕</button>
      </div>
      <nav class="admin-nav">
        ${navHtml}
      </nav>
      <div class="admin-user-menu">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div class="user-avatar">IL</div>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: var(--text-sm); font-weight: var(--font-semibold);">Iago Lopes</span>
            <span style="font-size: 10px; color: var(--color-text-tertiary);">Admin</span>
          </div>
        </div>
        <a href="/api/admin/auth-logout" style="text-decoration: none; font-size: var(--text-base);">🚪</a>
      </div>
    </div>
  `;

  // Injeta os elementos dinâmicos no shell
  shell.insertAdjacentHTML('afterbegin', sidebarHtml + headerHtml + drawerHtml);

  // 5. Configuração da interatividade do Drawer Mobile
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const drawer = document.getElementById('admin-drawer');
  const backdrop = document.getElementById('drawer-backdrop');

  const openDrawer = () => {
    backdrop.classList.add('open');
    drawer.classList.add('open');
  };

  const closeDrawer = () => {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
  };

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // 6. Sincronização do tema e persistência
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
});
