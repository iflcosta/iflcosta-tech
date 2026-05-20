/**
 * orcamento-form.js
 *
 * Orchestrador do formulário de orçamento (modal + página /orcamento).
 * Integra: phone-mask, form-validation, draft sessionStorage, fetch /api/leads,
 * analytics e redirect WhatsApp pós-submit.
 *
 * Uso em main.js:
 *   import { initOrcamentoForm, recordFormOpen } from './lib/orcamento-form.js';
 *   initOrcamentoForm();                              // configura todos os forms
 *   recordFormOpen('modal', ctaLocation);             // chamado ao abrir o modal
 */

import { attachPhoneMask } from './phone-mask.js';
import { validateField, validateForm } from './form-validation.js';
import { track } from './analytics.js';

const DRAFT_PREFIX = 'ifl-form-draft:';
const OPEN_TS_PREFIX = '_t_form_open:';
const DRAFT_TTL_MS = 5 * 60 * 1000; // 5 min

// Valores do HTML do modal usam hífens; DB usa underscores + sufixos.
const SERVICE_MAP = {
  'celular':        'celular_tablet',
  'celular_tablet': 'celular_tablet',
  'notebook-pc':    'notebook_pc',
  'notebook_pc':    'notebook_pc',
  'custom-pc':      'custom_pc',
  'custom_pc':      'custom_pc',
  'suporte-ti':     'suporte_ti',
  'suporte_ti':     'suporte_ti',
  'outro':          'outro',
};

// ─────────────────────────────────────────────────────────────────────────────
// Ponto de entrada
// ─────────────────────────────────────────────────────────────────────────────

export function initOrcamentoForm() {
  document.querySelectorAll('[data-orcamento-form]').forEach(setupForm);
}

/**
 * Registra o timestamp de abertura do formulário (anti-bot timing) e dispara
 * o evento de analytics form_open. Deve ser chamado por main.js ao abrir o modal.
 *
 * @param {string} mode - 'modal' | 'page'
 * @param {string} [ctaLocation] - 'hero' | 'servicos' | 'final' | 'float' | 'header'
 */
export function recordFormOpen(mode, ctaLocation = '') {
  sessionStorage.setItem(OPEN_TS_PREFIX + mode, Date.now().toString());
  track('form_open', { form_type: mode, cta_location: ctaLocation });
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup por form
// ─────────────────────────────────────────────────────────────────────────────

function setupForm(form) {
  const mode = form.dataset.mode || 'modal';

  // Máscara de telefone (o modal usa name="whats", /orcamento usa name="telefone")
  const telInput = form.querySelector('[name="whats"], [name="telefone"]');
  if (telInput) attachPhoneMask(telInput);

  // Restaurar draft da sessão
  restoreDraft(form, mode);

  // Salvar draft a cada input
  form.addEventListener('input', () => saveDraft(form, mode));

  // Validação no blur + primeiro focus (analytics)
  const tracked = new Set();
  form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea').forEach(field => {
    if (field.closest('[aria-hidden="true"]')) return; // pula honeypot

    field.addEventListener('blur', () => validateField(field));

    field.addEventListener('focus', () => {
      if (!tracked.has(field.name)) {
        tracked.add(field.name);
        track('form_field_focus', { form_type: mode, field_name: field.name || '' });
      }
    });
  });

  // Funcionalidades extras da página /orcamento
  if (mode === 'page') {
    recordFormOpen('page'); // timestamp anti-bot logo ao carregar a página
    setupConditionalFields(form);
    setupCharCount(form);
  }

  form.addEventListener('submit', e => handleSubmit(e, form, mode));
}

// ─────────────────────────────────────────────────────────────────────────────
// Campos condicionais (Custom PC)
// ─────────────────────────────────────────────────────────────────────────────

function setupConditionalFields(form) {
  const conditionals = form.querySelectorAll('[data-cond-servico]');
  if (!conditionals.length) return;

  function update() {
    const selected = form.querySelector('[name="servico"]:checked')?.value || '';
    conditionals.forEach(el => {
      el.hidden = el.dataset.condServico !== selected;
    });
  }

  form.querySelectorAll('[name="servico"]').forEach(input => {
    input.addEventListener('change', update);
  });
  update();
}

// ─────────────────────────────────────────────────────────────────────────────
// Contador de caracteres
// ─────────────────────────────────────────────────────────────────────────────

