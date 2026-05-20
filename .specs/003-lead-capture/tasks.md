# Tasks: Captação de Leads

**Feature:** `003-lead-capture`
**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
**Status geral:** 0% — spec e plan prontos, implementação não iniciada
**Depende de:** 001 (componentes CSS) + 002 (modal HTML na landing)

---

## Convenções

- **Status:** `[x]` feito · `[ ]` pendente · `[~]` em progresso
- **Estimativa:** S = ≤ 1h · M = 2–4h · L = ≥ 4h
- **Ref:** seção do plan.md ou RF-X da spec

---

## 1. Banco de dados — Schema SQL

- [x] **T001** — Criar migration `supabase/migrations/2026_05_19_create_leads.sql` com: extensão `pgcrypto`, enums `lead_servico`/`lead_origem`/`lead_status`, tabela `leads` completa (id, created_at, nome, telefone, email, servico, mensagem, cidade, urgencia, origem, cta_location, user_agent, referrer, consent_at, ip_hash, status, notes), índice unique `leads_telefone_day_uniq`, índices de performance, RLS habilitado, policy `service_role full access`. Ref: plan §2. **M**

- [x] **T002** — Criar tabela `audit_log` na mesma migration + função `log_lead_insert()` + trigger `leads_audit_insert`. Ref: plan §2. **S**

- [x] **T003** — Aplicar migration no Supabase via MCP tool (`apply_migration`). **AC:** tabela `leads` visível no dashboard, RLS ativo, trigger ativo. **S**

- [x] **T004** — Documentar script de purga mensal LGPD (`DELETE ... status in ('novo','perdido') AND created_at < now() - interval '180 days'`) como comentário no final da migration ou em `supabase/cron.sql`. Ref: plan §2, RF-14. **S**

---

## 2. Endpoint `/api/leads`

- [x] **T010** — Criar `/api/leads.js` como Vercel Edge Function com runtime `edge`. Estrutura: `createClient` supabase (service_role), exports `config` + `default handler`. Ref: plan §3. **M**

- [x] **T011** — Implementar as 3 camadas anti-spam no handler: (1) honeypot (`body.website` não vazio → fake 200), (2) timing check (`Date.now() - body._t < 3000` → fake 200), (3) rate limit via `checkRateLimit(ipHash)` → 429. Ref: plan §3. **M**

- [x] **T012** — Implementar `validateLead(body)`: nome (2–80 chars), telefone (10–11 dígitos), email (regex leve, opcional), servico (enum), mensagem (≤ 1500, opcional), origem (modal|page). Retorna `{ ok, field, message }`. Ref: plan §3. **S**

- [x] **T013** — Implementar `buildWhatsAppUrl(body)` montando mensagem com nome, serviço, cidade, urgência, detalhe (≤ 400 chars). Número via `process.env.WHATSAPP_NUMBER`. Ref: plan §3. **S**

- [x] **T014** — Implementar `sha256(str)` via `crypto.subtle.digest` (Web Crypto API, disponível em Edge) + `checkRateLimit(ipHash)` usando Supabase count na janela de `RATE_LIMIT_WINDOW` segundos. Ref: plan §3. **S**

- [x] **T015** — Implementar insert no Supabase com normalização (telefone só dígitos, `trim()` em strings, `consent_at = new Date().toISOString()`). Tratar `error.code === '23505'` (dedupe) como sucesso silencioso — responder 200 com redirect. Ref: plan §3. **M**

- [x] **T016** — Instalar `@supabase/supabase-js` como dependência de produção. **AC:** `npm install @supabase/supabase-js` + confirmar no `package.json`. **S**

- [ ] **T017** — Testar endpoint manualmente com `curl` ou REST client: (a) POST válido → 200 + redirect URL, (b) honeypot preenchido → 200 redirect null, (c) timing < 3s → 200 redirect null, (d) consent false → 400, (e) telefone inválido → 400, (f) mesmo telefone no mesmo dia → 200 deduped. **AC:** todos os 6 casos corretos. **M**

---

## 3. Refactor `app.js` → ES Modules

