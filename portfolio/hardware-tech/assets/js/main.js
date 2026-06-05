/**
 * main.js — entry point da landing iflcosta.tech
 *
 * Importa e inicializa todos os módulos lib/ e implementa comportamentos
 * específicos da landing (sticky header, modal, smooth scroll, reveal, analytics).
 *
 * Carregado como <script type="module"> — já é deferred por padrão.
 */

import { initTheme }         from './lib/theme.js';
import { initConsent }       from './lib/consent.js';
import { initAnalytics, track } from './lib/analytics.js';
import { initOrcamentoForm, recordFormOpen } from './lib/orcamento-form.js';

// GA4 Measurement ID — configure em index.html via:
//   <script>window.IFL_GA4_ID = 'G-XXXXXXXXXX';</script>
// Deixe vazio para desabilitar analytics (silencioso).
const GA4_ID = (typeof window !== 'undefined' && window.IFL_GA4_ID) || '';

// ─────────────────────────────────────────────────────────────────────────────
// Estado módulo (declarado antes dos init() para evitar TDZ)
// ─────────────────────────────────────────────────────────────────────────────

let modalBackdrop = null;
let lastFocused = null;

// ─────────────────────────────────────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────────────────────────────────────

initTheme();
initConsent();
initAnalytics(GA4_ID);
initOrcamentoForm();

initStickyHeader();
initWaFloat();
initModal();
initSmoothScroll();
initReveal();
initFaqTracking();
initCtaTracking();
initScrollDepth();

// ─────────────────────────────────────────────────────────────────────────────
// Sticky header
// ─────────────────────────────────────────────────────────────────────────────

function initStickyHeader() {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  document.addEventListener('scroll', update, { passive: true });
  update();
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp float
// ─────────────────────────────────────────────────────────────────────────────

function initWaFloat() {
  const waFloat = document.querySelector('[data-wa-float]');
  const hero = document.querySelector('.hero');
  if (!waFloat) return;

  const update = () => {
    const threshold = hero ? hero.offsetHeight * 0.3 : 300;
    waFloat.classList.toggle('is-visible', window.scrollY > threshold);
  };
  document.addEventListener('scroll', update, { passive: true });
  update();

  waFloat.addEventListener('click', () => {
    track('whatsapp_open', { cta_location: 'float' });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

function initModal() {
  modalBackdrop = document.querySelector('[data-modal]');
  if (!modalBackdrop) return;

  // Abrir modal
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openModal(btn.dataset.service || '', btn.dataset.ctaLocation || '');
    });
  });

  // Fechar modal
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalBackdrop.classList.contains('is-open')) closeModal();
  });

  // Service chips
  const chips = modalBackdrop.querySelectorAll('.chip');
  const serviceInput = modalBackdrop.querySelector('[data-modal-service]');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      if (serviceInput) serviceInput.value = chip.dataset.service || '';
    });
  });

  // Fechar após submit bem-sucedido (orcamento-form.js despacha este evento)
  document.addEventListener('ifl:modal-success', () => {
    setTimeout(closeModal, 1400);
  });
}

function openModal(service, ctaLocation) {
  if (!modalBackdrop) return;
  lastFocused = document.activeElement;
  modalBackdrop.classList.add('is-open');
  modalBackdrop.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Pré-selecionar chip do serviço
  if (service) {
    const chips = modalBackdrop.querySelectorAll('.chip');
    const serviceInput = modalBackdrop.querySelector('[data-modal-service]');
    chips.forEach(c => c.classList.toggle('is-active', c.dataset.service === service));
    if (serviceInput) serviceInput.value = service;
  }

  // Timestamp anti-bot + evento form_open
  recordFormOpen('modal', ctaLocation);

  // Foco no primeiro campo
  setTimeout(() => {
    const first = modalBackdrop.querySelector(
      'input:not([type="hidden"]):not([tabindex="-1"]), textarea'
    );
    if (first) first.focus();
  }, 200);
}

function closeModal() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.remove('is-open');
  modalBackdrop.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

// ─────────────────────────────────────────────────────────────────────────────
// Smooth scroll para âncoras nav
// ─────────────────────────────────────────────────────────────────────────────

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
      history.pushState(null, '', id);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reveal (IntersectionObserver)
// ─────────────────────────────────────────────────────────────────────────────

function initReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(el => io.observe(el));
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics — FAQ expand
// ─────────────────────────────────────────────────────────────────────────────

function initFaqTracking() {
  document.querySelectorAll('.faq-item').forEach((item, index) => {
    item.addEventListener('toggle', e => {
      if (e.target.open) {
        track('faq_expand', { question_index: index });
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics — CTA clicks + WhatsApp direto
// ─────────────────────────────────────────────────────────────────────────────

function initCtaTracking() {
  // Botões que abrem o modal
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      track('cta_click', { cta_location: btn.dataset.ctaLocation || 'unknown' });
    });
  });

  // Links diretos para wa.me (exceto o float, que já rastreia em initWaFloat)
  document.querySelectorAll('a[href^="https://wa.me"]').forEach(a => {
    if (a.closest('[data-wa-float]')) return;
    a.addEventListener('click', () => {
      const location = a.dataset.ctaLocation
        || a.closest('[data-cta-location]')?.dataset.ctaLocation
        || 'unknown';
      track('whatsapp_open', { cta_location: location });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics — scroll depth (25 / 50 / 75 / 100%)
// ─────────────────────────────────────────────────────────────────────────────

function initScrollDepth() {
  const checkpoints = [25, 50, 75, 100];
  const fired = new Set();

  document.addEventListener('scroll', () => {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    const pct = Math.round((scrolled / total) * 100);

    for (const depth of checkpoints) {
      if (!fired.has(depth) && pct >= depth) {
        fired.add(depth);
        track('scroll_depth', { depth });
      }
    }
  }, { passive: true });
}
