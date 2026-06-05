/**
 * Verde Vivo — main.js
 * Interactivity: scrolling header, mobile menu, scroll reveal, scroll progress
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Scroll Progress Bar & Navbar Scroll Effect
  const navbar = document.getElementById('navbar');
  const progressBar = document.getElementById('progress-bar');

  const handleScroll = () => {
    const scrollY = window.scrollY;
    
    // Navbar visual feedback
    if (scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Scroll progress calculations
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    
    if (progressBar) {
      progressBar.style.width = `${scrolled}%`;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  // Run once on load to set initial state
  handleScroll();

  // 2. Hamburger Mobile Menu Toggle
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];

  if (hamburger && mobileMenu) {
    const toggleMobileMenu = () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    hamburger.addEventListener('click', toggleMobileMenu);

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // 3. Scroll Reveal Observer
  const reveals = document.querySelectorAll('.reveal');
  
  if ('IntersectionObserver' in window && reveals.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once animated, no need to track it anymore
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    reveals.forEach(el => el.classList.add('visible'));
  }
});
