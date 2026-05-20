# Tasks: Landing Pública

**Feature:** `002-landing-public`
**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
**Status geral:** 75% — landing renderiza, falta integração real, assets e deploy

---

## Convenções

- **Status:** `[x]` feito · `[ ]` pendente · `[~]` em progresso
- **Estimativa:** S = ≤ 1h · M = 2–4h · L = ≥ 4h
- **Ref:** RF-X da spec, ou ADR-NNNN

---

## 1. Estrutura HTML (✅ pronta)

- [x] **T001** — Estrutura semântica do `index.html` com header, main, sections (hero, serviços, como funciona, por que, áreas, FAQ, contato final), footer. Ref: RF-1–4. **M** *(Claude Design)*
- [x] **T002** — Skip link, `<main id="main">`, hierarquia h1→h2→h3 correta. Ref: RF-10, RF-26. **S** *(Claude Design)*
- [x] **T003** — Hero com headline, sub, CTAs, trust strip e card visual estilizado (`.diag-ticket`). Ref: RF-2, RF-5. **M** *(Claude Design)*
- [x] **T004** — 4 cards de serviços (Celular, Notebook/PC, Custom PC, Suporte TI) com faixa de preço. Ref: RF-2, RF-8. **S** *(Claude Design)*
- [x] **T005** — Seção "Como funciona" em 3 passos. **S** *(Claude Design)*
- [x] **T006** — Seção "Por que comigo" — 6 diferenciais (incluindo manutenção em placa). **S** *(Claude Design)*
- [x] **T007** — Seção "Áreas atendidas" com mapa SVG estilizado (Bragança, Atibaia, Itatiba, Remoto). **S** *(Claude Design)*
- [x] **T008** — FAQ com 9 perguntas em `<details>` nativos. Ref: RF-2. **S** *(Claude Design)*
- [x] **T009** — Final CTA com 3 contatos (WhatsApp, formulário, email) e horário. ADR 0004. **S** *(Claude Design)*
- [x] **T010** — Footer 3 colunas (brand, navegação, legal) com links válidos. **S** *(Claude Design + manual)*
- [x] **T011** — WhatsApp float fixed com pulse animation. Ref: RF-3. **S** *(Claude Design)*
- [x] **T012** — Banner LGPD com 2 opções (Aceitar todos / Apenas necessários). Ref: RF-23. **S** *(Claude Design)*

---

## 2. SEO e Metadata (✅ pronta)

