# CLAUDE.md — Guia operacional para o Claude

Este arquivo é lido automaticamente pelo Claude Code em toda sessão deste repositório. Use-o como ponto de partida; em seguida leia `/.specs/constitution.md` para as regras de produto.

---

## 1. Quem é o user

**Iago Lopes** — autônomo de TI em Bragança Paulista (SP). Opera solo: vendas, atendimento, conserto, dev, admin. É dev capaz (não precisa explicação básica), mas o tempo dele é o recurso mais escasso. Fala pt-BR, prefere respostas concisas, não gosta de "vamos quebrar em fases" sem necessidade — se dá pra fazer, faz.

- **Atendimento:** Bragança Paulista, Atibaia, Itatiba
- **Diferencial técnico:** microsoldagem / BGA / reballing — manutenção em placa
- **Mobile é dogma:** sempre valide em viewport 360–393px antes de desktop
- **WhatsApp comercial:** `(11) 91969-1542` / `wa.me/5511919691542`
- **Email atual:** `iflcosta@outlook.com` (migra pra `contato@iflcosta.tech` futuramente — usar var `EMAIL_CONTATO`)
- **Idioma:** todos os artefatos (specs, código, comentários, commits) em **pt-BR**

---

## 2. Como trabalhar com ele

- **Respostas curtas.** Bullet > parágrafo. Não recapitule o que ele disse.
- **Sem mealmouthing.** Se uma abordagem é melhor, diga e justifique em uma linha. Se ele pedir opinião, dá opinião.
- **Concorde com discordância.** Se ele pediu algo e o pedido tem problema, aponte antes de executar.
- **Paralelize.** Para pesquisa em múltiplos arquivos, dispare Agents/Explore em paralelo.
- **Claude Design / visual:** quando ele perguntar sobre layout/visual, prefira mockup conceitual a CSS exploratório.
- **Antes de criar arquivo novo:** verifique se a edição de um arquivo existente serve.

---

## 3. Stack e workflow local

```bash
# Setup (primeira vez no dispositivo)
npm install
npx playwright install chromium

# Dev local — landing
npm run serve           # serve estático em http://localhost:3000

# Testes
npm test                # Playwright smoke tests (12 specs)
npm run test:ui         # modo interativo

# Acessibilidade + performance
npm run a11y            # axe-core via Puppeteer
npm run lhci            # Lighthouse CI
npm run ci              # lhci + a11y
```

**Importante:** `<script type="module">` **não funciona em `file://`** — sempre `npm run serve` para testar local. Em produção (Vercel) carrega normal.

**Estrutura essencial:**
```
.specs/                 # SDD: spec → plan → tasks por feature
api/                    # Vercel Edge functions
assets/
├── css/                # tokens, base, components, layout, reveal
└── js/
    ├── main.js         # entry point ES modules
    └── lib/            # módulos isolados
supabase/migrations/    # SQL migrations
tests/                  # Playwright
```

---

## 4. Estado atual do projeto (atualizar conforme avança)

> Última atualização: 2026-05-24

| Feature | Status | Próxima ação |
|---------|--------|--------------|
| **001-design-system** | 100% — Integrado e auditado | Mantendo consistência |
| **002-landing-public** | 100% — Produção online | Monitoramento |
| **003-lead-capture** | 100% — Concluído e homologado | — |
| **004-admin-auth** | 100% — Concluído e ativo | — |
| **005-admin-crm** | 100% — Concluído, testado e homologado em produção | — |
| **006-admin-os** | 100% — tracking upgrade + portal /rastrear a11y concluídos | — |
| **007-admin-inventory** | ✅ Bugs críticos corrigidos — pronto para homologação com dados reais | Homologar em produção |
| **008-whatsapp-bridge** | Spec expandida — arquitetura multi-tenant + anti-ban definida | Aguarda VPS + n8n ativos |
| **009-copilot-ia** | Spec resumida | Depende de dados reais de OS, CRM e Estoque |
| **010-financeiro** | 100% T001–T006 — em produção | Homologar com dados reais |
| **011-ia-landing** | 100% — monorepo integrado, design system unificado | Adicionar `GROQ_API_KEY` no Vercel; homologar `/ia/demo` |
| **012-ia-admin** | 🔄 Em andamento — T001–T010 implementados (commit 4aba45b) | Aplicar migration Supabase; adicionar env vars; continuar T005–T008 |

