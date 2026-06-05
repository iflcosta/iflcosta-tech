/**
 * ImóvelPrime — main.js
 * Interactivity: scrolling header, mobile menu, scroll reveal, hero transition trigger
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Hero background zoom-out effect on load
  const heroBg = document.getElementById('hero-bg');
  if (heroBg) {
    // Add small delay to ensure rendering starts smoothly
    setTimeout(() => {
      heroBg.classList.add('loaded');
    }, 100);
  }

  // 2. Navbar Scroll Effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // 3. Mobile Navigation Hamburger Menu Toggle
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileLinks = mobileNav ? mobileNav.querySelectorAll('a') : [];

  if (hamburger && mobileNav) {
    const toggleMenu = () => {
      const isActive = hamburger.classList.toggle('active');
      mobileNav.classList.toggle('open', isActive);
      hamburger.setAttribute('aria-expanded', isActive);
      document.body.style.overflow = isActive ? 'hidden' : '';
    };

    hamburger.addEventListener('click', toggleMenu);

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // 4. Scroll Reveal Observer
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
      rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }
});