- [x] **T020** — Criar `assets/js/lib/theme.js` extraindo a lógica de tema de `app.js`: `initTheme()` com anti-FOUC, toggle, `localStorage['ifl-theme']`. Ref: plan §4. **S**

- [x] **T021** — Criar `assets/js/lib/consent.js` extraindo LGPD consent de `app.js`: banner aparece em primeiro acesso, aceitar/recusar, `localStorage['ifl-consent']`, bloquear GA4 quando `essential`. Ref: plan §4, RF-23. **S**

- [x] **T022** — Criar `assets/js/lib/analytics.js` com `track(event, params)` wrapper sobre `gtag()`. Disparar `track()` apenas após consent `all`. Expor `initAnalytics(ga4Id)` que injeta o script gtag condicionalmente. Ref: plan §8. **M**

- [x] **T023** — Criar `assets/js/lib/phone-mask.js` com `attachPhoneMask(input)` — máscara `(11) 9 9999-9999` via listener de `input` + validação `setCustomValidity` no `blur`. Ref: plan §4. **S**

- [x] **T024** — Criar `assets/js/lib/form-validation.js` com `validateField(field)` aplicandostyles de erro/sucesso inline após blur: `aria-invalid`, `.field.has-error`, span de mensagem. Ref: plan §4, plan §7. **S**

- [x] **T025** — Criar `assets/js/lib/orcamento-form.js` com `initOrcamentoForm()`: setup de máscara, restore/save draft em `sessionStorage` (TTL 5min), validação blur, submit handler (fetch → /api/leads → success/error/loading states). Gravar `_t_form_open` no `sessionStorage` ao abrir modal. Ref: plan §4, plan §9. **L**

- [x] **T026** — Criar `assets/js/main.js` importando e inicializando todos os módulos na ordem correta: `initTheme`, `initAnalytics`, `initConsent`, `initOrcamentoForm`, sticky header, smooth scroll, reveal (IntersectionObserver), WhatsApp float. **S**

- [x] **T027** — Atualizar `index.html`: trocar `<script src="assets/js/app.js" defer>` por `<script type="module" src="/assets/js/main.js">`. Adicionar `data-mode="modal"` no `<form>` do modal. Adicionar `data-cta-location` nos botões `[data-modal-open]` (hero, serviços, final-cta, float). **S**

- [x] **T028** — Manter `app.js` original como backup comentado ou remover se `main.js` cobrir 100% das funcionalidades. **AC:** Playwright tests passam após troca. **S**

---

## 4. Página `/orcamento`

- [x] **T030** — Criar `orcamento.html` reusando header + footer da landing. Seção central com: eyebrow "Orçamento online", h1 "Me conta o que está acontecendo", `<form data-orcamento-form data-mode="page">`. Ref: plan §5. **M**

- [x] **T031** — Adicionar ao form da `/orcamento` campos extras em relação ao modal: Email, Cidade (select com principais cidades atendidas + "Outra" + "Remoto"), Urgência (select: hoje/essa semana/sem pressa), Mensagem (textarea 1500 chars com contador). Ref: plan §5, RF-7. **M**

- [x] **T032** — Adicionar campos condicionais: se `servico === 'custom_pc'`, exibir Tipo de uso (gamer/produtividade/workstation) e Faixa de orçamento. Implementar com JS + `hidden` attribute. **S**

- [x] **T033** — Adicionar honeypot + consent checkbox + botão submit à `/orcamento`. Mesmo padrão do modal. **S**

- [x] **T034** — Adicionar SEO metadata em `orcamento.html`: `<title>`, `<meta description>`, `<link canonical>`. `robots: index,follow` (é uma landing page de conversão, não noindex). **S**

---

## 5. Integração na landing (modal)

- [ ] **T040** — Atualizar testes Playwright em `tests/landing.spec.js` T009 (submit simulação) para testar submit real com mock do fetch, verificando: estado loading do botão, tela de sucesso após 200, mensagem de erro após 400. Ref: T102 em 002. **M**

- [ ] **T041** — Adicionar teste Playwright para `/orcamento`: página carrega, form funciona, chips de serviço selecionam, submit com mock. **S**