**O que foi implementado em 012-ia-admin (2026-05-24):**
- **Specs completas**: `spec.md` + `plan.md` + `tasks.md` (15 tasks, T001–T015)
- **Migration** `supabase/migrations/2026_05_24_ia_schema.sql` — schema `ia.*` com 9 tabelas, RLS, triggers (**ainda não aplicada no Supabase — aplicar manualmente no SQL editor**)
- **Middleware** ampliado: `/ia/admin/:path*` protegido pelo mesmo auth de `/admin/*`
- **Scaffold HTML**: `ia/admin/` com dashboard, clientes, conversas, leads (nav responsiva desktop+mobile)
- **CSS**: `ia/admin/style.css` — design system compartilhado + layout admin IA
- **Edge APIs**: `api/ia/admin/` — tenants, stats, conversations, conversations-reply, demo-leads
- **Webhook recebedor**: `api/ia/webhook/whatsapp.js` — idempotente via evolution_id, detecção de opt-out
- **Config pública para n8n**: `api/ia/config/[instance].js` — retorna wa_config + agent sem PII
- **Demo lead**: `api/ia/demo/lead.js` — captura leads do /ia/demo com rate limit

**Env vars a adicionar no Vercel (Fase 012):**
```
WHATSAPP_WEBHOOK_TOKEN=  (gerar token aleatório — protege /api/ia/webhook/whatsapp)
IA_CONFIG_TOKEN=         (gerar token aleatório — protege /api/ia/config/:instance)
N8N_REPLY_WEBHOOK_URL=   (URL webhook n8n para reply manual — preencher com VPS)
GROQ_API_KEY=            (já pendente desde 011 — ativa o /ia/demo)
```

**Pendências ativas (012):**
- [ ] Aplicar `2026_05_24_ia_schema.sql` no Supabase (SQL editor do projeto `togrnwxazuweuihlaljo`)
- [ ] Adicionar env vars no Vercel
- [ ] T005: API agentes/versões/knowledge
- [ ] T006: API wa-instances + config anti-ban
- [ ] T007: UI formulário "Novo cliente"
- [ ] T008: UI detalhe do tenant (3 tabs: Agente | FAQ | Instância WA)
- [ ] T013: Botão "Quero isso" no `/ia/demo`
- [ ] T014–T015: Testes E2E + revisão anti-ban

**Decisões de arquitetura da sessão 2026-05-24:**
- **Stack IA**: Evolution API + n8n (VPS Hetzner) + Groq (llama-3.3-70b) + Supabase `ia.*` schema
- **Multi-tenant**: schema isolado `ia.*` no mesmo projeto Supabase — sem projeto separado
- **Anti-ban WhatsApp**: 5 fases de warmup automático (20→50→100→200→ilimitado msgs/dia), delay aleatório 1.5–4s, typing indicator, opt-out detection, idempotência por evolution_id
- **Roteamento corrigido**: `vercel.json` has:host não funciona em projetos estáticos — roteamento via Edge Middleware (já ativo)
- **OpenClaw**: framework de agentes IA (4GB RAM mínimo) — monitorar para Fase 3, não usar agora
- **n8n**: orquestrador de workflows WA→LLM — não administra mensagens direto da Vercel, sempre via n8n

**Auditoria cross-domain (2026-05-24 — P1 ainda abertos):**
- `og:image` ausente em `/ia/index.html`
- Portal (`/portal/index.html`) sem canonical, OG completo, favicon, manifest
- `role="list"` ausente nos `<ul class="ia-cards">` da IA landing
- `assets/js/rastrear.js` (584 linhas) órfão — `/rastrear/index.html` foi reescrito inline
- `assets/js/app.legacy.js` órfão

