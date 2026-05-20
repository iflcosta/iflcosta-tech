# Roadmap — iflcosta-tech

Visão macro das 9 features. Ordem de execução é estrita: cada uma desbloqueia a próxima. Updates pontuais por feature ficam em `.specs/NNN-nome/`.

> **Critério de "pronto":** spec aprovado + plan aprovado + tasks 100% checadas + deploy validado em prod.

---

## Sequência

```
001 ──┬── 002 ──┬── 003 ───────┬── 005 ─── 006 ─── 007 ─── 008 ─── 009
      │        │               │
      └── styleguide.html      └── /api/leads + /orcamento
                       │
                       └── 004 (admin auth — gate de tudo abaixo)
```

---

## Fase 1 — Landing pública (rumo ao go-live)

### 001 — Design System  ·  70% pronto
**Por quê:** fundação visual reutilizada por landing e admin. Sem isso, decisões de CSS são tomadas no calor da feature e divergem.
**O quê:** tokens.css, base.css, components.css, layout.css, reveal.css, styleguide.html.
**Falta:** disabled states formais, `.field--error` reusável, `.kbd`, auditoria de contraste WCAG, Lighthouse CI ≥ 95, bundle size check.
**Desbloqueia:** todas as próximas features visuais.

### 002 — Landing pública  ·  75% pronto
**Por quê:** ponto de chegada do tráfego (orgânico + WhatsApp + indicação). É o storefront.
**O quê:** index.html, SEO/JSON-LD, páginas legais (privacidade, termos), 404, obrigado, robots/sitemap, CI/CD GitHub Actions, Playwright smoke tests, axe-core, Lighthouse.
**Falta:** assets visuais (og.jpg, favicons, foto placeholder), config GA4, tasks de performance, validação a11y final, deploy prod (T090-T095).
**Desbloqueia:** 003.

### 003 — Captação de leads  ·  100% código / 0% deploy ⚠️
**Por quê:** transforma visitante em conversa de WhatsApp. Coração comercial.
**O quê:** modal de orçamento na landing + página `/orcamento` standalone, endpoint `/api/leads` (Edge Function), tabela `leads` no Supabase com RLS + trigger de audit, anti-spam (honeypot + timing + rate limit), redirect WhatsApp com mensagem pré-preenchida, eventos GA4.
**Falta (deploy):**
- T003: aplicar migration no Supabase
- T070: env vars Vercel
- T072 + T017: deploy preview + curl test dos 6 cenários
**Desbloqueia:** 005 (admin precisa consumir tabela `leads`).

---

## Fase 2 — Admin SaaS solo (substitui Notion)

### 004 — Admin auth  ·  100% Concluído e Testado
**Por quê:** todo o admin é gateado por isso. Sem auth, sem admin.
**O quê:** rota `/admin` autenticada via Supabase Auth, magic link + senha, sessão JWT, logout, middleware Vercel que protege `/admin/*`, layout base do admin (shell + nav).
**Decisão arquitetural:** Continuidade do Zero-Build (HTML + CSS puro + ES Modules nativos no navegador).
**Desbloqueia:** 005-009.

### 005 — Admin CRM (leads + customers)
**Por quê:** Notion não escala — Iago precisa de pipeline visual e histórico por cliente.
**O quê:** listagem de leads (consome tabela criada em 003), conversão lead → customer, ficha do cliente (histórico de OS + produtos), tags/status, busca, filtros, paginação.
**Depende de:** 003 (tabela `leads`) + 004 (auth).
**Desbloqueia:** 006 (OS referencia customer).

### 006 — Admin OS (ordens de serviço / repairs)
**Por quê:** rastrear consertos em andamento, estados, prazos, custos, lucro.
**O quê:** CRUD de OS (rascunho → em diagnóstico → aguardando peça → em conserto → pronto → entregue), fotos, checklist de testes, valor cobrado vs custo, garantia, link com customer.
**Depende de:** 005.
**Desbloqueia:** 007 (consumo de peças do estoque).

### 007 — Admin Inventory (estoque + Custom PC)
**Por quê:** Iago vende peças e monta PCs — sem estoque controlado, ele perde margem.
**O quê:** CRUD de produtos (peça/acessório/componente PC), categorias, fornecedor, preço de custo, markup, alerta de mínimo, movimentação (entrada/saída ligada a OS), builder de Custom PC (preset → confirmar componentes → orçamento).
**Depende de:** 006 (OS pode consumir peça do estoque).
**Desbloqueia:** 009 (copilot consulta estoque).

---

## Fase 3 — Automação e IA

### 008 — WhatsApp bridge
**Por quê:** hoje o Iago responde manual. Bridge permite triagem automática, FAQ, status de OS pela conversa.
**O quê:** integração com Evolution API + n8n (já rodando na VPS própria), bot triagem que abre OS ou cria lead, envio de status automático ("seu celular tá pronto").
**Depende de:** 005 + 006 + 007 (precisa de entidades reais pra automatizar).
**Notas:** essa feature **fica em caixa-preta** até validar o fluxo manual. Não acelere.

### 009 — Copilot IA
**Por quê:** com tudo no Supabase + wiki indexada, o Iago consulta: "que celular Maria trouxe ano passado?", "tenho SSD M.2 NVMe em estoque?", "qual a margem média de Custom PC gamer Q1?".
**O quê:** chat no admin com Groq (Llama 3.x), RAG via pgvector na tabela `wiki`, ferramentas (function calling) que leem leads/customers/repairs/products, log de queries.
**Depende de:** 005 + 006 + 007 (sem dados, não há retrieval).
**Notas:** pgvector já está no Supabase, schema da `wiki` já modelado no legado.

---

## Riscos transversais

| Risco | Mitigação |
|-------|-----------|
| Iago é solo e desenvolve em janelas curtas | Specs antes de código (constituição §X) — evita retrabalho |
| Deploy quebrado em produção sem segundo olho | CI/CD: Lighthouse + axe + Playwright bloqueando merge |
| Vazamento de PII (LGPD) | Constituição §IX: retenção 180d, consent explícito, audit log |
| Drift de design ao longo das 9 features | Design system (001) compartilhado, styleguide.html como fonte da verdade |
| Stack admin divergir da landing | ADR 0005 fixa: tokens.css + components.css compartilhados |

---

**Última revisão:** 2026-05-19
