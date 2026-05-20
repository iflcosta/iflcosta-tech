# Spec: Admin Auth

**Feature:** `004-admin-auth`
**Status:** Draft
**Criada:** 2026-05-19
**Depende de:** `constitution.md`, `001-design-system`
**Bloqueia:** `005-admin-crm`, `006-admin-os`, `007-admin-inventory`, `008-whatsapp-bridge`, `009-copilot-ia`

---

## 1. Contexto

O admin substitui completamente o Notion atual do Iago (CRM + agenda + estoque + wiki). Antes de qualquer feature de admin existir, precisamos do **gate de autenticação**: rota `/admin/*` exige sessão válida; resto da landing pública continua aberto.

A constituição (§V Operação Solo First) define: **single-user**. Iago é o único humano autenticado. Não há convite, não há multi-tenant, não há RBAC. Toda a complexidade que multi-user traria é cortada por design.

Esta feature entrega:
1. Página `/admin/login` com magic link + senha (fallback)
2. Middleware Vercel que protege todas as rotas `/admin/*` exceto `/admin/login`
3. Sessão persistida (cookie httpOnly, JWT Supabase)
4. Layout base do admin (shell, nav lateral, header com logout)
5. Decisão de stack: Vite ou continuar zero-build? (resolução em `plan.md`)

---

## 2. Objetivos

1. **Iago entra em ≤ 2 toques** — magic link clicado → admin carregado, sem digitação.
2. **Mobile-first** — login funciona perfeitamente em iPhone/Android, layout admin idem.
3. **Sessão dura semanas** — não pedir login toda hora; refresh token automático.
4. **Logout completo** — limpa cookie + invalida sessão no Supabase.
5. **Erro de auth não vaza informação** — mesma mensagem para "email não existe" e "email não autorizado".
6. **Zero exposição de chave** — `SUPABASE_SERVICE_ROLE_KEY` nunca chega ao cliente.

---

## 3. Cenários de Uso

### Cenário A: Iago entra pela primeira vez no celular
Iago abre `iflcosta.tech/admin` no Chrome Android. É redirecionado pra `/admin/login`. Vê campo de email com seu email pré-preenchido (`autocomplete="email"`). Toca "Receber link". Em 5–15s recebe o email do Supabase. Toca o link no email → abre Chrome no `/admin` autenticado. Cookie persiste; toda visita futura cai direto no admin.

### Cenário B: Iago já está autenticado e entra do desktop
Iago abre `iflcosta.tech/admin` no notebook (cookie ainda válido do uso anterior). Cai direto no dashboard. Nav lateral mostra: Leads, Clientes, OS, Estoque, Wiki. Header tem nome, theme toggle, logout.

### Cenário C: Sessão expirou
Iago abre admin após 30 dias. Cookie expirado. Vai pro `/admin/login` automaticamente. Faz magic link de novo.

### Cenário D: Email errado / ataque
Visitante tenta `qualquer@email.com` no `/admin/login`. Vê mesma mensagem de "verifica seu email" (UX honesta) mas o Supabase só envia o link se o email estiver na allowlist (1 email: o do Iago). Endpoint não revela diferença.

### Cenário E: Magic link expirado
Iago demora 1h pra clicar no link. Link expirou. Página `/admin/login?error=expired` aparece com botão "Pedir novo link". Não fica em loop.

### Cenário F: Logout manual
Iago toca "Sair". Cookie removido, `signOut()` chamado, redirect pra `/` (landing). Tentativa de voltar com backspace vai pro `/admin/login`.

### Cenário G: Iago esqueceu o celular logado num lugar
No notebook em casa, Iago vai em "Sair de todos os dispositivos" (settings do admin). Todas as sessões dele no Supabase Auth são revogadas. Próxima request do celular do trabalho cai em `/admin/login`.

---

## 4. Requisitos Funcionais

### Página `/admin/login`

- **RF-1.** Layout single-column, mobile-first, centralizado vertical. Logo "Iago Lopes | Hardware & Tech" no topo.
- **RF-2.** Campo email com `type="email"`, `autocomplete="email"`, `inputmode="email"`. Validação client-side (regex leve) + server-side.
- **RF-3.** Botão primário "Receber link no email" — dispara magic link.
- **RF-4.** Link "Entrar com senha" colapsado por default — expande campo password + botão "Entrar".
- **RF-5.** Feedback inline:
  - Sucesso magic link: "Manda o olhar no email — link em até 15s."
  - Sucesso senha: redirect imediato.
  - Erro: mensagem genérica "Não consegui te autenticar. Tenta de novo." (sem distinguir email não autorizado vs senha errada).
- **RF-6.** Loading state durante request (botão `aria-busy`, texto "Enviando…").
- **RF-7.** Após sucesso de magic link, polling silencioso a cada 3s checando se sessão foi criada (caso o user abra o link no mesmo browser).

### Magic link flow

- **RF-10.** Email enviado pelo Supabase Auth com template em pt-BR ("Toca aqui pra entrar no painel: …").
- **RF-11.** Link aterra em `/admin/auth/callback?code=...` — servidor troca code por sessão, seta cookie, redireciona pra `/admin`.
- **RF-12.** Link tem TTL de 1h (config Supabase Auth).
- **RF-13.** Link expirado → `/admin/login?error=expired` com mensagem clara.

### Senha (fallback)

- **RF-20.** Senha definida via Supabase dashboard manualmente (não há UI de "criar conta").
- **RF-21.** Reset de senha **não implementado** — se Iago perder a senha, ele faz reset via dashboard direto ou usa magic link.
- **RF-22.** Login com senha valida no servidor (`signInWithPassword`), seta cookie idêntico ao do magic link.