**O que o Antigravity implementou (commits 999c6ac + 5e37c13):**
- **T008 peças↔OS**: card "Peças de Reposição" em `admin/os/detalhes.html`, autocomplete + tabela de consumo; `os-detalhes.js` expandido (1096 linhas)
- **T009–T011 PC Builder**: `admin/estoque/builder.html` + `assets/js/admin/builder.js` (slots de montagem, validação CPU↔Mobo, orçamento WhatsApp)
- **T012/T013 Relatórios + E2E**: `admin/estoque/relatorios.html` + `assets/js/admin/relatorios.js`; `tests/admin-inventory.spec.js` (422 linhas); `tests/tracking-portal.spec.js` (315 linhas)
- **Tracking upgrade (bônus)**: reescrita de `rastrear/index.html` + `assets/js/rastrear.js` com glassmorphism, timeline pública com notas técnicas, showcase de Custom PC; API `tracking.js` + `status.js` + `os/index.js` atualizados; spec em `.specs/006-admin-os/tracking_upgrade.md`
- **Specs retroativas**: `plan.md` + `tasks.md` para 005 e 006

> Migrações 006, 007, `harden_db_functions` e `2026_05_21_create_tracking_upgrade` aplicadas em produção (projeto Supabase `togrnwxazuweuihlaljo`). Aplicar migrações pelo SQL editor do painel. Não usar o CLI de migrations.

**Dashboard (2026-05-21):**
- Cards de stat são links clicáveis para os módulos ativos (leads/OS/estoque/financeiro).
- JS inline em `admin/index.html` carrega contagens reais via API na inicialização.
- Card "Receita do Mês" (F010) substituiu o card WhatsApp "Em breve".
- Novo campo "Nota Técnica Pública" na OS → aparece na timeline do portal de rastreamento do cliente.
- Novo campo `payment_status` (pendente/parcial/pago) na OS.

**Estado da sessão 2026-05-21 (Claude):**
- **Banco de dados zerado** — TRUNCATE em todas as tabelas operacionais (leads, customers, repairs, history, products, etc.) para homologação com dados reais. Schema/migrations/auth intactos.
- F010 (Painel Financeiro) implementada — `.specs/010-financeiro/` completo.
- Bugs corrigidos: modal de conversão CRM; criação de OS (`valor_custo_peças`); botão de tema sumindo no desktop; cards do dashboard (Leads usava endpoint errado; "OS Abertas" filtrava status inexistente — agora `?aberta=true` na API).
- `tests/admin-os.spec.js` estava corrompido (encoding) — restaurado. Suíte E2E 49 testes.
- **Portal `/rastrear` — auditoria a11y completa:** landmarks (`<main>`, `<section>`, `<header>`), hierarquia de headings (h1→h2), `role="status/alert"` no loading/erro, `aria-live="polite"`, lightbox com `role="dialog" aria-modal="true"` + Tab-trap + Esc key + retorno de foco, `<button>` nas thumbs de foto com `aria-label`, `aria-hidden` em elementos decorativos, opacidade do estado futuro corrigida (0.4→0.7 para WCAG AA). Fallback localStorage morto removido. Specs reconciliadas: `tracking_design.md` marcada como substituída, `tracking_upgrade.md` marcada como implementada. ADR 0006 criado (tema escuro autocontido — exceção deliberada).

---

## Monorepo + Design System (2026-05-24)

**Estrutura de domínios (um único projeto Vercel):**
- `hardware.iflcosta.tech` → root do repo (index.html, orcamento.html, etc.)
- `ia.iflcosta.tech` → `/ia/` (rewrite via `vercel.json` `has.host`)
- `iflcosta.tech` → portal separado (referência em `/portal/`, deploy independente)

**Design System unificado (tokens.css):**
- Primitivos: slate, indigo, warm (bone/cream IA), wa-green (WhatsApp)
- Semânticos IA adicionados: `--color-bg-ia`, `--color-accent`, `--color-accent-hover`
- Chat tokens: `--color-chat-bg`, `--color-chat-bubble-us/them`
- Dark mode agora tem fallback via `@media (prefers-color-scheme: dark)` (melhoria global)
- `[data-theme="dark"]` permanece com prioridade sobre media query
- `.btn--accent` e `.btn--pill` adicionados a `components.css`
- `assets/css/ia.css` — estilos exclusivos das páginas IA

**Arquivos da integração:**
- `ia/index.html` — landing `ia.iflcosta.tech`
- `ia/demo/index.html` — chat demo ao vivo
- `assets/js/ia/demo.js` — vanilla ChatDemo
- `api/demo/chat.js` — Edge Function → Groq (llama-3.3-70b-versatile)
- `outbound/` — Python CLI de auditoria PageSpeed (movido de iflcosta-automation)
- `portal/` — referência do hub iflcosta.tech (HTML estático)

