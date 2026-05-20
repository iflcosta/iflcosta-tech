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

  // Seletores da etapa 2 (OTP)
  const emailStepContainer = document.getElementById('email-step-container');
  const otpStepContainer = document.getElementById('otp-step-container');
  const otpInput = document.getElementById('otp');
  const submitOtpBtn = document.getElementById('submit-otp-btn');
  const btnOtpText = document.getElementById('btn-otp-text');
  const backToEmailBtn = document.getElementById('back-to-email-btn');
  const resendOtpBtn = document.getElementById('resend-otp-btn');

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
    invalid_token: 'Código de acesso inválido ou expirado. Tente de novo.',
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

  // Envio do e-mail para solicitar Magic Link / OTP
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
        showFeedback('Link e código de acesso enviados! Você pode clicar no link ou digitar o código abaixo.', 'success');
        // Transiciona para a etapa de inserção do OTP
        emailStepContainer.style.display = 'none';
        otpStepContainer.style.display = 'flex';
        otpInput.value = '';
        otpInput.focus();
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

  // Voltar para a etapa do e-mail
  backToEmailBtn.addEventListener('click', () => {
    hideFeedback();
    otpStepContainer.style.display = 'none';
    emailStepContainer.style.display = 'flex';
    emailInput.focus();
  });

  // Reenviar código OTP
  resendOtpBtn.addEventListener('click', async () => {
    hideFeedback();
    const email = emailInput.value.trim();
    
    resendOtpBtn.disabled = true;
    resendOtpBtn.textContent = 'Enviando...';

    try {
      const response = await fetch('/api/admin/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        showFeedback('Novo código enviado com sucesso! Verifique sua caixa de entrada.', 'success');
      } else {
        showFeedback(result.message || 'Erro ao reenviar o código. Tente novamente.', 'error');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Erro de conexão. Tente novamente mais tarde.', 'error');
    } finally {
      resendOtpBtn.disabled = false;
      resendOtpBtn.textContent = 'Reenviar código';
    }
  });

  // Enviar código OTP para validação
  submitOtpBtn.addEventListener('click', handleOtpSubmit);
  otpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleOtpSubmit();
    }
  });

  async function handleOtpSubmit() {
    hideFeedback();
    const email = emailInput.value.trim();
    const otp = otpInput.value.trim();

    if (!otp || otp.length < 6 || otp.length > 8 || !/^\d+$/.test(otp)) {
      showFeedback('Insira o código de acesso numérico válido.', 'error');
      otpInput.focus();
      return;
    }

    setLoading(submitOtpBtn, btnOtpText, true, 'Confirmando...');

    try {
      const response = await fetch('/api/admin/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        showFeedback('Autenticação bem-sucedida! Redirecionando...', 'success');
        window.location.assign(nextParam);
      } else {
        showFeedback(result.message || 'Código de acesso inválido ou expirado.', 'error');
        otpInput.focus();
      }
    } catch (err) {
      console.error(err);
      showFeedback('Erro de conexão ao verificar o código. Tente de novo.', 'error');
    } finally {
      setLoading(submitOtpBtn, btnOtpText, false, 'Confirmar e Entrar');
    }
  }

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
