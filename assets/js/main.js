// main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle & Helpers
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDropdown = document.getElementById('mobile-menu-dropdown');
    const iconBars = document.getElementById('menu-icon-bars');
    const iconClose = document.getElementById('menu-icon-close');

    window.toggleMobileMenu = function(forceState) {
        if (!mobileMenuBtn || !mobileDropdown) return;
        const isCurrentlyOpen = !mobileDropdown.classList.contains('hidden');
        const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

        if (shouldOpen) {
            mobileDropdown.classList.remove('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', 'true');
            mobileMenuBtn.setAttribute('aria-label', 'Fechar Menu');
            if (iconBars) {
                iconBars.classList.add('hidden');
                iconBars.classList.remove('block');
            }
            if (iconClose) {
                iconClose.classList.remove('hidden');
                iconClose.classList.add('block');
            }
        } else {
            mobileDropdown.classList.add('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            mobileMenuBtn.setAttribute('aria-label', 'Abrir Menu');
            if (iconBars) {
                iconBars.classList.remove('hidden');
                iconBars.classList.add('block');
            }
            if (iconClose) {
                iconClose.classList.add('hidden');
                iconClose.classList.remove('block');
            }
        }
    };

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.toggleMobileMenu();
        });
    }

    // Fechar ao clicar nos links do menu mobile
    if (mobileDropdown) {
        const mobileLinks = mobileDropdown.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                window.toggleMobileMenu(false);
            });
        });
    }

    // Fechar ao clicar fora
    document.addEventListener('click', (event) => {
        if (!mobileDropdown || mobileDropdown.classList.contains('hidden')) return;
        const isClickInsideMenu = mobileDropdown.contains(event.target);
        const isClickOnButton = mobileMenuBtn && (mobileMenuBtn.contains(event.target) || mobileMenuBtn === event.target);
        if (!isClickInsideMenu && !isClickOnButton) {
            window.toggleMobileMenu(false);
        }
    });

    // Fechar no ESC
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' || event.key === 'Esc') {
            window.toggleMobileMenu(false);
        }
    });

    // Fechar no resize para desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            window.toggleMobileMenu(false);
        }
    });

    // 2. Header Scroll Effect
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header.classList.add('shadow-lg', 'shadow-cyan-500/5', 'bg-slate-900/90');
            header.classList.remove('bg-slate-900/75');
        } else {
            header.classList.remove('shadow-lg', 'shadow-cyan-500/5', 'bg-slate-900/90');
            header.classList.add('bg-slate-900/75');
        }
    });

    // 3. FAQ Accordion Logic
    const faqButtons = document.querySelectorAll('.faq-button');
    
    faqButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const content = document.getElementById(btn.getAttribute('aria-controls'));
            const icon = btn.querySelector('.faq-icon');
            const isExpanded = btn.getAttribute('aria-expanded') === 'true';

            // Close all other FAQs
            faqButtons.forEach(otherBtn => {
                if (otherBtn !== btn) {
                    otherBtn.setAttribute('aria-expanded', 'false');
                    const otherContent = document.getElementById(otherBtn.getAttribute('aria-controls'));
                    otherContent.style.maxHeight = null;
                    otherBtn.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
                }
            });

            // Toggle current FAQ
            if (!isExpanded) {
                btn.setAttribute('aria-expanded', 'true');
                content.style.maxHeight = content.scrollHeight + "px";
                icon.style.transform = 'rotate(180deg)';
            } else {
                btn.setAttribute('aria-expanded', 'false');
                content.style.maxHeight = null;
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });

    // 4. Scroll Reveal Animations (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px" // Trigger slightly before the element is fully in view
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Stop observing once revealed
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });
});
