// Máscara de telefone pt-BR para o form de captação.
// Formato progressivo:
//   0–2 dígitos:  (XX
//   3–6 dígitos:  (XX) XXXX
//   7–10 dígitos: (XX) XXXX-XXXX        (fixo)
//   11 dígitos:   (XX) X XXXX-XXXX      (móvel — 9º dígito isolado)
//
// Sem dependências, sem estado global. Função pura de attach.

const INVALID_MSG = 'Coloca o DDD + número completo, tipo (11) 91234-5678.';

/**
 * Formata uma string de até 11 dígitos no padrão pt-BR.
 * Espera input já limpo (somente dígitos, length <= 11).
 */
function formatDigits(digits) {
  const len = digits.length;
  if (len === 0) return '';
  if (len <= 2) return '(' + digits;

  const ddd = digits.slice(0, 2);

  if (len <= 6) {
    // (XX) XXXX  (parcial — até 4 dígitos depois do DDD)
    return '(' + ddd + ') ' + digits.slice(2);
  }

  if (len <= 10) {
    // Formato fixo: (XX) XXXX-XXXX
    // Em 7..10 dígitos, exibimos os 4 primeiros do número, hífen, e o resto.
    const mid = digits.slice(2, 6);
    const tail = digits.slice(6); // 1..4 chars
    return '(' + ddd + ') ' + mid + '-' + tail;
  }

  // len === 11 — móvel com 9º dígito isolado: (XX) X XXXX-XXXX
  const nono = digits.slice(2, 3);
  const mid = digits.slice(3, 7);
  const tail = digits.slice(7, 11);
  return '(' + ddd + ') ' + nono + ' ' + mid + '-' + tail;
}

/**
 * Conta quantos dígitos existem nos primeiros `pos` caracteres de uma string.
 */
function digitsBefore(str, pos) {
  let n = 0;
  for (let i = 0; i < pos && i < str.length; i++) {
    if (str.charCodeAt(i) >= 48 && str.charCodeAt(i) <= 57) n++;
  }
  return n;
}

/**
 * Dada a string formatada e quantos dígitos devem ficar à esquerda do cursor,
 * retorna o índice de caractere correspondente.
 */
function indexAfterNDigits(formatted, nDigits) {
  if (nDigits <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    const code = formatted.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      seen++;
      if (seen === nDigits) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * Anexa a máscara a um <input>. Idempotente do ponto de vista do DOM
 * (não guarda estado global; cada chamada adiciona handlers no próprio input).
 *
 * @param {HTMLInputElement|null|undefined} input
 */
export function attachPhoneMask(input) {
  if (!input) return;

  input.addEventListener('input', () => {
    const previous = input.value;
    const selectionStart = input.selectionStart ?? previous.length;

    // Quantos dígitos havia antes do cursor — vamos preservar essa contagem.
    const digitsLeft = digitsBefore(previous, selectionStart);

    const digits = previous.replace(/\D/g, '').slice(0, 11);
    const formatted = formatDigits(digits);

    if (formatted === previous) return;

    input.value = formatted;

    // Reposiciona o cursor logo após o N-ésimo dígito (onde N = digitsLeft,
    // clamped pelo total disponível). Isso evita que o cursor pule pro fim
    // quando o usuário edita no meio.
    const clampedDigits = Math.min(digitsLeft, digits.length);
    const newPos = indexAfterNDigits(formatted, clampedDigits);
    try {
      input.setSelectionRange(newPos, newPos);
    } catch {
      // Alguns tipos de input (ex.: type="number") não suportam setSelectionRange.
      // Nesse caso o navegador já posicionou no fim — aceitável.
    }
  });

  input.addEventListener('blur', () => {
    const digits = input.value.replace(/\D/g, '');
    if (digits.length < 10) {
      input.setCustomValidity(INVALID_MSG);
    } else {
      input.setCustomValidity('');
    }
  });
}
