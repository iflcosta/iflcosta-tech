/* ============================================================
   App — Iago Lopes Hardware & Tech Landing
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Theme toggle ---------- */
  const STORAGE_KEY = 'ifl-theme';

  function applyTheme(theme) {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }

  const themeToggleBtn = document.querySelector('[data-theme-toggle]');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const isDark = current === 'dark' || (!current && matchMedia('(prefers-color-scheme: dark)').matches);
      applyTheme(isDark ? 'light' : 'dark');
    });
  }

  /* ---------- Sticky header shadow on scroll ---------- */
  const header = document.querySelector('[data-site-header]');
  const waFloat = document.querySelector('[data-wa-float]');
  const hero = document.querySelector('.hero');

  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (waFloat && hero) {
      const heroHeight = hero.offsetHeight;
      waFloat.classList.toggle('is-visible', y > heroHeight * 0.3);
    }
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Modal ---------- */
  const modalBackdrop = document.querySelector('[data-modal]');
  const modalCloseBtns = document.querySelectorAll('[data-modal-close]');
  const modalServiceInput = document.querySelector('[data-modal-service]');
  let lastFocused = null;

  function openModal(service) {
    if (!modalBackdrop) return;
    lastFocused = document.activeElement;
    modalBackdrop.classList.add('is-open');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Set service chip
    if (service) {
      const chips = modalBackdrop.querySelectorAll('.chip');
      chips.forEach((c) => c.classList.toggle('is-active', c.dataset.service === service));
      if (modalServiceInput) modalServiceInput.value = service;
    }

    // Focus first input
    setTimeout(() => {
      const firstInput = modalBackdrop.querySelector('input, textarea');
      if (firstInput) firstInput.focus();
    }, 200);
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('is-open');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.querySelectorAll('[data-modal-open]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(btn.dataset.service);
    });
  });

  modalCloseBtns.forEach((b) => b.addEventListener('click', closeModal));

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('is-open')) {
      closeModal();
    }
  });

  // Service chips inside modal
  const chips = document.querySelectorAll('.modal .chip');
  chips.forEach((c) => {
    c.addEventListener('click', () => {
      chips.forEach((x) => x.classList.remove('is-active'));
      c.classList.add('is-active');
      if (modalServiceInput) modalServiceInput.value = c.dataset.service || '';
    });
  });

  /* ---------- Form submit simulation ---------- */
  const orcamentoForm = document.querySelector('[data-orcamento-form]');
  if (orcamentoForm) {
    orcamentoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = orcamentoForm.querySelector('[type="submit"]');
      const successEl = orcamentoForm.querySelector('[data-form-success]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando…';
      }
      setTimeout(() => {
        if (successEl) successEl.removeAttribute('hidden');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Enviar orçamento';
        }
        setTimeout(closeModal, 1400);
      }, 800);
    });
  }

  /* ---------- FAQ — only one open at a time (optional UX) ---------- */
  // Letting native behavior handle expansion; no enforcement of single-open.

  /* ---------- LGPD Consent ---------- */
  const CONSENT_KEY = 'ifl-consent';
  const consentBanner = document.querySelector('[data-consent-banner]');

  function showConsent() {
    if (!consentBanner) return;
    consentBanner.removeAttribute('hidden');
    setTimeout(() => consentBanner.classList.add('is-visible'), 100);
  }

  function hideConsent() {
    if (!consentBanner) return;
    consentBanner.classList.remove('is-visible');
    setTimeout(() => consentBanner.setAttribute('hidden', ''), 400);
  }

  if (!localStorage.getItem(CONSENT_KEY)) {
    setTimeout(showConsent, 1500);
  }

  document.querySelectorAll('[data-consent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, btn.dataset.consent);
      hideConsent();
    });
  });

  /* ---------- Smooth-scroll for nav anchors (already handled by CSS, but offset for sticky) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          const top = el.getBoundingClientRect().top + window.scrollY - 72;
          window.scrollTo({ top, behavior: 'smooth' });
          history.pushState(null, '', id);
        }
      }
    });
  });

  /* ---------- Subtle entrance reveal ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
  }
})();
