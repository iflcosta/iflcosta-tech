# iflcosta.tech — Constituição do Projeto

Este documento rege todas as decisões de produto, design e engenharia do monorepo `iflcosta-tech` (landing pública `iflcosta.tech` + admin SaaS solo em `/admin`). Toda `spec.md`, `plan.md` e `tasks.md` deve respeitar estes princípios. Quando houver conflito, a constituição vence.

> **Naming:** o monorepo se chama `iflcosta-tech` (técnico, do domínio). A **brand customer-facing** é "Iago Lopes | Hardware & Tech". Usa o primeiro em documentação interna e código; usa o segundo em qualquer coisa que o cliente vê.

**Versão:** 1.0.0
**Ratificada:** 2026-05-19
**Autor único:** Iago Lopes

---

## Princípios

### I. Mobile-First Sempre

Todo layout, fluxo e componente é desenhado primeiro para a tela de 360×640 px com uma mão segurando o aparelho. Desktop é progressive enhancement, nunca o caminho primário.

**Por quê:** >70% do tráfego de PMEs de serviço local entra por WhatsApp/Google em mobile. Eu mesmo opero o admin no celular entre atendimentos.

**Como aplicar:** Toda task começa validando o layout mobile no DevTools. Touch targets ≥ 44×44 px. Nada que dependa de hover pra funcionar. Tabela em mobile vira card.

---

### II. Zero Build Step na Landing

A landing pública é HTML+CSS+JS vanilla servido estático, com Web Components. Sem bundler, sem transpiler, sem `node_modules` na produção da landing. Edge functions Vercel apenas para endpoints `/api/*`.

**Por quê:** Performance, simplicidade, deploy instantâneo, ausência de cadeia de dependências quebrando em runtime. Eu sou um dev solo, não posso pagar custo de manutenção de build.

**Como aplicar:** Se uma feature exige build step na landing, ela vai pro admin. Admin pode ter build (Vite) porque já é app autenticado e cacheável.

---

### III. Supabase é o Único Banco

Toda persistência vai para Supabase (Postgres + RLS + pgvector + Storage). Nada de banco paralelo, fila externa, cache distribuído ou stateful service. KV/Edge Config é aceito para flags estáticas.

**Por quê:** Um único modelo, um único backup, um único ponto de RLS. Eu não tenho time pra manter dois data stores em sincronia.

**Como aplicar:** Toda entidade nova precisa de migration Supabase + policy RLS antes da feature ser considerada pronta. `service_role` só em endpoints server-side, nunca no cliente.

---

### IV. WhatsApp é o Canal de Conversão

Toda jornada de lead termina em conversa de WhatsApp comigo no `(11) 91969-1542`. Formulário, página, modal, copilot — todos convergem pra esse endpoint. Email é fallback, nunca primário.

**Por quê:** Conserto de celular e suporte TI vendem por confiança e velocidade de resposta. Cliente que entra no WhatsApp em 30s converte 5× mais que o que recebe email no dia seguinte.

**Como aplicar:** Toda spec de feature de captação descreve o handoff pro WhatsApp como critério de sucesso, incluindo mensagem pré-preenchida com contexto do lead.

---

### V. Operação Solo First

O admin é projetado para um único usuário (eu). Sem RBAC, sem multi-tenant, sem convite de membro, sem `organizations`. Schema single-user. Auth single-user.

**Por quê:** YAGNI. Adicionar multi-user depois é refactor médio; carregar essa complexidade desde o dia 1 atrasa o produto em meses.

**Como aplicar:** Se uma feature pressupõe "usuário X vê apenas seus dados", reformule pra "operador vê todos os dados". `auth.uid()` aparece em RLS apenas como gate de autenticação, não como filtro.

---

### VI. Performance Budget Rígido (Não-Negociável)

- **LCP** ≤ 2.5s em 4G (Moto G4, throttling Lighthouse)
- **CLS** ≤ 0.05
- **INP** ≤ 200ms
- **Lighthouse Mobile** ≥ 95 em Performance, Acessibilidade, Best Practices, SEO
- **JS payload por rota** ≤ 200KB gzipped
- **Imagens** servidas em AVIF ou WebP com `<picture>` fallback, `loading="lazy"` exceto LCP

**Por quê:** Bragança Paulista tem áreas com 3G real. Cada 100ms a mais custa conversão. Lighthouse 95 é o nosso piso porque é o que o Google premia em mobile SERP.

**Como aplicar:** Toda PR roda Lighthouse CI antes de merge. Regressão de budget bloqueia merge. Fontes só `display=swap` e `preload` quando crítica.

---

### VII. WCAG 2.2 AA Mínimo

