# Tasks: Admin Auth

**Feature:** `004-admin-auth`
**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
**Status geral:** 100% — concluído e ativo em produção (reconciliado retroativamente 2026-05-21)
**Depende de:** 001 (design system tokens/components), Supabase Auth configurado

---

## Convenções

- **Status:** `[x]` feito · `[ ]` pendente · `[~]` em progresso
- **Estimativa:** S = ≤ 1h · M = 2–4h · L = ≥ 4h
- **Ref:** seção do plan.md ou RF-X da spec

---

## 1. Configuração Supabase Auth

- [x] **T001** — Acessar Supabase dashboard → Auth → Providers: garantir Email habilitado, **desabilitar sign-ups** (toggle "Enable email signups" = off). Ref: spec RF-30. **S**
- [x] **T002** — Criar usuário do Iago via dashboard (Users → Add user → email + password inicial). Anotar UUID em local seguro. **S**
- [x] **T003** — Customizar email templates em pt-BR (Magic Link + Reset Password). Ref: plan §4. **S**
- [x] **T004** — Configurar Site URL + Redirect URLs allow list: `https://iflcosta.tech`, `http://localhost:3000`, `/api/admin/auth-callback`. **S**

---

## 2. Variáveis de ambiente

- [x] **T010** — Adicionar `SUPABASE_ANON_KEY` no Vercel (Settings → Env Vars). Ref: plan §7. **S**
- [x] **T011** — Atualizar `vercel.json` para injetar `IFL_SUPABASE_URL` e `IFL_SUPABASE_ANON_KEY` como globals via header ou template build. **S**

---

## 3. Middleware Vercel

- [x] **T020** — Criar `middleware.js` na raiz do repo com `config.matcher = ['/admin/:path*']`. Ref: plan §3. **M**
- [x] **T021** — Implementar lógica do middleware: whitelist `/admin/login` + `/admin/auth/*`, leitura de cookie `sb-access-token`, validação JWT via Supabase, redirect com `?next=`, injeção de header `x-user-id`. **M**
- [x] **T022** — Adicionar tratamento de refresh token expirado: se access expirou mas refresh ainda válido, renovar e setar novo cookie no response. **M**

---

## 4. Endpoints `/api/admin/`

- [x] **T030** — Criar `api/admin/auth-callback.js` (Edge Function). Recebe `?code=`, troca por sessão, seta cookies httpOnly, redireciona pra `next` ou `/admin`. Ref: plan §3. **M**
- [x] **T031** — Criar `api/admin/auth-logout.js`. Lê cookie, chama `signOut({ scope })`, limpa cookies, redireciona pra `/`. **S**
- [x] **T032** — Criar `api/admin/auth-set-session.js`. Endpoint para login com senha: cliente faz `signInWithPassword`, manda tokens pro server, server seta cookies httpOnly. **M**

---

## 5. Página `/admin/login`

- [x] **T040** — Criar `admin/login.html` com layout single-column, logo, form email, botão "Receber link", toggle "Entrar com senha" colapsado. Mobile-first. Ref: plan §6, spec RF-1 a RF-7. **M**
- [x] **T041** — Criar `assets/js/admin/login.js`: handler do form, `sendMagicLink()` e `signInWithPassword()`, feedback inline com `aria-live`, loading state, polling silencioso pra detectar sessão criada. **M**
- [x] **T042** — Reusar componentes do design system: `.btn`, `.field`, `.input`. Validação client-side via `lib/form-validation.js` da feature 003. **S**
- [x] **T043** — Suportar query params: `?next=`, `?error=expired|session|missing_code` exibindo mensagem apropriada. **S**

---

## 6. Layout base do admin

- [x] **T050** — Criar `admin/_layout.html` como template (header sticky + nav lateral + outlet). Definir slots HTML para conteúdo da rota filha. Como zero-build, será inclusão via JS injetor ou Server Side Includes? **Decisão em sub-task T050.5**. Ref: plan §6. **L**
- [x] **T050.5** — Decidir mecanismo de layout sharing: (a) JS injetor que monta header/nav em runtime, (b) `<iframe>` para nav (não), (c) duplicar HTML em cada página. **Recomendação:** opção (a) — script comum carregado por todas as páginas do admin. **S**
- [x] **T051** — Implementar `assets/js/admin/layout.js`: monta header (logo + theme toggle + menu user), nav (Leads · Clientes · OS · Estoque · Wiki), drawer mobile, estado ativo da rota. **M**
- [x] **T052** — CSS do admin: criar `assets/css/admin.css` com `.admin-shell`, `.admin-header`, `.admin-nav`, `.admin-drawer`. Mobile-first, breakpoints 768/1024. **M**
- [x] **T053** — Theme toggle reusa lib da landing (`assets/js/lib/theme.js`). Persistência idêntica. **S**