### Allowlist

- **RF-30.** Apenas 1 email cadastrado (Iago). Implementação: Supabase Auth com sign-ups desabilitados; usuário criado manualmente via dashboard.
- **RF-31.** Tentativa de magic link com email não cadastrado retorna mesma mensagem de sucesso (UX) mas o Supabase **não envia email**.

### Middleware Vercel

- **RF-40.** Toda rota `/admin/*` passa por middleware (`middleware.js` na raiz, `matcher: '/admin/:path*'`).
- **RF-41.** Middleware lê cookie de sessão, valida JWT contra Supabase (server-side).
- **RF-42.** Se inválido/ausente: redireciona pra `/admin/login` preservando o `?next=` para voltar depois do login.
- **RF-43.** Se válido: passa adiante, com header `x-user-id` injetado pra páginas server-rendered.
- **RF-44.** `/admin/login` e `/admin/auth/callback` são exceções (não passam por gate).

### Sessão

- **RF-50.** Cookie `sb-access-token` httpOnly, Secure, SameSite=Lax, Path=/admin, duração default Supabase (1h access + refresh token longo).
- **RF-51.** Refresh automático: helper `getSession()` no cliente checa expiração e dispara refresh.
- **RF-52.** "Sair de todos os dispositivos" no admin → `signOut({ scope: 'global' })`.

### Layout base do admin

- **RF-60.** Shell `/admin/_layout.html` (ou equivalente no framework escolhido) com:
  - Header: logo, theme toggle, menu user (logout).
  - Nav lateral (desktop) / drawer (mobile): Leads · Clientes · OS · Estoque · Wiki.
  - Main: outlet das rotas filhas.
- **RF-61.** Mobile (<768px): nav vira drawer com hamburger no header.
- **RF-62.** Estado ativo da rota: item nav destacado.
- **RF-63.** Dashboard inicial `/admin` mostra: "Olá, Iago" + 4 cards (leads novos, OS abertas, estoque baixo, mensagens WhatsApp não lidas — esses cards são placeholders nesta feature, populados nas features 005-008).

### Logout

- **RF-70.** Botão "Sair" no menu user → chama `signOut()` → remove cookie → redireciona pra `/`.
- **RF-71.** Botão "Sair de todos os dispositivos" em uma página `/admin/configuracoes` (que esta feature cria como stub).

---

## 5. Requisitos Não-Funcionais

- **RNF-1.** Performance: `/admin/login` Lighthouse ≥ 95 mobile (mesma régua da landing).
- **RNF-2.** Acessibilidade: WCAG 2.2 AA. Form rotulado, foco visível, erro com `aria-live`.
- **RNF-3.** Segurança:
  - `SUPABASE_SERVICE_ROLE_KEY` apenas em middleware/server. Cliente usa anon key.
  - Cookies httpOnly + Secure + SameSite=Lax.
  - HTTPS obrigatório (Vercel força).
  - CSP `default-src 'self'`, `script-src 'self'` (sem inline exceto nonce).
- **RNF-4.** LGPD: email do Iago é dado pessoal de operador, não cliente — base legal "interesse legítimo" + finalidade clara. Sem analytics no `/admin`.
- **RNF-5.** Audit log: toda operação de login/logout grava em `audit_log` (entidade `auth`, action `login_success` / `login_fail` / `logout`).

---

## 6. Fora de Escopo

- ❌ Multi-user, RBAC, convites — proibido por constituição §V.
- ❌ OAuth (Google/Apple) — magic link basta, evita política de privacidade extra.
- ❌ 2FA — Iago não pediu; pode entrar em 010+ se decidir depois.
- ❌ "Lembrar de mim" toggle — cookie longo por default.
- ❌ Auditoria de tentativas de brute force — rate limit nativo do Supabase basta nessa fase.

---

## 7. Critérios de Pronto

- [ ] `/admin/login` carrega em mobile com Lighthouse ≥ 95
- [ ] Magic link chega ao email do Iago em ≤ 15s
- [ ] Cookie de sessão setado e visível em DevTools com httpOnly + Secure
- [ ] Acessar `/admin/leads` (rota stub) sem cookie redireciona pra `/admin/login?next=/admin/leads`
- [ ] Após login, voltar a `/admin/leads` (consumir `next`)
- [ ] Logout limpa cookie e redireciona pra `/`
- [ ] axe-core sem violações `serious`/`critical` no `/admin/login`
- [ ] Playwright smoke test: fluxo completo de login + logout passa
- [ ] Layout base do admin renderiza em iPhone SE (375px) sem scroll horizontal
- [ ] `SUPABASE_SERVICE_ROLE_KEY` não aparece em nenhum bundle do cliente (verificar Network tab)
- [ ] Sign-ups desabilitados no Supabase Auth confirmado via dashboard

---

## 8. Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Decisão Vite vs zero-build atrasa | Médio | Resolver em `plan.md` antes de tasks. Default: continuar zero-build, mover pra Vite só se necessário. |
| Magic link cai no spam do Outlook | Alto | Iago testa com email atual antes do go-live. Configurar SPF/DKIM do domínio do Supabase. |
| Cookie SameSite quebra fluxo cross-domain | Médio | Admin é mesmo domínio da landing — não tem cross-domain. SameSite=Lax basta. |
| RLS mal configurada vaza dados em features futuras | Alto | Toda tabela tem RLS on por default na constituição §III. Esta feature não toca tabelas de dados — apenas `auth.users` gerenciada pelo Supabase. |
| Iago esquece a senha | Baixo | Magic link é fallback nativo; reset via dashboard. |

---

**Próximo:** `plan.md` decide stack (Vite vs zero-build), estrutura de pastas do admin, contratos do middleware.