- [ ] **T042** — Adicionar `.form-error` (banner inline vermelho acima do botão submit) em `assets/css/components.css`. Usado quando servidor retorna 4xx/5xx. Ref: plan §7. **S**

---

## 6. Analytics GA4

- [ ] **T050** — Configurar `GA4_ID` como variável de ambiente no Vercel. No `analytics.js`, usar `import.meta.env.GA4_ID` ou constante global injetada via `<script>` inline no `<head>`. **S**

- [ ] **T051** — Disparar todos os eventos da tabela plan §8 nos locais corretos:
  - `form_open` → ao abrir modal / ao carregar `/orcamento`
  - `form_field_focus` → primeiro focus em cada campo
  - `form_submit_attempt` → click no submit
  - `form_submit_success` → resposta 200 com redirect
  - `form_submit_error` → qualquer erro
  - `whatsapp_redirect` → antes do `location.assign`
  - `whatsapp_open` → click em links `wa.me/...` diretos (não do form)
  Ref: plan §8, RF-31. **M**

- [ ] **T052** — Confirmar que nenhum evento GA4 inclui PII (nome, telefone, email). Ref: plan §8, RF-32. **S**

---

## 7. Testes

- [ ] **T060** — Escrever testes unitários para `phone-mask.js`: 10 dígitos, 11 dígitos, com não-dígitos, vazio, preenchimento parcial. Usar Node native test (`node --test`) ou Vitest. Ref: plan §14. **S**

- [ ] **T061** — Escrever testes unitários para `validateLead` (função do endpoint): happy path, nome curto, nome longo, telefone 9 dígitos, telefone 12 dígitos, email inválido, servico inválido, mensagem > 1500, consent false. **AC:** 100% dos casos cobertos. **S**

- [ ] **T062** — Rodar smoke tests Playwright completos (`npm test`) após integração. **AC:** todos os 10 testes de `landing.spec.js` passando, + novos testes de form. **S**

- [ ] **T063** — Testar manualmente em dispositivo real: iOS Safari + Android Chrome. **AC:** form abre, preenche, submete, redireciona pro WhatsApp com mensagem correta. **M**

---

## 8. Deploy e variáveis de ambiente

- [ ] **T070** — Configurar no painel Vercel as variáveis: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_NUMBER`, `GA4_ID`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`, `IP_SALT`. Ref: plan §3 tabela de env vars. **S**

- [ ] **T071** — Confirmar que `SUPABASE_SERVICE_ROLE_KEY` NÃO está exposta no cliente (não aparece em JS bundle do browser). **AC:** inspecionar Network tab no browser — nenhum request do cliente usa a chave. **S**

- [ ] **T072** — Deploy de preview via push para branch de feature. Testar endpoint `/api/leads` em staging com payload real. **S**

---

## 9. Critério de pronto (Feature 003)

- [ ] Migration SQL aplicada no Supabase (leads + audit_log + RLS + trigger)
- [ ] `/api/leads` responde corretamente a todos os 6 casos do contrato
- [ ] Modal na landing submete e redireciona pro WhatsApp com mensagem pré-preenchida
- [ ] `/orcamento` standalone funcional com campos longos
- [ ] Máscara `(11) 9 9999-9999` funciona em todos os campos telefone
- [ ] Draft persiste no sessionStorage por 5min (modal: preencher, fechar, reabrir — campos voltam)
- [ ] Eventos GA4 todos disparados conforme plan §8
- [ ] axe-core sem violações `serious`/`critical` no form
- [ ] Playwright smoke tests passando (modal + /orcamento)
- [ ] Teste manual iOS Safari + Android Chrome confirmado
- [ ] Nenhum evento GA4 inclui PII

---

## 10. Bloqueios e dependências

- **Bloqueia:** feature `005-admin-crm` (listagem de leads no admin depende da tabela e RLS authenticated)
- **Desbloqueado por:** 001 (componentes) + 002 (modal HTML)
- **Variável de ambiente:** `IP_SALT` — gerar valor aleatório longo antes do deploy
- **GA4 ID:** Iago precisa criar a propriedade no Google Analytics 4 antes do T050
