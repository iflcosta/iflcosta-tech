// /assets/js/admin/login.js
// Lógica de frontend para a tela de login (Feature 004)

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const passwordForm = document.getElementById('password-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const feedback = document.getElementById('feedback');
  
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  
  const submitPasswordBtn = document.getElementById('submit-password-btn');
  const btnPasswordText = document.getElementById('btn-password-text');
  
  const togglePasswordBtn = document.getElementById('toggle-password-btn');
  const passwordSection = document.getElementById('password-section');

  // Recupera parâmetros da URL (next, error)
  const urlParams = new URLSearchParams(window.location.search);
  const nextParam = urlParams.get('next') || '/admin';
  const errorParam = urlParams.get('error');

  // Dicionário de mensagens de erro amigáveis
  const ERRORS = {
    session: 'Sua sessão expirou ou é inválida. Faça login novamente.',
    expired: 'O link de acesso expirou ou já foi utilizado. Solicite um novo link.',
    missing_code: 'Código de login ausente. Tente novamente ou use a senha.',
    invalid_credentials: 'E-mail ou senha inválidos.',
    server_error: 'Algo deu errado do nosso lado. Tente de novo.'
  };

  if (errorParam && ERRORS[errorParam]) {
    showFeedback(ERRORS[errorParam], 'error');
  }

  // Toggle da seção colapsável de senha
  togglePasswordBtn.addEventListener('click', () => {
    const isExpanded = togglePasswordBtn.getAttribute('aria-expanded') === 'true';
    togglePasswordBtn.setAttribute('aria-expanded', !isExpanded);
    passwordSection.classList.toggle('expanded');
    
    // Atualiza a seta do botão
    const textSpan = togglePasswordBtn.querySelector('span');
    if (isExpanded) {
      textSpan.textContent = '▸ Entrar com senha tradicional';
    } else {
      textSpan.textContent = '▾ Entrar com senha tradicional';
      // Foca no input de senha quando abre
      setTimeout(() => passwordInput.focus(), 150);
    }
  });

  // Envio de Magic Link
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const email = emailInput.value.trim();
    if (!validateEmail(email)) {
      showFeedback('Insira um e-mail válido.', 'error');
      emailInput.focus();
      return;
    }

    setLoading(submitBtn, btnText, true, 'Enviando link...');

    try {
      const response = await fetch('/api/admin/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        showFeedback(result.message || 'Link de acesso enviado! Verifica seu e-mail.', 'success');
        loginForm.reset();
      } else {
        showFeedback(result.message || 'Erro ao enviar o link. Tente novamente.', 'error');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Erro de conexão. Tente novamente mais tarde.', 'error');
    } finally {
      setLoading(submitBtn, btnText, false, 'Receber link de acesso');
    }
  });

  // Login por Senha
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateEmail(email)) {
      showFeedback('Insira um e-mail válido primeiro.', 'error');
      emailInput.focus();
      return;
    }

    if (!password) {
      showFeedback('A senha é obrigatória.', 'error');
      passwordInput.focus();
      return;
    }

    setLoading(submitPasswordBtn, btnPasswordText, true, 'Entrando...');

    try {
      const response = await fetch('/api/admin/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        // Sucesso! Redireciona para o painel administrativo
        window.location.assign(nextParam);
      } else {
        showFeedback(result.message || 'E-mail ou senha inválidos.', 'error');
        passwordInput.value = '';
        passwordInput.focus();
      }
    } catch (err) {
      console.error(err);
      showFeedback('Erro de conexão. Tente novamente mais tarde.', 'error');
    } finally {
      setLoading(submitPasswordBtn, btnPasswordText, false, 'Entrar com senha');
    }
  });

  // Helpers
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `feedback-message show feedback-message--${type}`;
  }

  function hideFeedback() {
    feedback.className = 'feedback-message';
    feedback.textContent = '';
  }

  function setLoading(button, textElement, isLoading, loadingText = '') {
    if (isLoading) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      textElement.textContent = loadingText;
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      textElement.textContent = loadingText;
    }
  }
});
