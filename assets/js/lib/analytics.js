/**
 * GA4 analytics with LGPD consent gating.
 *
 * Coordination contract with consent.js:
 *   - We read current state via `getConsent()` (returns 'all' | 'essential' | null).
 *   - When the user accepts later in the session, consent.js MUST dispatch
 *     `window.dispatchEvent(new CustomEvent('ifl:consent-granted'))` on accept-all.
 *     We listen for that event once to bootstrap GA4 mid-session without a reload.
 *
 * PII hygiene:
 *   - No PII keys (nome, telefone, email, whats, mensagem) are ever sent to GA4.
 *   - The `track()` wrapper strips them defensively even if a caller slips up.
 *
 * Supported events (fired by callers, not here):
 *   form_open, form_field_focus, form_submit_attempt, form_submit_success,
 *   form_submit_error, whatsapp_redirect, whatsapp_open, cta_click,
 *   scroll_depth, faq_expand
 */

import { getConsent } from './consent.js';

const PII_KEYS = ['nome', 'telefone', 'email', 'whats', 'mensagem'];
const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js';
const CONSENT_EVENT = 'ifl:consent-granted';

let injected = false;

/**
 * Initialize GA4 if (and only if) the user has granted full consent.
 * Otherwise, register a one-time listener for `ifl:consent-granted` so
 * we can bootstrap immediately if the user accepts later in the session.
 *
 * @param {string} ga4Id - The GA4 measurement ID (e.g. "G-XXXXXXXXXX").
 */
export function initAnalytics(ga4Id) {
  if (!ga4Id) return; // no-op silently when no ID configured

  const consent = getConsent();

  if (consent === 'all') {
    injectGtag(ga4Id);
    return;
  }

  // consent === 'essential' or null: wait for opt-in mid-session.
  window.addEventListener(
    CONSENT_EVENT,
    () => {
      // Re-check at fire-time in case the event was dispatched for a non-all decision.
      if (getConsent() === 'all') injectGtag(ga4Id);
    },
    { once: true }
  );
}

/**
 * Fire a GA4 event. Silent no-op if gtag is not loaded (consent denied/pending).
 * Strips PII keys defensively before dispatching.
 *
 * @param {string} event - Event name (see header for supported list).
 * @param {Record<string, unknown>} [params] - Event params (no PII).
 */
export function track(event, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const clean = { ...params };
  let stripped = null;

  for (const key of PII_KEYS) {
    if (key in clean) {
      if (!stripped) stripped = [];
      stripped.push(key);
      delete clean[key];
    }
  }

  if (stripped && isLocalhost()) {
    // Dev-only warning so we catch leaks during build-out without polluting prod.
    // eslint-disable-next-line no-console
    console.warn(
      `[analytics] stripped PII keys from event "${event}": ${stripped.join(', ')}`
    );
  }

  window.gtag('event', event, clean);
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

function injectGtag(ga4Id) {
  if (injected) return;
  injected = true;

  // Stub the dataLayer + gtag shim BEFORE the remote script lands,
  // so any track() call between inject and load still queues correctly.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', ga4Id, { anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `${GTAG_SRC}?id=${encodeURIComponent(ga4Id)}`;
  document.head.appendChild(script);
}

function isLocalhost() {
  return (
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  );
}
