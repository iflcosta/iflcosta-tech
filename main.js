/**
 * iflStudio Landing Page — main.js
 * Ultra-minimal Vanilla JS. Zero dependencies.
 * All interactions fallback gracefully if JS fails.
 */

(function () {
  'use strict';

  /* ─── Navbar Scroll & Shadow ─── */
  const navbar = document.getElementById('navbar');
  const floatingCta = document.getElementById('floating-cta');
  let lastScrollY = 0;
  let ticking = false;

  function onScroll() {
    lastScrollY = window.scrollY;
    if (!ticking) {
      window.requestAnimationFrame(() => {
        // Navbar shadow on scroll
        if (lastScrollY > 20) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        // Show floating CTA after 400px
        if (floatingCta) {
          if (lastScrollY > 400) {
            floatingCta.classList.add('visible');
          } else {
            floatingCta.classList.remove('visible');
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // Initial check on load
  onScroll();

  /* ─── Hamburger / Mobile Menu ─── */
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburgerBtn.classList.toggle('active', isOpen);
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburgerBtn.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ─── Smooth Scroll for All Anchor Links ─── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        
        // Let scroll-padding-top handle the navbar height
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  /* ─── PageSpeed Metrics Ring Animation ─── */
  const psWidget = document.querySelector('.pagespeed-widget');
  if (psWidget) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          psWidget.classList.add('ps-active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    observer.observe(psWidget);
  }

  /* ─── Speed Simulator ─── */
  const simulateBtn = document.getElementById('simulate-btn');
  const barFast = document.getElementById('bar-fast');
  const barSlow = document.getElementById('bar-slow');
  const timeFast = document.getElementById('time-fast');
  const timeSlow = document.getElementById('time-slow');
  const speedImpact = document.getElementById('speed-impact');

  if (simulateBtn && barFast && barSlow && timeFast && timeSlow) {
    simulateBtn.addEventListener('click', () => {
      // Disable button during simulation
      simulateBtn.disabled = true;
      simulateBtn.textContent = 'Simulando...';

      // Reset bars and timers
      barFast.style.width = '0%';
      barSlow.style.width = '0%';
      timeFast.textContent = '0.0s';
      timeSlow.textContent = '0.0s';
      if (speedImpact) speedImpact.classList.remove('visible');

      const start = performance.now();
      const durationFast = 400;  // 0.4s
      const durationSlow = 5600; // 5.6s

      // Animate Fast Column
      const fastInterval = setInterval(() => {
        const elapsed = performance.now() - start;
        const pct = Math.min(100, (elapsed / durationFast) * 100);
        const timeSec = Math.min(0.4, elapsed / 1000).toFixed(1) + 's';
        
        barFast.style.width = pct + '%';
        barFast.setAttribute('aria-valuenow', Math.round(pct));
        timeFast.textContent = timeSec;

        if (pct >= 100) {
          clearInterval(fastInterval);
          timeFast.textContent = '0.4s ⚡';
        }
      }, 30);

      // Animate Slow Column
      const slowInterval = setInterval(() => {
        const elapsed = performance.now() - start;
        const pct = Math.min(100, (elapsed / durationSlow) * 100);
        const timeSec = Math.min(5.6, elapsed / 1000).toFixed(1) + 's';
        
        barSlow.style.width = pct + '%';
        barSlow.setAttribute('aria-valuenow', Math.round(pct));
        timeSlow.textContent = timeSec;

        if (pct >= 100) {
          clearInterval(slowInterval);
          timeSlow.textContent = '5.6s 🐌';
          
          // Show impact message and re-enable button
          if (speedImpact) speedImpact.classList.add('visible');
          simulateBtn.disabled = false;
          simulateBtn.textContent = '▶ Re-simular';
        }
      }, 30);
    });
  }

  /* ─── Jargon Translator Tabs ─── */
  const tradutorTabs = document.querySelectorAll('.tradutor-tab');
  const tradutorPanels = document.querySelectorAll('.tradutor-panel');

  if (tradutorTabs.length && tradutorPanels.length) {
    tradutorTabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        // Deactivate all tabs
        tradutorTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        // Deactivate all panels
        tradutorPanels.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('hidden', '');
        });

        // Activate selected tab & panel
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) {
          panel.classList.add('active');
          panel.removeAttribute('hidden');
        }
      });
    });
  }

  /* ─── Portfolio Bento Grid Filters ─── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioCards = document.querySelectorAll('.bento-card');

  if (filterBtns.length && portfolioCards.length) {
    // Show active filter cards on load
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const initialFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'lps';
    applyPortfolioFilter(initialFilter);

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        const filter = btn.dataset.filter;
        applyPortfolioFilter(filter);
      });
    });
  }

  function applyPortfolioFilter(filter) {
    const gridEl = document.getElementById('portfolio-grid');
    if (gridEl) {
      gridEl.classList.remove('filter-all', 'filter-lps', 'filter-performance', 'filter-automacao', 'filter-infra');
      gridEl.classList.add('filter-' + filter);
    }

    portfolioCards.forEach(card => {
      const cardCategory = card.dataset.category;
      if (filter === 'all') {
        card.classList.remove('filtered-out');
      } else if (cardCategory === filter) {
        card.classList.remove('filtered-out');
      } else {
        card.classList.add('filtered-out');
      }
    });
  }

  /* ─── ROI Calculator ─── */
  const inputInvestment = document.getElementById('input-investment');
  const sliderInvestment = document.getElementById('slider-investment');
  const inputSpeed = document.getElementById('input-speed');
  const sliderSpeed = document.getElementById('slider-speed');
  const roiLoss = document.getElementById('roi-loss');
  const roiDesc = document.getElementById('roi-desc');

  if (inputInvestment && sliderInvestment && inputSpeed && sliderSpeed) {
    const formatBRL = (val) => {
      return val.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
      });
    };

    function calculateROI() {
      const spend = parseFloat(inputInvestment.value) || 10000;
      const speed = parseFloat(inputSpeed.value) || 5;

      /**
       * Model based on Google/Deloitte mobile speed research:
       * - Every second above 1s reduces conversion rates by ~7% compound.
       * - Efficiency = 0.93^(seconds_above_1s)
       * - Ideal baseline LCP target: 0.4s (efficiency = 1.0)
       */
      const TARGET_LCP = 0.4;
      const secondsAboveBaseline = Math.max(0, speed - 1);
      const currentEfficiency = Math.pow(0.93, secondsAboveBaseline);
      const targetEfficiency = Math.pow(0.93, Math.max(0, TARGET_LCP - 1)); // = 1.0

      const conversionLossFraction = Math.max(0, 1 - currentEfficiency);
      const wasted = spend * conversionLossFraction;
      
      // Potential conversion uplift percentage
      const conversionGainPercent = currentEfficiency > 0
        ? Math.round(((targetEfficiency / currentEfficiency) - 1) * 100)
        : 0;

      // Update slider backgrounds (optional styling, but nice)
      const investmentPct = ((spend - 1000) / (100000 - 1000)) * 100;
      sliderInvestment.style.background = `linear-gradient(to right, var(--c-primary) 0%, var(--c-primary) ${investmentPct}%, var(--c-border) ${investmentPct}%)`;

      const speedPct = ((speed - 0.5) / (15 - 0.5)) * 100;
      sliderSpeed.style.background = `linear-gradient(to right, var(--c-primary) 0%, var(--c-primary) ${speedPct}%, var(--c-border) ${speedPct}%)`;

      if (roiLoss) roiLoss.textContent = formatBRL(wasted);

      if (roiDesc) {
        if (speed <= 1) {
          roiDesc.textContent = `Sua página já está na velocidade ideal! Fantástico.`;
        } else {
          roiDesc.textContent = `Com LCP de 0.4s, sua taxa de conversão aumentaria ~${conversionGainPercent}%, recuperando esse valor todo mês.`;
        }
      }
    }

    // Sync Investment Input -> Slider
    inputInvestment.addEventListener('input', () => {
      sliderInvestment.value = inputInvestment.value;
      calculateROI();
    });

    // Sync Investment Slider -> Input
    sliderInvestment.addEventListener('input', () => {
      inputInvestment.value = sliderInvestment.value;
      calculateROI();
    });

    // Sync Speed Input -> Slider
    inputSpeed.addEventListener('input', () => {
      sliderSpeed.value = inputSpeed.value;
      calculateROI();
    });

    // Sync Speed Slider -> Input
    sliderSpeed.addEventListener('input', () => {
      inputSpeed.value = sliderSpeed.value;
      calculateROI();
    });
    
    // Initial run
    calculateROI();
  }

  /* ─── Multi-step Diagnostic Quiz Form ─── */
  const diagnosticForm = document.getElementById('diagnostic-form');
  const formSteps = [
    document.getElementById('form-step-1'),
    document.getElementById('form-step-2'),
    document.getElementById('form-step-3')
  ];
  const stepDots = [
    document.getElementById('step-dot-1'),
    document.getElementById('step-dot-2'),
    document.getElementById('step-dot-3')
  ];
  const formSuccess = document.getElementById('form-success');

  if (diagnosticForm && formSteps[0]) {
    let currentStepIdx = 0;

    // Next Step buttons
    const step1Next = document.getElementById('step1-next');
    const step2Next = document.getElementById('step2-next');

    // Prev Step buttons
    const step2Prev = document.getElementById('step2-prev');
    const step3Prev = document.getElementById('step3-prev');

    function showStep(stepIdx) {
      formSteps.forEach((step, idx) => {
        if (idx === stepIdx) {
          step.classList.remove('hidden');
        } else {
          step.classList.add('hidden');
        }
      });

      stepDots.forEach((dot, idx) => {
        if (dot) {
          if (idx === stepIdx) {
            dot.classList.add('active');
            dot.setAttribute('aria-label', `Passo ${idx + 1} atual`);
          } else {
            dot.classList.remove('active');
            dot.setAttribute('aria-label', `Passo ${idx + 1}`);
          }
        }
      });
      currentStepIdx = stepIdx;
    }

    function validateStep(stepIdx) {
      const stepEl = formSteps[stepIdx];
      if (!stepEl) return false;

      // Find required inputs in step
      const inputs = stepEl.querySelectorAll('input[required]');
      let isValid = true;

      inputs.forEach(input => {
        if (input.type === 'radio') {
          // Check if at least one radio in the group is checked
          const name = input.name;
          const groupChecked = stepEl.querySelector(`input[name="${name}"]:checked`);
          if (!groupChecked) {
            isValid = false;
          }
        } else {
          // Regular text/email inputs
          if (!input.value.trim() || !input.checkValidity()) {
            isValid = false;
          }
        }
      });

      if (!isValid) {
        // Shake animation for visual error feedback
        stepEl.classList.add('form-shake');
        setTimeout(() => {
          stepEl.classList.remove('form-shake');
        }, 300);
      }

      return isValid;
    }

    if (step1Next) {
      step1Next.addEventListener('click', () => {
        if (validateStep(0)) {
          showStep(1);
        }
      });
    }

    if (step2Next) {
      step2Next.addEventListener('click', () => {
        if (validateStep(1)) {
          showStep(2);
        }
      });
    }

    if (step2Prev) {
      step2Prev.addEventListener('click', () => {
        showStep(0);
      });
    }

    if (step3Prev) {
      step3Prev.addEventListener('click', () => {
        showStep(1);
      });
    }

    // Submit handler
    diagnosticForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (validateStep(2)) {
        // Capturar dados selecionados
        const gargaloEl = diagnosticForm.querySelector('input[name="gargalo"]:checked');
        const gargaloVal = gargaloEl ? gargaloEl.value : '';
        const gargaloMap = {
          'velocidade': 'Velocidade das LPs dos meus clientes',
          'manual': 'Trabalho manual repetitivo da equipe',
          'ferramenta': 'Falta de braço técnico para criar ferramentas'
        };
        const gargaloTexto = gargaloMap[gargaloVal] || gargaloVal;

        const orcamentoEl = diagnosticForm.querySelector('input[name="orcamento"]:checked');
        const orcamentoVal = orcamentoEl ? orcamentoEl.value : '';
        const orcamentoMap = {
          'ate5k': 'Até R$ 5.000/mês',
          '5k-20k': 'R$ 5.000 – R$ 20.000/mês',
          '20k-100k': 'R$ 20.000 – R$ 100.000/mês',
          'acima100k': 'Acima de R$ 100.000/mês'
        };
        const orcamentoTexto = orcamentoMap[orcamentoVal] || orcamentoVal;

        const nome = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const whatsapp = document.getElementById('contact-whatsapp').value;

        // Formatar mensagem do WhatsApp
        const msg = `Olá, Iago! Acabei de responder o diagnóstico no site. Aqui estão minhas respostas:

*Nome:* ${nome}
*E-mail:* ${email}
*WhatsApp:* ${whatsapp}
*Maior Gargalo:* ${gargaloTexto}
*Investimento mensal:* ${orcamentoTexto}

Gostaria de agendar a reunião de 15 minutos.`;

        // Atualizar o link de agendamento na tela de sucesso
        const calendlyLink = document.getElementById('calendly-link');
        if (calendlyLink) {
          calendlyLink.href = `https://wa.me/5511919691542?text=${encodeURIComponent(msg)}`;
        }

        // Hide form steps and progress indicator
        formSteps.forEach(step => step.classList.add('hidden'));
        
        const stepsContainer = diagnosticForm.querySelector('.form-steps');
        if (stepsContainer) stepsContainer.style.display = 'none';

        // Show success screen
        if (formSuccess) {
          formSuccess.classList.remove('hidden');
        }
      }
    });

    // Option cards selection handling (clicking custom card selects hidden radio)
    document.querySelectorAll('.option-card').forEach(card => {
      card.addEventListener('click', () => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          // Trigger click-like styling or changes if needed, CSS has :has() support
        }
      });
    });
  }

})();