function setupCharCount(form) {
  const textarea = form.querySelector('[name="mensagem"]');
  const counter = form.querySelector('[id^="char-count-"]');
  if (!textarea || !counter) return;

  const max = parseInt(textarea.maxLength) || 1500;

  function update() {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${max}`;
    counter.classList.toggle('is-warn', len >= max * 0.8);
    counter.classList.toggle('is-max', len >= max);
  }

  textarea.addEventListener('input', update);
  update();
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleSubmit(e, form, mode) {
  e.preventDefault();

  // Validação client-side
  if (!validateForm(form)) {
    track('form_submit_error', { form_type: mode, error_code: 'client_validation' });
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const submitBtn = form.querySelector('[type="submit"]');
  const successEl = form.querySelector('[data-form-success]');
  const errorEl = form.querySelector('[data-form-error]');

  setLoading(submitBtn, true);
  if (errorEl) errorEl.hidden = true;

  const openedAt = parseInt(sessionStorage.getItem(OPEN_TS_PREFIX + mode) || '0');
  const payload = collectPayload(form, openedAt, mode);

  track('form_submit_attempt', { form_type: mode });

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.ok && data.redirect) {
      track('form_submit_success', { form_type: mode, servico: payload.servico });
      clearDraft(mode);
      showSuccess(successEl);

      if (mode === 'modal') {
        document.dispatchEvent(new CustomEvent('ifl:modal-success'));
      }

      setTimeout(() => {
        track('whatsapp_redirect', { from_form: mode });
        window.location.assign(data.redirect);
      }, 800);

    } else if (data.ok && !data.redirect) {
      // Honeypot / timing disparados → fake success pro bot
      showSuccess(successEl);
      if (mode === 'modal') {
        document.dispatchEvent(new CustomEvent('ifl:modal-success'));
      }

    } else {
      showError(errorEl, data.message || 'Algo deu errado. Tenta de novo.');
      track('form_submit_error', { form_type: mode, error_code: data.error || 'server' });
      setLoading(submitBtn, false);
    }

  } catch {
    showError(errorEl, 'Não consegui enviar. Tenta de novo ou fala direto no WhatsApp: (11) 91969-1542');
    track('form_submit_error', { form_type: mode, error_code: 'network' });
    setLoading(submitBtn, false);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload
// ─────────────────────────────────────────────────────────────────────────────

function collectPayload(form, openedAt, mode) {
  const fd = new FormData(form);
  const rawServico = fd.get('servico') || '';

  return {
    nome:         (fd.get('nome') || '').trim(),
    telefone:     fd.get('whats') || fd.get('telefone') || '',
    email:        fd.get('email')?.trim() || null,
    servico:      SERVICE_MAP[rawServico] || rawServico,
    mensagem:     fd.get('problema')?.trim() || fd.get('mensagem')?.trim() || null,
    cidade:       fd.get('cidade') || null,
    urgencia:     fd.get('urgencia') || null,
    origem:       mode,
    cta_location: form.dataset.ctaLocation || null,
    consent:      fd.get('consent') === 'on' || fd.get('consent') === 'true',
    website:      fd.get('website') || '',
    referrer:     document.referrer || null,
    _t:           openedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.setAttribute('aria-busy', loading ? 'true' : 'false');
  btn.textContent = loading ? 'Enviando…' : 'Enviar orçamento';
}

function showSuccess(el) {
  if (!el) return;
  el.removeAttribute('hidden');
}

function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.removeAttribute('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft (sessionStorage, TTL 5 min)
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_SKIP = new Set(['consent', 'website']);

function saveDraft(form, mode) {
  const fd = new FormData(form);
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (DRAFT_SKIP.has(k) || typeof v !== 'string') continue;
    data[k] = v;
  }
  try {
    sessionStorage.setItem(
      DRAFT_PREFIX + mode,
      JSON.stringify({ data, expires: Date.now() + DRAFT_TTL_MS })
    );
  } catch { /* quota exceeded ou modo privado */ }
}

function restoreDraft(form, mode) {
  const raw = sessionStorage.getItem(DRAFT_PREFIX + mode);
  if (!raw) return;
  try {
    const { data, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      sessionStorage.removeItem(DRAFT_PREFIX + mode);
      return;
    }
    Object.entries(data).forEach(([k, v]) => {
      const field = form.querySelector(`[name="${CSS.escape(k)}"]`);
      if (field && field.type !== 'radio' && field.type !== 'checkbox') {
        field.value = v;
      }
    });
  } catch { /* JSON corrompido */ }
}

function clearDraft(mode) {
  sessionStorage.removeItem(DRAFT_PREFIX + mode);
}