**Ação pendente:** adicionar `GROQ_API_KEY` nas env vars do Vercel para ativar o demo.
Sem a key, o endpoint retorna 503 graceful (demo indisponível — não quebra nada).

**Admin IA** (`ia.iflcosta.tech/admin`) — adiado para feature 012. O scaffold do Next.js
(Supabase Auth, login/logout, dashboard placeholder) será portado como vanilla HTML + Edge Function.

---

## PENDÊNCIAS TÉCNICAS — resolvidas em 2026-05-22

> Bugs 1–8 corrigidos e commitados. Bug 9 é asset de design (não-código).

### ✅ Bugs F007 corrigidos (2026-05-22)

1. `builder.js` — endpoint `/api/admin/customers` → `/api/admin/crm/customers` ✅
2. `builder.js` + `relatorios.js` + `os-detalhes.js` — campo `preco_custo` → `custo_atual` ✅
3. `relatorios.js` — campo `qty_minimo` → `qty_minima` ✅
4. `api/admin/os/photos.js` criado — upload Supabase Storage + `repair_photos` ✅
5. `os-detalhes.js` — `loadStatusHistory()` + localStorage de histórico removidos; `saveStatusTransition()` API-only ✅
6–8. `seedMockData` e todos os fallbacks de localStorage removidos de `os.js`, `estoque.js`, `builder.js`, `relatorios.js`, `os-detalhes.js` ✅

### ✅ Bug 9 — favicon e Open Graph resolvidos (2026-05-22)

**Favicon: ✅ resolvido**
- `favicon.svg` (monograma "IL" indigo, vetorial), `favicon.ico`, `favicon-96x96.png`, `apple-touch-icon.png`, `web-app-manifest-192/512.png` e `site.webmanifest` adicionados.
- Bloco `<link>` de favicon + manifest presente nas 7 páginas públicas (index, orcamento, 404, obrigado, privacidade, termos, rastrear).
- `favicon.ico` e `site.webmanifest` na raiz; demais assets em `assets/img/`.

**Open Graph: ✅ resolvido**
- `assets/img/og.png` (1200×630) adicionado.
- `<meta property="og:image">` e `<meta name="twitter:image">` em `index.html` e `orcamento.html` apontam para `/assets/img/og.png`.

---

**Contexto de negócio — Feature 007:**
- Iago usa o mesmo fornecedor de peças de celular que seu amigo (loja de informática em Bragança Paulista).
- Por ora, **não mantém estoque físico**: compra a peça quando aparece a OS, pelo amigo ou direto no fornecedor.
- O amigo serve de **cavalaria** para problemas que o Iago não consegue resolver no próprio laboratório.
- O módulo de estoque é construído agora para suportar o **B2B futuro com importação da China** — não há urgência de rastrear qty real na fase atual.
- Campo `fornecedor` no produto é suficiente para registrar o amigo como fornecedor preferencial de cada item.

---

## 5. Decisões fechadas (não revisar)

Veja `/.specs/constitution.md` para os 10 princípios e ADRs ativos. Resumo das decisões já tomadas que não merecem rediscussão:

- **Brand:** "Iago Lopes | Hardware & Tech" (customer-facing); `iflcosta-tech` é o repo
- **Stack landing:** HTML + CSS BEM + JS ES modules vanilla. **Zero build.** Sem React/Vue/Svelte. (ADR 0005)
- **Stack admin:** mesma base; pode ter Vite. Web Components reservados para o admin.
- **Banco:** Supabase único. RLS sempre on. `service_role` apenas em endpoints server-side.
- **Auth admin:** Supabase Auth single-user, magic link + senha.
- **WhatsApp:** Evolution API + n8n na VPS — **caixa-preta nessa fase**, Iago responde manual.
- **Final CTA escuro:** usa primitivas `slate-900`/`slate-50` (ADR 0004 — exceção à regra token-semântico).
- **Anti-spam:** honeypot + timing (≥ 3s) + rate limit (3/hr/IP). **Sem CAPTCHA.**
- **Foto real do Iago:** entra depois; placeholder SVG/monograma "IL" com dimensão fixa (anti-CLS).