Toda interface atende WCAG 2.2 AA. Contraste ≥ 4.5:1 (texto) e ≥ 3:1 (UI). Navegável 100% por teclado. Toda imagem com `alt` significativo. `prefers-reduced-motion` respeitado. `aria-live` em toda mensagem dinâmica.

**Por quê:** É lei (LBI 13.146/2015) e é design responsável. Cliente com baixa visão precisa pedir orçamento igual.

**Como aplicar:** Critério de aceite de toda feature inclui linha de acessibilidade. axe-core no CI. Skip link em toda página da landing.

---

### VIII. Tudo Rastreável (GA4 + Audit Log)

Todo evento de conversão (lead enviado, orçamento iniciado, WhatsApp aberto) dispara evento GA4 com parâmetros padronizados. Toda mutação no admin grava linha em `audit_log` com `actor`, `action`, `entity`, `before`, `after`, `at`.

**Por quê:** Sem dado, não há decisão. Audit log é também recuperação de erro: se eu apagar algo por engano, eu reverto.

**Como aplicar:** Toda feature de admin que faz INSERT/UPDATE/DELETE precisa de trigger ou wrapper que escreve em `audit_log`. Toda feature de landing que tem CTA define o evento GA4 no spec.

---

### IX. LGPD by Default

Coleta apenas o mínimo necessário. Consentimento explícito antes de coletar telefone/CPF/endereço. Retenção de leads não convertidos: 180 dias, depois purga automática. Direito de exclusão atendido em ≤ 7 dias.

**Por quê:** Lei 13.709/2018 e ANPD. Multa é proibitiva pra autônomo. Confiança do cliente é meu maior ativo.

**Como aplicar:** Toda spec que coleta PII descreve: base legal, finalidade, retenção, e como atender pedido de exclusão. Política de Privacidade linkada em todo formulário.

---

### X. Specs Antes de Código

Nenhuma linha de código é escrita antes de `spec.md` → `plan.md` → `tasks.md` aprovados (por mim mesmo, em PR). Nunca pula etapa. Spec descreve **o quê** e **por quê**. Plan descreve **como**. Tasks descreve **passos executáveis**.

**Por quê:** Eu sou solo, não posso refazer. Spec mal feita custa semana; spec bem feita custa tarde.

**Como aplicar:** Branch `feat/NNN-nome` só nasce depois de `tasks.md` mergeado. PR de código referencia o spec no corpo. Não há "fix rápido" — fix rápido vai pra `hotfix/` e ainda gera spec retroativo se afetar contrato.

---

## Padrões de Qualidade Transversais

### Stack Confirmada

- **Landing:** HTML5 + CSS3 vanilla + JS ES2022 + Web Components, servido na Vercel (static + edge functions em `/api`)
- **Admin:** Mesma stack, opcionalmente Vite como bundler local (decisão fica em `004-admin-auth/plan.md`)
- **Banco:** Supabase (Postgres 15 + RLS + pgvector + Storage)
- **Auth:** Supabase Auth, single-user, magic link + senha
- **IA:** Groq (Llama 3.x), endpoint server-side em `/api/groq`
- **Analytics:** GA4 (já configurado) + Supabase `audit_log`
- **WhatsApp:** Evolution API + n8n na VPS própria — **caixa-preta nessa fase**, eu respondo manual

### Branding e Voz

- **Tom:** Direto, técnico mas acessível, sem jargão desnecessário, primeira pessoa do singular (eu, não "nós")
- **Mensagem central:** "Especialista em TI atendendo direto, sem balcão, com garantia."
- **Áreas:** Bragança Paulista, Atibaia, Itatiba

### Numeração de Specs

```
.specs/
├── constitution.md          ← este arquivo
├── 001-design-system/       ← fundação visual
├── 002-landing-public/      ← site público
├── 003-lead-capture/        ← formulário + modal + /orcamento
├── 004-admin-auth/          ← login, sessão, magic link
├── 005-admin-crm/           ← leads + customers
├── 006-admin-os/            ← ordens de serviço (repairs)
├── 007-admin-inventory/     ← products + estoque + custom PC
├── 008-whatsapp-bridge/     ← integração futura Evolution/n8n
└── 009-copilot-ia/          ← Groq + wiki pgvector
```

Cada feature contém **obrigatoriamente** `spec.md`, `plan.md`, `tasks.md` nessa ordem.

---

## Governança

1. Esta constituição só muda via commit explícito que bumpa a versão (semver: MAJOR para revogar princípio, MINOR para adicionar, PATCH para reword).
2. Toda violação intencional de princípio precisa de ADR (`/.specs/adr/NNNN-titulo.md`) com justificativa e data de revisão.
3. Em caso de dúvida entre dois princípios, a ordem numérica desempata (I > II > ... > X).
4. Spec/plan/task não pode ser mergeado se violar a constituição sem ADR associado.

---

**Assinado:** Iago Lopes — 2026-05-19
