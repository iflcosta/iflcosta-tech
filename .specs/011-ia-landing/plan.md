# Plan 011 — IA Landing

## Arquitetura de deploy (único projeto Vercel)

```
iflcosta-tech/ (raiz do repo)
├── ia/
│   ├── index.html          → ia.iflcosta.tech/
│   └── demo/
│       └── index.html      → ia.iflcosta.tech/demo
├── assets/
│   ├── css/
│   │   ├── tokens.css      ← expandido com tokens IA
│   │   ├── base.css        ← inalterado
│   │   ├── components.css  ← +btn--accent, +btn--pill
│   │   └── ia.css          ← novo: estilos IA-específicos
│   └── js/
│       └── ia/
│           └── demo.js     ← vanilla ChatDemo
├── api/
│   └── demo/
│       └── chat.js         ← Edge Function → Groq
├── outbound/
│   ├── auditoria_pagespeed.py
│   ├── requirements.txt
│   └── tests/
├── portal/                 ← referência: iflcosta.tech hub page
└── vercel.json             ← hostname rewrites
```

## Hostname routing via vercel.json

```json
{
  "rewrites": [
    {
      "source": "/(?!assets|api|outbound|portal|favicon|robots|sitemap|site\\.webmanifest)(.*)",
      "has": [{ "type": "host", "value": "ia.iflcosta.tech" }],
      "destination": "/ia/$1"
    }
  ]
}
```

Paths não reescritos (passam direto):
- `/assets/` — CSS, JS, imagens compartilhados
- `/api/` — Edge Functions
- `/portal/` — hub iflcosta.tech (referência)

## Design System — tokens unificados

**Adições a `tokens.css`:**
- Primitivos warm: `--warm-50..300` (fundo bone/cream do IA)
- Primitivos WhatsApp: `--wa-green-500/600`
- Semânticos: `--color-bg-ia`, `--color-accent`, `--color-accent-hover`
- Chat: `--color-chat-bg`, `--color-chat-bubble-us`, `--color-chat-bubble-them`
- Dark mode via `@media (prefers-color-scheme: dark)` como fallback (afeta todos os sites — melhoria global)
- Existing `[data-theme="dark"]` permanece com prioridade sobre media query

**Adições a `components.css`:**
- `.btn--accent` — fundo `var(--color-accent)`, texto `var(--color-text-primary)`
- `.btn--pill` — `border-radius: var(--radius-full)` (modificador ortogonal)

**Novo `assets/css/ia.css`:**
- Override de `body { background }` para bone/cream
- Componente `.chat-mockup` (decorativo)
- Layout `.ia-hero__grid`, `.ia-cards`, `.ia-steps`
- Seção `.ia-final-cta` (fundo brand)
- Chat demo UI (`.chat-thread`, `.chat-bubble`, `.chat-typing`)
- Animação `.ia-pulse`
- Footer IA
- Respecta dark mode via tokens

## Edge Function `api/demo/chat.js`

- Runtime: `edge`
- Valida payload: `messages[]` com `role` + `content`
- System prompt: `buildSantanaSystemPrompt()` (inline, mesma lógica do TS)
- Chama Groq `llama-3.3-70b-versatile` max_tokens=350
- Retorna `{ reply: string }` ou erro
- GROQ_API_KEY via env Vercel — ausente → 503 graceful

## Vanilla ChatDemo (`assets/js/ia/demo.js`)

- Estado com arrays JS simples (sem React)
- Render via DOM manipulation (createBubble, renderMessages)
- `fetch('/api/demo/chat', { method: 'POST', ... })`
- Loading state: botão desabilitado + typing indicator
- Error display inline
- Seed inicial: mensagem do agente Sant'Ana
