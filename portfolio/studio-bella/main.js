/**
 * Studio Bella — main.js
 * Interactivity: scrolling header, mobile menu, scroll reveal
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navbar Scroll Effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }
  }, { passive: true });

  // 2. Mobile Menu Toggle
  const hamburger = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-menu__link');

  if (hamburger && mobileMenu) {
    const toggleMenu = () => {
      const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !isExpanded);
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = !isExpanded ? 'hidden' : '';
    };

    hamburger.addEventListener('click', toggleMenu);

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // 3. Scroll Reveal
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }
});
