# Roadmap — iflcosta-tech

Visão macro das 10 features. Ordem de execução é estrita: cada uma desbloqueia a próxima. Updates pontuais por feature ficam em `.specs/NNN-nome/`.

> **Critério de "pronto":** spec aprovado + plan aprovado + tasks 100% checadas + deploy validado em prod.

---

## Sequência

```
Hardware (iflcosta.tech/hardware.iflcosta.tech):
001 ──┬── 002 ──┬── 003 ──────────┬── 005 ─── 006 ─── 007 ─── 010 ─── 008 ─── 009
      │         │                 │
      └── styleguide.html         └── /api/leads + /orcamento
                          │
                          └── 004 (admin auth — gate de tudo abaixo)

Produto IA (ia.iflcosta.tech):
001 (design system compartilhado)
 └── 011 (landing IA) ─── 012 (admin IA) ─── 013 (WA bridge IA) ─── 014 (copilot avançado)
```

---

## Fase 1 — Landing pública (rumo ao go-live)

### 001 — Design System  ·  100% pronto
**Por quê:** fundação visual reutilizada por landing e admin. Sem isso, decisões de CSS são tomadas no calor da feature e divergem.
**O quê:** tokens.css, base.css, components.css, layout.css, reveal.css, styleguide.html.
**Status:** Totalmente integrado, auditado para contraste WCAG e validado pelo Lighthouse CI.

### 002 — Landing pública  ·  100% pronto
**Por quê:** ponto de chegada do tráfego (orgânico + WhatsApp + indicação). É o storefront.
**O quê:** index.html, SEO/JSON-LD, páginas legais (privacidade, termos), 404, obrigado, robots/sitemap, CI/CD GitHub Actions, Playwright smoke tests, axe-core, Lighthouse.
**Status:** Produção online e totalmente funcional.

### 003 — Captação de leads  ·  100% pronto
**Por quê:** transforma visitante em conversa de WhatsApp. Coração comercial.
**O quê:** modal de orçamento na landing + página `/orcamento` standalone, endpoint `/api/leads` (Edge Function), tabela `leads` no Supabase com RLS + trigger de audit, anti-spam (honeypot + timing + rate limit), redirect WhatsApp com mensagem pré-preenchida, eventos GA4.
**Status:** Concluído, migrado no banco e homologado em produção.

---

## Fase 2 — Admin SaaS solo (substitui Notion)

### 004 — Admin auth  ·  100% pronto
**Por quê:** todo o admin é gateado por isso. Sem auth, sem admin.
**O quê:** rota `/admin` autenticada via Supabase Auth, magic link + senha, sessão JWT, logout, middleware Vercel que protege `/admin/*`, layout base do admin (shell + nav).
**Status:** Concluído, testado e ativo.

### 005 — Admin CRM (leads + customers) ·  100% pronto
**Por quê:** Notion não escala — Iago precisa de pipeline visual e histórico por cliente.
**O quê:** listagem de leads (consome tabela criada em 003), conversão lead → customer, ficha do cliente (histórico de OS + produtos), tags/status, busca, filtros, paginação.
**Status:** Concluído, testado e homologado em produção.

### 006 — Admin OS (ordens de serviço / repairs) ·  100% pronto
**Por quê:** rastrear consertos em andamento, estados, prazos, custos, lucro.
**O quê:** CRUD de OS (rascunho → em diagnóstico → aguardando peça → em conserto → pronto → entregue), fotos, checklist de testes, valor cobrado vs custo, garantia, link com customer.
**Status:** Código e testes E2E totalmente homologados (12/12 verdes). Banco de produção migrado com sucesso.

### 007 — Admin Inventory (estoque + Custom PC) ·  100% pronto
**Por quê:** Iago vende peças e monta PCs — sem estoque controlado, ele perde margem.
**O quê:** CRUD de produtos (peça/acessório/componente PC), categorias, fornecedor, preço de custo, markup, alerta de mínimo, movimentação (entrada/saída ligada a OS), builder de Custom PC (preset → confirmar componentes → orçamento).
**Status:** T001–T013 implementados — banco, APIs, UI de estoque, integração peças↔OS, Custom PC Builder, relatórios e suíte E2E. Em produção.
**Depende de:** 006 (OS pode consumir peça do estoque).
**Desbloqueia:** 009 (copilot consulta estoque).

