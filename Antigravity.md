# Antigravity.md — Guia operacional para o Antigravity

Este arquivo serve como o manual de bordo e guia de contexto para o Antigravity neste repositório. Use-o como ponto de partida; em seguida, leia `/.specs/constitution.md` para as diretrizes de produto e design.

---

## 1. Quem é o user

**Iago Lopes** — autônomo de TI em Bragança Paulista (SP). Opera solo: vendas, atendimento, conserto, dev, admin. É dev capaz (não precisa de explicações básicas), mas o seu tempo é o recurso mais escasso. Fala pt-BR, prefere respostas concisas e diretas, não gosta de "vamos quebrar em fases" desnecessárias — se dá pra fazer, faz.

- **Atendimento:** Bragança Paulista, Atibaia, Itatiba
- **Diferencial técnico:** microsoldagem / BGA / reballing — manutenção avançada em placa
- **Mobile é dogma:** sempre valide em viewport 360–393px antes de desktop
- **WhatsApp comercial:** `(11) 91969-1542` / `wa.me/5511919691542`
- **Email atual:** `iflcosta@outlook.com` (migrar para `contato@iflcosta.tech` futuramente — usar var `EMAIL_CONTATO`)
- **Idioma:** todos os artefatos (specs, código, comentários, commits) em **pt-BR**

---

## 2. Como trabalhar com o Antigravity

- **Respostas curtas.** Bullet > parágrafo. Não recapitule o que ele disse.
- **Sem rodeios (No mealmouthing).** Se uma abordagem é melhor, diga e justifique em uma linha. Se ele pedir opinião, dê opinião.
- **Concorde com a discordância.** Se ele pediu algo e o pedido tem um problema técnico ou de UX, aponte claramente antes de executar.
- **Paralelismo.** Use subagentes e ferramentas de pesquisa de forma eficiente e em paralelo quando necessário para cobrir múltiplos arquivos.
- **Antigravity Design / Visual:** quando ele perguntar sobre layout/visual, garanta que seja premium, vibrante, com micro-animações elegantes. Prefira mockups conceituais e código polido a CSS puramente exploratório.
- **Antes de criar arquivo novo:** verifique sempre se a edição de um arquivo existente atende à necessidade.

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

**Importante:** `<script type="module">` **não funciona em `file://`** — sempre use `npm run serve` para testar localmente. Em produção (Vercel) carrega normalmente.

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

> Última atualização: 2026-05-20

| Feature | Status | Próxima ação |
|---------|--------|--------------|
| **001-design-system** | 70% — tokens/base/components/layout/reveal/styleguide prontos | T012-T014 disabled/error/kbd; auditoria contraste |
| **002-landing-public** | 75% — HTML/SEO/legais/CI/testes prontos | assets visuais (og.jpg, favicons); GA4; deploy |
| **003-lead-capture** | 100% — Completo e Validado | Nenhuma (Concluído) |
| **004-admin-auth** | Spec/plan/tasks prontos | **T001** Iniciar desenvolvimento / spec da autenticação do admin |
| **005-admin-crm** | Spec resumida | Detalhar após 004 |
| **006-admin-os** | Spec resumida | — |
| **007-admin-inventory** | Spec resumida | — |
| **008-whatsapp-bridge** | Spec resumida | Caixa-preta nessa fase |
| **009-copilot-ia** | Spec resumida | Depende de 005-007 com dados reais |

**Próximas 3 tarefas concretas (em ordem):**

1. **004-admin-auth** — Iniciar o desenvolvimento da autenticação do admin (integração Supabase Auth + JWT).
2. **001-design-system** — Finalizar os componentes de UI restantes (disabled/error/kbd e auditoria de contraste).
3. **002-landing-public** — Preparar assets visuais finais (og.jpg, favicons) para deploy oficial de produção.

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
- `.has-error` / `.hint--error` referenciadas em JS mas **não existem** em `components.css` → criar quando atacar T013 do 001.
- `orcamento.html` ainda tem CSS inline → migrar para `components.css`.

### Datas e fuso
Quando o usuário disser "amanhã", "essa semana", **converta para data absoluta** ao escrever em specs/tasks/memory (ex: "Thursday" → "2026-03-05"). Memórias com datas relativas perdem o sentido rapidamente.

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

| Ferramenta | Como acessar / Usar | Para que |
|------------|---------------------|----------|
| **Supabase** | Ferramentas SQL / API / CLI | Migrations, queries, logs, advisors. Use `list_tables` antes de mudanças de schema. |
| **Vercel** | Vercel CLI / Painel | Deploy, logs, env vars (via dashboard). |
| **Gmail / Calendar / Drive** | Integrações ou scripts | Não-essencial para dev; útil para automação futura. |
| **GitHub** | `git` / GitHub CLI | Issues, PRs, releases. Repo: `iflcosta/iflcosta-tech` |
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
