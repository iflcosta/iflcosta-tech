/**
 * Aroma Café — main.js
 * Minimal JS for genuine interactions only
 */

(function () {
  'use strict';

  /* ── Navbar scroll effect ───────────────────────────────── */
  const navbar = document.querySelector('.navbar');

  function onScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Mobile hamburger menu ──────────────────────────────── */
  const hamburger = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.querySelector('.navbar__mobile');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu when a link is clicked
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Scroll reveal ──────────────────────────────────────── */
  const reveals = document.querySelectorAll('[data-reveal]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );

  reveals.forEach((el) => observer.observe(el));

  /* ── Active nav link on scroll ──────────────────────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navbar__link[href^="#"]');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            link.classList.toggle(
              'active',
              link.getAttribute('href') === `#${id}`
            );
          });
        }
      });
    },
    { rootMargin: '-30% 0px -70% 0px' }
  );

  sections.forEach((sec) => sectionObserver.observe(sec));

  /* ── Smooth CTA scroll ──────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--navbar-h') || '72'
        );
        const top =
          target.getBoundingClientRect().top +
          window.pageYOffset -
          offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
})();
