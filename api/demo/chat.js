// /api/demo/chat.js
// Edge Function — demo de chat com Groq (llama-3.3-70b-versatile)
// Spec: /.specs/011-ia-landing/spec.md

export const config = { runtime: 'edge' };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.3-70b-versatile';
const MAX_MESSAGES = 30;
const MAX_CHARS    = 800;
const MAX_TOKENS   = 350;

function buildSantanaSystemPrompt() {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return `Você é o atendimento automatizado da Imobiliária Sant'Ana, em Bragança Paulista.

Sua missão:
- Atender de forma humana e rápida quem chega procurando aluguel ou compra de imóvel em Bragança, Atibaia e Itatiba.
- Qualificar o lead: nome, tipo (aluguel ou compra), bairros de interesse, número de quartos, faixa de preço, prazo para mudar.
- Quando fizer sentido, propor agendar uma visita ou pedir contato pra um corretor humano dar continuidade.

Tom de voz:
- Frases curtas, estilo conversa de WhatsApp. Máximo 2 ou 3 frases por resposta.
- Português do Brasil, profissional mas próximo. Sem "Espero que esteja bem!" ou floreios.
- Sem emojis (no máximo 1, e só quando fizer muito sentido).
- Faça uma pergunta no fim quando a conversa precisar avançar.

Regras importantes:
- NÃO invente imóveis específicos com endereço e preço fixos. Fale em termos gerais ("temos opções nessa faixa", "posso te mandar 3 ou 4 sugestões depois que confirmar bairro e quartos").
- Se a pessoa perguntar se você é uma IA, seja honesto: "Sou o atendimento automatizado da Sant'Ana — atendo na hora pra você não esperar. Posso te transferir pra um corretor humano sempre que precisar".
- Esta é uma demonstração pública. Se a pessoa fugir do tema, responda gentilmente: "Aqui eu só ajudo com imóveis em Bragança e região".
- Nunca prometa coisas que não dependem de você. Use "vou conferir com o corretor", "te confirmo em seguida".

Contexto: estamos em ${hoje}, Bragança Paulista – SP.`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return json({ error: 'Demo temporariamente indisponível.' }, 503);

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }

  const messages = payload?.messages;
  if (!Array.isArray(messages) || messages.length === 0)
    return json({ error: 'Campo "messages" obrigatório.' }, 400);
  if (messages.length > MAX_MESSAGES)
    return json({ error: 'Conversa muito longa. Recarrega a página.' }, 400);

  const cleaned = [];
  for (const m of messages) {
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string')
      return json({ error: 'Mensagem em formato inválido.' }, 400);
    if (m.content.length === 0 || m.content.length > MAX_CHARS)
      return json({ error: 'Mensagem vazia ou muito longa.' }, 400);
    cleaned.push({ role: m.role, content: m.content });
  }

  let groqRes;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSantanaSystemPrompt() },
          ...cleaned
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    console.error('[demo/chat] erro de rede ao chamar Groq:', err);
    return json({ error: 'Falha ao conectar no provedor. Tenta de novo em alguns segundos.' }, 502);
  }

  if (!groqRes.ok) {
    if (groqRes.status === 429)
      return json({ error: 'Demo recebendo muitas mensagens agora. Tenta em 1 minuto.' }, 429);
    console.error('[demo/chat] Groq status', groqRes.status);
    return json({ error: 'O agente está indisponível agora.' }, 502);
  }

  const data = await groqRes.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) return json({ error: 'Resposta vazia do agente.' }, 502);

  return json({ reply });
}
