/* ============================================================
   Theme toggle — iflcosta.tech landing
   Handles runtime toggle behavior only. The anti-FOUC inline
   script in <head> is responsible for applying the persisted
   theme before first paint.
   ============================================================ */

const STORAGE_KEY = 'ifl-theme';
const TOGGLE_SELECTOR = '[data-theme-toggle]';

function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

function syncToggleState(btn) {
  if (!btn) return;
  const current = document.documentElement.getAttribute('data-theme');
  const isDark =
    current === 'dark' ||
    (!current && matchMedia('(prefers-color-scheme: dark)').matches);
  btn.setAttribute('aria-pressed', String(isDark));
  if (!btn.hasAttribute('aria-label')) {
    btn.setAttribute('aria-label', 'Alternar tema');
  }
}

export function initTheme() {
  const btn = document.querySelector(TOGGLE_SELECTOR);
  if (!btn) return;

  syncToggleState(btn);

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const isDark =
      current === 'dark' ||
      (!current && matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(isDark ? 'light' : 'dark');
    syncToggleState(btn);
  });
}
