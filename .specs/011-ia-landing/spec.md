# Spec 011 — IA Landing (integração monorepo)

## Contexto

O projeto `iflcosta-automation` era um repositório Next.js separado hospedando
`ia.iflcosta.tech`. A decisão de manter dois stacks distintos criou fragmentação:
tokens divergentes, dois repositórios, dois pipelines Vercel, design inconsistente.

Esta feature integra o site IA ao monorepo `iflcosta-tech` como HTML/CSS/JS vanilla,
unificando design system, tokens e deployment.

## Objetivos

1. Integrar landing IA (`ia.iflcosta.tech`) ao monorepo como páginas estáticas nativas.
2. Unificar tokens de design: sistema semântico do hardware expandido com tokens IA (warm bg, accent, chat).
3. Demo de chat (`/ia/demo`) portado como Edge Function + vanilla JS.
4. Um único projeto Vercel com hostname routing via `vercel.json` rewrites.
5. Script Python de outbound (`auditoria_pagespeed.py`) movido para `outbound/`.

## Fora de escopo

- Admin IA (`ia.iflcosta.tech/admin`) — scaffold mínimo, portado em feature futura (012).
- Portal `iflcosta.tech` — independente, incluído como referência em `portal/`.
- Workflow n8n / Redis / PostgreSQL — pertence ao Produto (SDD-produto.md futuro).
- Testes E2E para IA landing — feature 012 ou tarefa separada.

## Cenários principais

**C1 — Visitante chega em `ia.iflcosta.tech`**
Vercel reescreve hostname → `/ia/index.html` é servido com URL limpa.
Visitor vê landing com mesma identidade de marca do hardware (indigo, Inter, wordmark IL).

**C2 — Visitante acessa `/ia/demo`**
Página de chat carrega. Mensagens enviadas para `/api/demo/chat` (Edge Function → Groq).
Agente responde como atendimento da Imobiliária Sant'Ana.

**C3 — Visitante chega pelo hardware e clica "← Portal" ou vice-versa**
Navegação cross-site via links explícitos no header/footer.

## Requisitos funcionais

- RF1: `ia/index.html` — 7 seções (Nav, Hero, Pain, Solutions, How, Social, FinalCTA + Footer).
- RF2: Chat mockup decorativo (estático, `aria-hidden`).
- RF3: `/ia/demo` — interface de chat funcional com streaming simulado (resposta completa).
- RF4: `/api/demo/chat` — Edge Function chamando Groq `llama-3.3-70b-versatile`. Sem GROQ_API_KEY → 503.
- RF5: `vercel.json` — rewrites por hostname `ia.iflcosta.tech` → `/ia/$1`, excluindo `/assets/`, `/api/`, `/portal/`.
- RF6: `outbound/auditoria_pagespeed.py` — movido e operacional.

## Requisitos não-funcionais

- RNF1: Lighthouse mobile > 90 (zero JS no carregamento do HTML landing — script de demo apenas na página demo).
- RNF2: IA pages respeitam `prefers-color-scheme` como fallback de dark mode.
- RNF3: Mesmo sistema de tokens semânticos do hardware — nenhum token duplicado.
- RNF4: Fonte Inter carregada via Google Fonts apenas nas páginas IA.

## Critérios de pronto

- [ ] `ia/index.html` visível em `ia.iflcosta.tech` com todas as 7 seções.
- [ ] `/ia/demo` funcionando (chat com Groq via Edge Function).
- [ ] Tokens unificados em `tokens.css` sem quebrar páginas existentes de hardware.
- [ ] `vercel.json` com regras de hostname rewrite.
- [ ] `outbound/` Python scripts presentes e README atualizado.
- [ ] ZIP removido do repositório.
