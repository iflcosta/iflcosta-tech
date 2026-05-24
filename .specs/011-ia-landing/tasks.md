# Tasks 011 — IA Landing

## T001 — Unificar tokens.css [S] ✅
**Critério:** Primitivos warm + wa-green + semânticos IA + chat adicionados.
Dark mode `prefers-color-scheme` como fallback em `:root:not([data-theme="light"])`.
Nenhuma página hardware quebra.
→ Plan §Design System

## T002 — Adicionar btn--accent e btn--pill a components.css [XS] ✅
**Critério:** `.btn--accent` usa `--color-accent`. `.btn--pill` aplica `--radius-full`.
→ Plan §Design System

## T003 — Criar assets/css/ia.css [M] ✅
**Critério:** Body bone/cream, chat-mockup, hero grid, cards, steps, final-cta dark, footer, chat-demo UI, ia-pulse animation.
→ Plan §ia.css

## T004 — Criar ia/index.html (landing completa) [M] ✅
**Critério:** 7 seções renderizadas. Usa tokens compartilhados + ia.css. Sem JS inline.
Inter carregado via Google Fonts. Anti-FOUC script presente. Favicon + OG.
→ Plan §hostname routing

## T005 — Criar ia/demo/index.html [S] ✅
**Critério:** Chat UI renderizada. Carrega `/assets/js/ia/demo.js`.
Roda sem GROQ_API_KEY (mostra erro 503 graceful).
→ Plan §vanilla ChatDemo

## T006 — Criar assets/js/ia/demo.js [S] ✅
**Critério:** Seed exibida. Send funciona. Loading state. Error state. Sem dependências externas.
→ Plan §vanilla ChatDemo

## T007 — Criar api/demo/chat.js [S] ✅
**Critério:** POST `/api/demo/chat` → Groq → `{ reply }`. Edge runtime.
Validação de payload. Rate limit 429 tratado. Sem GROQ_API_KEY → 503.
→ Plan §Edge Function

## T008 — Mover outbound/ do repositório automation [XS] ✅
**Critério:** `outbound/auditoria_pagespeed.py`, `requirements.txt`, `__init__.py`, `tests/` presentes.
→ Plan §estrutura

## T009 — Mover portal/ como referência [XS] ✅
**Critério:** `portal/index.html` + `portal/style.css` presentes no repo.
→ Plan §estrutura

## T010 — Atualizar vercel.json com hostname rewrites [S] ✅
**Critério:** `ia.iflcosta.tech/` → `/ia/`. Assets não reescritos. Deploy funciona.
→ Plan §hostname routing

## T011 — Remover ZIP do repo e atualizar CLAUDE.md [XS] ✅
**Critério:** ZIP não está no repo. CLAUDE.md reflete novo estado com feature 011.
