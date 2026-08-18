// main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuIcon = mobileMenuBtn.querySelector('i');

    mobileMenuBtn.addEventListener('click', () => {
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        mobileMenu.classList.toggle('hidden');
        
        // A11y: Atualiza o estado
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);

        // Toggle menu icon
        if (mobileMenu.classList.contains('hidden')) {
            mobileMenuIcon.setAttribute('data-lucide', 'menu');
        } else {
            mobileMenuIcon.setAttribute('data-lucide', 'x');
        }
        lucide.createIcons();
    });

    // Close menu when clicking on a link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            mobileMenuIcon.setAttribute('data-lucide', 'menu');
            lucide.createIcons();
        });
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
