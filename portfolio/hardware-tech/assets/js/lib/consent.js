/* ============================================================
   LGPD Consent banner — iflcosta.tech landing
   Shows the cookie consent banner, persists the user's choice
   in localStorage, and dispatches `ifl:consent-granted` when
   the user accepts all (so analytics can lazy-init).
   ============================================================ */

const STORAGE_KEY = 'ifl-consent';
const BANNER_SELECTOR = '[data-consent-banner]';
const BUTTON_SELECTOR = '[data-consent]';
const VISIBLE_CLASS = 'is-visible';
const SHOW_DELAY_MS = 1500;
const ENTER_TRANSITION_MS = 100;
const EXIT_TRANSITION_MS = 400;

function showBanner(banner) {
  if (!banner) return;
  banner.removeAttribute('hidden');
  setTimeout(() => banner.classList.add(VISIBLE_CLASS), ENTER_TRANSITION_MS);
}

function hideBanner(banner) {
  if (!banner) return;
  banner.classList.remove(VISIBLE_CLASS);
  setTimeout(() => banner.setAttribute('hidden', ''), EXIT_TRANSITION_MS);
}

function normalizeChoice(raw) {
  // HTML uses data-consent="accept" | "essential".
  // Spec storage values are 'all' | 'essential'.
  return raw === 'accept' || raw === 'all' ? 'all' : 'essential';
}

export function getConsent() {
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === 'all' || value === 'essential') return value;
  return null;
}

export function initConsent() {
  const banner = document.querySelector(BANNER_SELECTOR);
  if (!banner) return;

  if (!getConsent()) {
    setTimeout(() => showBanner(banner), SHOW_DELAY_MS);
  }

  document.querySelectorAll(BUTTON_SELECTOR).forEach((btn) => {
    btn.addEventListener('click', () => {
      const level = normalizeChoice(btn.dataset.consent);
      localStorage.setItem(STORAGE_KEY, level);
      hideBanner(banner);

      if (level === 'all') {
        window.dispatchEvent(
          new CustomEvent('ifl:consent-granted', { detail: { level: 'all' } })
        );
      }
    });
  });
}
