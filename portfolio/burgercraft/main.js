/**
 * BurgerCraft — main.js
 * Interactivity and copy coupon helper
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }
  }, { passive: true });

  // Mobile Menu Toggle
  const hamburger = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
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
});

// Copy Coupon Code (Global function for inline onclick in HTML)
function copyCoupon() {
  const couponText = document.getElementById('coupon-code').innerText.trim();
  const copyBtn = document.querySelector('.cta-banner__copy-btn');
  const btnText = copyBtn.querySelector('span');

  navigator.clipboard.writeText(couponText).then(() => {
    copyBtn.classList.add('copied');
    btnText.innerText = 'Copiado!';

    setTimeout(() => {
      copyBtn.classList.remove('copied');
      btnText.innerText = 'Copiar';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}