---

## 6. Gotchas conhecidos (não repita os erros)

### `assets/js/main.js` — Temporal Dead Zone
Declare TODO state de módulo (`let`/`const`) **acima** das chamadas `initX()` no topo do arquivo. Se declarar `let modalBackdrop` perto de `initModal()`, e `initModal()` for chamado antes na ordem do arquivo, o `let` cai em TDZ e a atribuição joga `Cannot access 'X' before initialization` — silenciando todo o bootstrap (sem listeners, modal não abre, nenhum erro visível na UI). Veja bloco `// Estado módulo` em `main.js`.

### Playwright: seletor `[data-modal-open]`
Use seletor explícito `[data-modal-open][data-cta-location="hero"]`, **nunca `.first()`**. Pixel 5 (393px) esconde `.header-cta-desktop` via media query, então `.first()` pega elemento invisível. Locations disponíveis: `hero`, `servicos`, `final`, `float`, `header`.

### CSS `[hidden]`
Em `assets/css/base.css` precisa de `[hidden] { display: none !important; }` para vencer regras que setam `display` em elementos com `[hidden]` (ex: `.consent-banner`).

### `file://` não carrega ES modules
Abrir `index.html` direto pelo Explorer/duplo-clique não funciona — CORS bloqueia `<script type="module">`. Sempre `npm run serve`.

### Pendências de CSS conhecidas
- `.has-error` / `.hint--error` — ✅ já existem em `components.css` (linha 160+). Item resolvido.
- `orcamento.html` ainda tem CSS inline → migrar para `components.css`.

### Datas e fuso
Quando user disser "amanhã", "essa semana", **converta para data absoluta** ao escrever em specs/tasks/memory (ex: "Thursday" → "2026-03-05"). Memórias com datas relativas viram lixo em 1 semana.

---

## 7. Convenções de SDD

Veja `/.specs/constitution.md` §X "Specs Antes de Código". Resumo:

1. **Sequência obrigatória:** `spec.md` → `plan.md` → `tasks.md` → código. Nada de pular etapa.
2. **Branch naming:** `feat/NNN-nome` (ex: `feat/004-admin-auth`).
3. **PR referencia spec** no corpo do commit/PR.
4. **Hotfix gera spec retroativo** se afetar contrato.
5. **Toda feature** tem `spec.md` (o quê + por quê), `plan.md` (como), `tasks.md` (passos executáveis com IDs T001+).
6. **Cada task** tem ID, estimativa (S/M/L), critério de aceite, ref pra seção do plan.

Estrutura típica de spec.md: Contexto → Objetivos → Cenários → Requisitos Funcionais → Requisitos Não-Funcionais → Fora de Escopo → Critérios de Pronto → Riscos.

---

## 8. Integrações externas

| Ferramenta | Como acessar | Para que |
|------------|--------------|----------|
| **Supabase** | MCP `mcp__claude_ai_Supabase__*` | Migrations, queries, logs, advisors. Use `list_tables` antes de mudanças de schema. |
| **Vercel** | MCP `mcp__claude_ai_Vercel__*` | Deploy, logs, env vars (via dashboard). |
| **Gmail / Calendar / Drive** | MCP `mcp__claude_ai_Gmail__*` etc. | Não-essencial para dev; útil para automação futura. |
| **GitHub** | `gh` CLI | Issues, PRs, releases. Repo: `iflcosta/iflcosta-tech` |
| **Groq** | `/api/groq.js` (futuro) | LLM para copilot IA (feature 009) |

---

## 9. Onde olhar primeiro

- **Princípios de produto:** `.specs/constitution.md`
- **Visão das 9 features:** `ROADMAP.md`
- **Próxima feature da fila:** `.specs/004-admin-auth/`
- **O que falta na landing:** `.specs/003-lead-capture/tasks.md`
- **ADRs:** `.specs/adr/`
- **Padrões visuais:** `styleguide.html` (servir local e abrir)
- **Testes existentes:** `tests/landing.spec.js`, `tests/legal-pages.spec.js`

---

**Última instrução geral:** quando em dúvida sobre escopo, prefira *fazer menos*. O Iago é solo — feature pequena que ele entende vence feature grande que ele não tem tempo de validar.
