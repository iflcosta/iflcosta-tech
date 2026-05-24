// Vanilla ChatDemo — ia.iflcosta.tech/demo

const MAX_MESSAGES = 30;
const MAX_CHARS = 800;

const SEED = [
  {
    role: 'assistant',
    content: "Olá! Aqui é o atendimento da Imobiliária Sant'Ana. Tá procurando aluguel ou compra? Em qual bairro?"
  }
];

let messages = [...SEED];
let loading = false;

const threadEl = document.getElementById('chat-thread');
const inputEl  = document.getElementById('chat-input');
const formEl   = document.getElementById('chat-form');
const errorEl  = document.getElementById('chat-error');
const sendBtn  = document.getElementById('chat-send');

function renderMessages() {
  threadEl.innerHTML = '';
  for (const msg of messages) {
    threadEl.appendChild(createBubble(msg.role, msg.content));
  }
  if (loading) threadEl.appendChild(createTyping());
  threadEl.scrollTop = threadEl.scrollHeight;

  const disabled = loading || messages.length >= MAX_MESSAGES;
  inputEl.disabled = disabled;
  sendBtn.disabled = disabled;
  sendBtn.textContent = loading ? '…' : 'Enviar';
}

function createBubble(role, text) {
  const isUser = role === 'user';
  const row = document.createElement('div');
  row.className = 'chat-bubble-row ' + (isUser ? 'chat-bubble-row--us' : 'chat-bubble-row--them');

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ' + (isUser ? 'chat-bubble--us' : 'chat-bubble--them');
  bubble.textContent = text;
  row.appendChild(bubble);
  return row;
}

function createTyping() {
  const row = document.createElement('div');
  row.className = 'chat-bubble-row chat-bubble-row--them';
  row.setAttribute('aria-label', 'agente digitando');
  row.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
  return row;
}

async function sendMessage(text) {
  messages = [...messages, { role: 'user', content: text }];
  loading = true;
  errorEl.hidden = true;
  renderMessages();

  try {
    const res = await fetch('/api/demo/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha inesperada. Tenta de novo.');
    messages = [...messages, { role: 'assistant', content: data.reply }];
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    loading = false;
    renderMessages();
  }
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text || loading || messages.length >= MAX_MESSAGES) return;
  if (text.length > MAX_CHARS) {
    errorEl.textContent = 'Mensagem muito longa (máximo 800 caracteres).';
    errorEl.hidden = false;
    return;
  }
  inputEl.value = '';
  sendMessage(text);
});

renderMessages();