- [x] **T020** — `<title>`, `<meta description>`, `<link canonical>`. Ref: RF-9. **S**
- [x] **T021** — Open Graph completo (7 tags) + Twitter Card (4 tags). Ref: RF-13. **S**
- [x] **T022** — JSON-LD `LocalBusiness` com áreas, telefone, email, horário. Ref: RF-11. **S**
- [x] **T023** — JSON-LD `FAQPage` replicando as 9 perguntas. Ref: RF-11. **S**
- [x] **T024** — `theme-color`, `color-scheme` meta tags. **S**
- [x] **T025** — `robots.txt` + `sitemap.xml`. Ref: RF-12. **S**
- [ ] **T026** — Validar JSON-LD em [validator.schema.org](https://validator.schema.org/) e Rich Results Test. **AC:** zero erro. **S**
- [ ] **T027** — Validar Open Graph em Facebook Sharing Debugger e Twitter Card Validator. **AC:** preview correto. **S**

---

## 3. Páginas legais (✅ prontas)

- [x] **T030** — `privacidade.html` com política LGPD completa. **M**
- [x] **T031** — `termos.html` com termos de serviço. **M**

---

## 4. Assets visuais (⏳ pendentes)

- [ ] **T040** — Criar `og.jpg` 1200×630 px ≤ 150KB com headline + wordmark "Iago Lopes | Hardware & Tech" + área de cobertura. **AC:** preview renderiza no Facebook/WhatsApp. **M**
- [ ] **T041** — Criar `favicon.ico` (multi-size 16, 32, 48) com monograma "IL" em fundo brand. **S**
- [ ] **T042** — Criar `favicon.svg` (versão vetorial) com monograma "IL". **S**
- [ ] **T043** — Criar `apple-touch-icon.png` 180×180 com monograma "IL". **S**
- [ ] **T044** — Slot pra foto real do Iago — no lançamento usa placeholder SVG (avatar com "IL"). Slot tem dimensão fixa pra evitar CLS na troca. **AC:** placeholder presente em alguma posição da seção "Por que comigo" ou hero. **M**
- [ ] **T045** — Decidir e gerar (ou copiar de Lucide) os ícones SVG inline finais usados em hero/serviços/diferenciais. **S** *(já existe parcial)*

---

## 5. Integração com formulário (⏳ delegado para 003)

- [ ] **T050** — Substituir simulação do submit em `app.js` por chamada real a `POST /api/leads`. **Delegado para `003-lead-capture/tasks.md`.** **M**
- [ ] **T051** — Adicionar máscara de telefone ao campo WhatsApp do modal. **Delegado para `003-lead-capture/tasks.md`.** **S**
- [ ] **T052** — Implementar validação client-side de todos os campos com mensagens em pt-BR após `blur`. **Delegado para `003-lead-capture/tasks.md`.** **M**
- [ ] **T053** — Implementar redirect para `wa.me/...` com mensagem pré-preenchida após submit OK. **Delegado para `003-lead-capture/tasks.md`.** **S**
- [ ] **T054** — Endpoint `/api/leads` aceitando o novo payload com checkbox de consent obrigatório, honeypot, rate limit e timing check. **Delegado para `003-lead-capture/tasks.md`.** **L**

> Enquanto 003 não estiver pronto, o form da landing continua em modo "simulação" — útil pra demo mas não funcional pra produção.

---

## 6. Analytics e LGPD (⏳ pendente)

- [ ] **T060** — Configurar GA4 ID na constante `GA4_ID` e injetar `gtag` apenas após consentimento. Ref: RF-21, RF-23. **M**
- [ ] **T061** — Implementar `track()` em `assets/js/lib/analytics.js` e disparar eventos:
  - `cta_click` com `cta_location` (hero | servicos | final | float)
  - `form_open` com `cta_location`
  - `whatsapp_open` com `cta_location`
  - `scroll_depth` em 25/50/75/100%
  - `faq_expand` com `question_index`
  - Ref: RF-21. **M**
- [ ] **T062** — Persistir consentimento em `localStorage['ifl-consent']` e bloquear GA4 quando "essential". Ref: RF-23, RF-24. **S** *(parcial já existe em `app.js`)*
- [ ] **T063** — Garantir que nenhum evento GA4 carrega PII (nome, telefone, email). Ref: RF-22. **S**

---

## 7. Performance (⏳ pendente)

- [ ] **T070** — Adicionar `<link rel="preconnect">` para `wa.me` e `googletagmanager.com` (após consent). **S**
- [ ] **T071** — `<link rel="preload">` para imagem LCP se houver. **S**
- [ ] **T072** — Cada `<img>` da home ganha `width`, `height`, `loading="lazy"` (exceto LCP), `decoding="async"`. Ref: RF-17. **S**
- [ ] **T073** — Servir imagens em AVIF + WebP fallback via `<picture>`. Ref: RF-17. **M**
- [ ] **T074** — Inline CSS crítico (above-the-fold) no `<head>`, defer restante. Ref: estratégia da plan §11. **M**
- [ ] **T075** — Validar HTML inicial ≤ 50KB gzipped. Ref: RF-20. **S**
- [ ] **T076** — Rodar Lighthouse mobile em `/`, `/privacidade`, `/termos`. Confirmar ≥ 95 em todas as 4 categorias. Ref: RF-16. **S**
- [ ] **T077** — Rodar PageSpeed Insights com Moto G4 throttling e validar LCP ≤ 2.5s. Ref: RF-15. **S**

---

## 8. Acessibilidade (⏳ validação)

- [ ] **T080** — axe-core CLI sem violações `serious`/`critical` na home, `/privacidade`, `/termos`. **S**
- [ ] **T081** — Validar contraste de todos os textos da landing em ambos os temas. **S**
- [ ] **T082** — Validar navegação por teclado em todas as seções (incluindo modal e FAQ). Ref: RF-29. **S**
- [ ] **T083** — Testar com leitor de tela em hero + modal + FAQ. **M**

---

## 9. Deploy (⏳ pendente)

- [x] **T090** — `vercel.json` criado com `cleanUrls: true`, cache headers `/assets/*` (1 ano immutable) + `*.html` (1h), security headers globais (X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options). CSP omitida intencionalmente (ADR futura). Ref: plan §10. **S** *(Agent C)*
- [ ] **T091** — Versionamento de assets via query string (`main.css?v=1`) ou hash no nome. **S**
- [ ] **T092** — Confirmar variáveis de ambiente no Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GA4_ID`, `WHATSAPP_NUMBER`, `EMAIL_CONTATO`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`, `IP_SALT`. Ref: plan §14 + 003 plan §3. **S**
- [ ] **T093** — Configurar domínio `iflcosta.tech` apontando pro projeto (já existe). **S**
- [ ] **T094** — Configurar preview deploys por PR. **S**
- [ ] **T095** — Deploy de produção via merge para `main`. **S**

---

## 10. CI / Testes (parcialmente pronto)

- [x] **T100** — GitHub Action `.github/workflows/ci.yml` com 3 jobs: lighthouse (mobile, 4G throttling), a11y (axe-core via Playwright), html-validate (opcional, continue-on-error). `lighthouserc.json` com Moto G config + budget 95+. **M** *(Agent D)*
- [x] **T101** — `scripts/a11y-check.mjs` integra `@axe-core/playwright`, falha em `serious`/`critical`. **S** *(Agent D)*
- [x] **T102** — `playwright.config.js` + `tests/landing.spec.js` (10 testes) + `tests/legal-pages.spec.js` (2 testes). Cobertura: render home, theme toggle, modal abre/fecha (X + Esc), chips do modal, validation do consent, FAQ expand, WhatsApp float visibility, consent banner, skip link, nav anchor scroll. **Chromium mobile (Pixel 5) por padrão**; firefox/webkit comentados na config pra ativar depois. **L** *(Agent E)*
- [ ] **T103** — Validar W3C HTML validator sem erros em todas as páginas. **S**
- [ ] **T104** — Configurar `LHCI_GITHUB_APP_TOKEN` em Settings → Secrets pra Lighthouse comentar no PR (opcional, melhor UX em review). **S**
- [ ] **T105** — Rodar smoke tests localmente pela primeira vez (`npm install && npx playwright install chromium && npm test`) e validar todos verdes. **S**

---

## 11. Páginas auxiliares (parcialmente pronto)

- [x] **T110** — `obrigado.html` (109 linhas) — fallback pós-submit com 2 CTAs (WhatsApp / home) + card de sugestões. `noindex,follow`. Ref: spec §5. **S** *(Agent B)*
- [x] **T111** — `404.html` (130 linhas) — eyebrow "Erro 404", h1 "Essa página tomou um curto-circuito.", SVG inline de circuito interrompido, 2 CTAs + card de links sugeridos. `noindex,nofollow`. Ref: spec §5. **S** *(Agent B)*
- [ ] **T112** — Página `/orcamento` standalone (versão longa do formulário). **Delegada para `003-lead-capture/tasks.md`** porque é parte daquela feature. **L**

---

## 12. Critério de pronto (Feature 002)

A landing pública é considerada **pronta pra produção** quando:

- [ ] Lighthouse mobile ≥ 95 em P/A/BP/SEO em `/`, `/privacidade`, `/termos`
- [ ] LCP ≤ 2.5s em PageSpeed Insights mobile
- [ ] axe-core sem violações `serious`/`critical`
- [ ] JSON-LD `LocalBusiness` + `FAQPage` validam em validator.schema.org
- [ ] OG/Twitter Card renderizam corretamente em Facebook Sharing Debugger + Twitter Card Validator
- [ ] Banner LGPD funciona (aparece em primeiro acesso, respeita opt-out)
- [ ] GA4 dispara todos os eventos definidos (verificado em DebugView)
- [ ] WhatsApp float aparece após scroll e funciona
- [ ] Navegação 100% por teclado
- [ ] Sem scroll horizontal de 320px a 1920px
- [ ] Sitemap e robots.txt válidos
- [ ] Smoke tests Playwright passando
- [ ] Páginas `404.html` e `obrigado.html` criadas e linkadas
- [ ] Form integrado com `/api/leads` real (depende de feature 003)
- [ ] Imagens reais (og.jpg, favicons, foto/placeholder) no lugar

---

## 13. Bloqueios e dependências externas

- **Bloqueia produção real:** feature `003-lead-capture` (form integration). Sem ela, a landing existe mas o form é simulado.
- **Bloqueia OG perfeito:** `og.jpg` real (atualmente referencia URL que não existe).
- **Bloqueia confiança visual:** foto real do Iago (atualmente placeholder).
- **Bloqueia métricas:** GA4 ID + ativação efetiva.
