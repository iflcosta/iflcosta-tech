/**
 * form-validation.js
 *
 * Validação client-side via Constraint Validation API.
 * Mensagens em pt-BR. Sem estado global. ES Module nativo.
 *
 * Uso:
 *   import { validateField, validateForm } from './form-validation.js';
 *
 *   field.addEventListener('blur', () => validateField(field));
 *   form.addEventListener('submit', (e) => {
 *     if (!validateForm(form)) e.preventDefault();
 *   });
 *
 * Customização de mensagens via data-attributes no input:
 *   data-msg-short="Mínimo 2 caracteres."
 *   data-msg-long="Máximo 80 caracteres."
 *   data-msg-pattern="Use apenas letras."
 *
 * Para erros custom (ex: phone-mask via setCustomValidity), o texto
 * de validationMessage é usado direto.
 *
 * Convenções:
 *   - Span de erro: id="field-error-{name}"
 *   - Classe no .field ancestor: .has-error
 *   - aria-invalid + aria-describedby setados no field
 */

/**
 * Retorna a mensagem pt-BR apropriada para o estado de validade do field.
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} field
 * @returns {string}
 */
function messageFor(field) {
  const v = field.validity;

  if (v.customError) {
    // Mensagem foi setada via setCustomValidity (ex: phone-mask)
    return field.validationMessage;
  }

  if (v.valueMissing) {
    return 'Esse campo é obrigatório.';
  }

  if (v.typeMismatch) {
    if (field.type === 'email') return 'Email parece inválido.';
    return 'Formato inválido.';
  }

  if (v.tooShort) {
    return field.dataset.msgShort || 'Muito curto.';
  }

  if (v.tooLong) {
    return field.dataset.msgLong || 'Muito longo.';
  }

  if (v.patternMismatch) {
    return field.dataset.msgPattern || 'Formato inválido.';
  }

  if (v.rangeUnderflow || v.rangeOverflow || v.stepMismatch || v.badInput) {
    return 'Valor inválido.';
  }

  // Fallback genérico
  return field.validationMessage || 'Valor inválido.';
}

/**
 * Garante a existência do span de hint de erro associado ao field.
 * Cria sob demanda dentro do .field ancestor.
 * Atualiza aria-describedby do field para apontar pro span (se ainda não aponta).
 *
 * @param {HTMLElement} field
 * @returns {HTMLSpanElement | null}
 */
function ensureHintSpan(field) {
  const name = field.name || field.id;
  if (!name) return null;

  const hintId = `field-error-${name}`;
  let hint = document.getElementById(hintId);

  if (!hint) {
    const fieldWrap = field.closest('.field');
    if (!fieldWrap) return null;
    hint = document.createElement('span');
    hint.id = hintId;
    hint.className = 'hint hint--error';
    hint.setAttribute('aria-live', 'polite');
    fieldWrap.appendChild(hint);
  }

  // Conecta via aria-describedby sem sobrescrever IDs já existentes
  const describedBy = field.getAttribute('aria-describedby') || '';
  const tokens = describedBy.split(/\s+/).filter(Boolean);
  if (!tokens.includes(hintId)) {
    tokens.push(hintId);
    field.setAttribute('aria-describedby', tokens.join(' '));
  }

  return hint;
}

/**
 * Valida um único campo. Atualiza ARIA, classe .has-error e span de erro.
 *
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} field
 * @returns {boolean} true se válido, false se inválido
 */
export function validateField(field) {
  // Campos sem name não validam (ex: honeypot decorativo, embora honeypot tenha name)
  // mantemos a checagem mas permitimos por id como fallback (ver ensureHintSpan)
  if (!field || typeof field.checkValidity !== 'function') return true;

  const isValid = field.checkValidity();

  if (isValid) {
    field.removeAttribute('aria-invalid');
    field.closest('.field')?.classList.remove('has-error');

    // Limpa o texto do hint se ele já existe — mantém o span pra próxima
    const name = field.name || field.id;
    if (name) {
      const hint = document.getElementById(`field-error-${name}`);
      if (hint) hint.textContent = '';
    }

    return true;
  }

  // Inválido
  field.setAttribute('aria-invalid', 'true');
  field.closest('.field')?.classList.add('has-error');

  const hint = ensureHintSpan(field);
  if (hint) {
    hint.textContent = messageFor(field);
  }

  return false;
}

/**
 * Valida todos os campos nomeados de um form.
 * Roda validateField em cada um para que o feedback visual seja aplicado.
 *
 * @param {HTMLFormElement} form
 * @returns {boolean} true se todos válidos
 */
export function validateForm(form) {
  if (!form) return false;

  const fields = form.querySelectorAll(
    'input[name]:not([type="hidden"]):not([type="submit"]):not([type="button"]), select[name], textarea[name]'
  );

  let allValid = true;
  for (const field of fields) {
    // Pula honeypot (geralmente aria-hidden e tabindex=-1)
    if (field.closest('[aria-hidden="true"]')) continue;

    const ok = validateField(field);
    if (!ok) allValid = false;
  }

  return allValid;
}