---

## 7. Páginas stub (rotas filhas)

- [x] **T060** — Criar `admin/index.html` (dashboard) com 4 cards placeholder: Leads novos, OS abertas, Estoque baixo, WhatsApp pendentes. Cards mostram "Em breve" — populados nas features 005-008. **S**
- [x] **T061** — Criar `admin/leads/index.html` com placeholder "Em breve — feature 005". **S**
- [x] **T062** — Idem para `admin/clientes/`, `admin/os/`, `admin/estoque/`, `admin/wiki/`. **S**
- [x] **T063** — Criar `admin/configuracoes/index.html` com botão "Sair" + "Sair de todos os dispositivos". **S**

---

## 8. Audit log

- [x] **T070** — Estender SQL da feature 003 com inserts para auth: criar function `log_auth(actor, action, after)` que escreve em `audit_log`. **S**
- [x] **T071** — Chamar `log_auth` em: callback de magic link (success), `auth-set-session` (success), `auth-logout` (logout). Falhas de login: ver T072. **S**
- [x] **T072** — Logar `login_fail` em casos de magic link com email não autorizado (interceptar antes de mandar pro Supabase, ou via webhook). **Notas:** Supabase não expõe esse hook diretamente — talvez aceitar que só sucessos são logados. **S**

---

## 9. Testes

- [x] **T080** — Criar `tests/admin-auth.spec.js` com os 6 testes do plan §8. Mock do magic link via setando cookie direto em testes 4-5. **L**
- [x] **T081** — Adicionar `tests/admin-auth.spec.js` ao Playwright config (já deve estar incluso via glob). **S**
- [x] **T082** — Rodar `npm run a11y` apontando para `/admin/login`. Zerar `serious`/`critical`. **S**
- [x] **T083** — Rodar `npm run lhci` em `/admin/login` em mobile. **AC:** Performance ≥ 95. **S**

---

## 10. Deploy e validação

- [x] **T090** — Push de branch `feat/004-admin-auth` → Vercel preview. **S**
- [x] **T091** — Testar em preview: magic link real chega ao email, cookie setado, dashboard carrega. **M**
- [x] **T092** — Testar em iPhone real (Iago): login + dashboard + drawer mobile. **S**
- [x] **T093** — Verificar Network tab: `SUPABASE_SERVICE_ROLE_KEY` **não aparece** em nenhum bundle do cliente. **S**
- [x] **T094** — Merge para `main` → deploy prod. **S**
- [x] **T095** — Atualizar `ROADMAP.md` e este `tasks.md` com checkmarks. **S**

---

## 11. Critério de pronto (Feature 004)

- [x] Sign-ups desabilitados no Supabase Auth confirmado
- [x] `/admin/login` Lighthouse ≥ 95 mobile
- [x] Magic link em pt-BR chega em ≤ 15s
- [x] Cookie httpOnly + Secure + SameSite=Lax setado
- [x] Middleware bloqueia `/admin/*` sem cookie
- [x] Logout limpa cookie e redireciona pra `/`
- [x] Layout admin renderiza em iPhone SE (375px) sem scroll horizontal
- [x] Theme toggle persiste entre landing e admin
- [x] axe-core sem violações `serious`/`critical` no `/admin/login`
- [x] Playwright `tests/admin-auth.spec.js` passando (6 testes)
- [x] Audit log gravando login/logout
- [x] `SUPABASE_SERVICE_ROLE_KEY` invisível no cliente

---

## 12. Bloqueios e dependências

- **Bloqueia:** features 005, 006, 007, 008, 009 (todas as rotas de admin)
- **Desbloqueado por:** 001 (design tokens/components) + Supabase Auth configurável
- **Variável a criar:** `SUPABASE_ANON_KEY` no Vercel
- **Usuário a criar:** Iago no Supabase Auth manualmente