### 010 — Painel Financeiro  ·  100% pronto
**Por quê:** o admin registra receita, custo e lucro por OS, mas faltava visão gerencial consolidada — Iago não enxergava o caixa sem planilha.
**O quê:** página `/admin/financeiro` com 4 cards (receita, lucro bruto, a receber, ticket médio), filtro de período, gráfico de tendência de 6 meses em canvas vanilla, tabela de contas a receber; API `/api/admin/financeiro` agregando `repairs`.
**Status:** T001–T005 implementados (spec, API, UI, gráfico, navegação). Em produção.
**Depende de:** 006 (receita/lucro/payment_status das OS) + 007 (custo de peças).

---

## Fase 3 — Produto IA (ia.iflcosta.tech)

> **Contexto novo (2026-05-24):** o produto IA foi redefinido como negócio separado do hardware.
> Iago vende automação de atendimento via WhatsApp para PMEs (imobiliárias, clínicas, pet shops).
> Stack: Evolution API + n8n (VPS Hetzner) + Groq (llama-3.3-70b) + Supabase `ia.*` schema.
> Modelo multi-tenant: cada cliente = tenant isolado, 1 instância WhatsApp, 1 agente IA configurado.
> Receita: setup R$1.500–3.000 + mensalidade R$300–800/cliente. VPS ~R$50/mês suporta 15 clientes.

### 011 — IA Landing  ·  100% pronto
**Por quê:** vitrine do produto IA para captar clientes interessados.
**O quê:** `ia.iflcosta.tech` landing + `/ia/demo` chat demo ao vivo com agente Groq, design system unificado, portal `iflcosta.tech` como hub de navegação entre produtos.
**Status:** Produção. Mockup de chat corrigido (perspectiva do cliente, horário absoluto). Roteamento via Edge Middleware.
**Pendente:** adicionar `GROQ_API_KEY` no Vercel para ativar o demo; OG image + role="list" (auditoria P1).

### 012 — IA Admin (painel multi-tenant)  ·  🔄 Em andamento
**Por quê:** Iago precisa provisionar clientes, configurar agentes, monitorar conversas e gerenciar instâncias WhatsApp sem tocar na VPS a cada novo cliente.
**O quê:** painel `ia.iflcosta.tech/admin` com CRUD de tenants, editor de agente + FAQ, gestão de instâncias WA com config anti-ban (5 fases de warmup), monitor de conversas, leads do demo.
**Stack:** HTML vanilla + Edge Functions (Vercel) + Supabase `ia.*` + n8n (VPS) via webhooks.
**Status:** T001–T010 implementados (migration, middleware, scaffold HTML, APIs core, webhook). Aplicar migration no Supabase + env vars pendentes.
**Depende de:** 011.
**Desbloqueia:** 013.

### 013 — WhatsApp Bridge IA (multi-tenant)
**Por quê:** conectar o n8n (VPS) ao painel — n8n lê config do Supabase, processa mensagens WA, chama Groq e responde. Iago monitora e intervém pelo admin.
**O quê:** n8n workflow template (gateway multi-tenant por instanceId), anti-ban implementado no workflow, handoff humano, notificações proativas, logs de conversa gravados via webhook.
**Stack:** Evolution API + n8n (VPS) ← webhook → Vercel Edge (`/api/ia/webhook/whatsapp`)
**Depende de:** 012 (admin estável + schema `ia.*` populado).
**Notas:** OpenClaw monitorar para fase futura (4GB RAM, single-user por design — não é o momento).

### 014 — IA Copilot avançado
**Por quê:** agentes com RAG sobre base de conhecimento do cliente (catálogo de imóveis, prontuários), transcrição de áudio, handoff com contexto rico, métricas de conversão.
**O quê:** pgvector para knowledge base, Whisper para áudio, dashboard de CSAT por tenant, A/B de prompts.
**Depende de:** 013 (dados reais de conversas para treinar e avaliar).

---

## Fase 4 — Copilot hardware admin (futuro)

### 008 — WhatsApp bridge hardware  ·  Backlog
**Por quê:** hoje o Iago responde manual no hardware. Bridge permite triagem automática, FAQ, status de OS.
**O quê:** integração com Evolution API + n8n, bot de triagem, envio de status automático.
**Depende de:** 005 + 006 + 007 (entidades reais) + 013 (infraestrutura WA já rodando no IA).
**Notas:** reutiliza a infra de n8n + Evolution da Fase 3. Spec em `.specs/008-whatsapp-bridge/`.

### 009 — Copilot IA no admin hardware
**Por quê:** Iago consulta o banco pelo chat: "que celular Maria trouxe?", "tenho SSD M.2 em estoque?".
**O quê:** chat no admin com Groq, RAG via pgvector, function calling sobre leads/repairs/products.
**Depende de:** 005 + 006 + 007 + dados reais.

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

**Última revisão:** 2026-05-24
