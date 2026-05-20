# Plan: Admin Auth

**Feature:** `004-admin-auth`
**Spec:** [spec.md](./spec.md)
**Status:** Draft

---

## 1. Decisão de stack

### Vite vs zero-build (resolução)

| Critério | Zero-build | Vite |
|----------|-----------|------|
| Consistência com landing | ✅ idêntico | ❌ divergência |
| Hot reload em dev | ❌ refresh manual | ✅ HMR |
| Tree-shaking | ❌ todos os módulos sempre carregam | ✅ |
| Code splitting por rota | manual via `<script type="module">` | ✅ automático |
| TypeScript | só via JSDoc | ✅ nativo |
| Bundle size | grande se admin crescer (15+ rotas) | otimizado |
| Tempo de setup | 0 | 1h |
| Custo cognitivo | baixo | médio |

**Decisão:** começar **zero-build**, idêntico à landing. Migrar pra Vite **quando**:
- Bundle JS do admin passar de 250KB gzipped, **ou**
- Admin tiver ≥ 10 rotas e duplicação de código ficar evidente, **ou**
- Iago decidir adotar TypeScript (não está no plano agora).

**Justificativa:** princípio II da constituição (Zero Build na landing) tecnicamente abre exceção pro admin, mas YAGNI vence. Vite vira escolha quando dor real aparecer, não preventivamente.

---

## 2. Estrutura de pastas

```
admin/
├── _layout.html              # shell shared (header + nav + outlet)
├── login.html                # /admin/login
├── index.html                # /admin (dashboard)
├── leads/index.html          # /admin/leads (stub nessa feature)
├── clientes/index.html       # /admin/clientes (stub)
├── os/index.html             # /admin/os (stub)
├── estoque/index.html        # /admin/estoque (stub)
├── wiki/index.html           # /admin/wiki (stub)
├── configuracoes/index.html  # /admin/configuracoes (logout global)
└── auth/
    └── callback.html         # /admin/auth/callback?code=...

assets/js/admin/
├── auth.js                   # signIn, signOut, getSession, refreshToken
├── layout.js                 # init de header/nav/drawer
├── login.js                  # lógica da página /admin/login
└── lib/supabase-browser.js   # client browser (anon key)

middleware.js                 # Vercel edge middleware (raiz do repo)
api/
└── admin/
    ├── auth-callback.js      # troca code por sessão (server-side)
    └── auth-logout.js        # signOut com scope global
```

**Por que separar `assets/js/admin/`:** isola o JS do admin do JS da landing. Carregamento condicional por rota.

**Por que `admin/...html` separados:** zero-build → cada rota é um HTML estático. Layout shared é injetado via `<script>` no `<head>` que monta header/nav.

---

## 3. Contratos

### Middleware `middleware.js`

```javascript
export const config = {
  matcher: ['/admin/:path*'],
};

export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Whitelist
  if (path === '/admin/login' || path.startsWith('/admin/auth/')) {
    return; // pass-through
  }

  const accessToken = req.cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return Response.redirect(
      new URL(`/admin/login?next=${encodeURIComponent(path)}`, req.url)
    );
  }

  // Validar JWT contra Supabase
  const { data, error } = await supabaseServer.auth.getUser(accessToken);
  if (error || !data.user) {
    return Response.redirect(new URL('/admin/login?error=session', req.url));
  }

  // Pass adiante com user_id no header
  const res = Response.next();
  res.headers.set('x-user-id', data.user.id);
  return res;
}
```

**Notas:**
- `supabaseServer` = client com `SUPABASE_SERVICE_ROLE_KEY` (env Vercel, nunca cliente).
- Middleware Vercel roda em Edge Runtime → `crypto.subtle` disponível, sem Node APIs.

### Endpoint `/api/admin/auth-callback.js`

```javascript
// Recebe ?code=... do magic link, troca por sessão
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(URL, SERVICE_ROLE);

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/admin';

  if (!code) {
    return Response.redirect(new URL('/admin/login?error=missing_code', req.url));
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return Response.redirect(new URL('/admin/login?error=expired', req.url));
  }

  const { access_token, refresh_token, expires_in } = data.session;

  const res = Response.redirect(new URL(next, req.url));
  res.headers.append(
    'Set-Cookie',
    `sb-access-token=${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/admin; Max-Age=${expires_in}`
  );
  res.headers.append(
    'Set-Cookie',
    `sb-refresh-token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/admin; Max-Age=${60 * 60 * 24 * 30}`
  );
  return res;
}
```

### Endpoint `/api/admin/auth-logout.js`

```javascript
export default async function handler(req) {
  const accessToken = req.cookies.get('sb-access-token')?.value;
  const scope = new URL(req.url).searchParams.get('scope') || 'local';

  if (accessToken) {
    await supabase.auth.signOut({ scope });
  }

  const res = Response.redirect(new URL('/', req.url));
  res.headers.append('Set-Cookie', 'sb-access-token=; Max-Age=0; Path=/admin');
  res.headers.append('Set-Cookie', 'sb-refresh-token=; Max-Age=0; Path=/admin');
  return res;
}
```

### Client `assets/js/admin/auth.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  window.IFL_SUPABASE_URL,
  window.IFL_SUPABASE_ANON_KEY
);

export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/api/admin/auth-callback` },
  });
  return { ok: !error, error: error?.message };
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  // Sessão é setada em cookie via /api/admin/auth-callback? Não — signInWithPassword retorna direto.
  // Precisamos chamar endpoint server pra setar cookie httpOnly. Ver T011 em tasks.
  return { ok: true, session: data.session };
}
```

---

## 4. Tabela `auth.users` e config Supabase

- **Auth providers:** apenas Email + Password + Magic Link. **Disable sign-ups.**
- **Email templates:** customizar pt-BR via Supabase dashboard:
  - Subject: "Entra no seu painel — Iago Lopes | Hardware & Tech"
  - Body: "Toca aqui pra entrar: {{ .ConfirmationURL }}. Esse link vale por 1h."
- **Site URL:** `https://iflcosta.tech` (produção) + `http://localhost:3000` (dev)
- **Redirect URLs allow:** `/api/admin/auth-callback`, `/admin/auth/callback`
- **Email rate limit:** default Supabase (4/hr por endereço) — basta.

---

## 5. Audit log

Esta feature cria a tabela `audit_log` se ainda não existir (a feature 003 já criou para leads — confirmar reusar).

```sql
-- Já existe via 003-lead-capture migration; só usamos aqui.
-- Schema: id, at, actor, action, entity, entity_id, before, after, ip_hash
```

Inserts deste módulo:
- `login_success` — actor = user_id, action = 'login', entity = 'auth', after = { method: 'magic_link' | 'password' }
- `login_fail` — actor = null, action = 'login_fail', entity = 'auth', after = { email: hash, reason: 'invalid' }
- `logout` — actor = user_id, action = 'logout', entity = 'auth', after = { scope: 'local' | 'global' }

---

## 6. UI/UX guidelines

### Tela `/admin/login`

```
┌────────────────────────────┐
│                            │
│       Iago Lopes           │
│    Hardware & Tech         │
│                            │
│  ┌──────────────────────┐  │
│  │ seu@email.com        │  │
│  └──────────────────────┘  │
│                            │
│  [  Receber link  ]        │
│                            │
│  ───────── ou ─────────    │
│                            │
│  ▸ Entrar com senha        │
│                            │
└────────────────────────────┘
```

- Logo em monograma "IL" (mesmo do header da landing)
- Form em column única, max-width 380px
- Botão primário "Receber link" — mesma classe `btn btn--primary` do design system
- Toggle "Entrar com senha" → expande campo password com transition smooth
- Mensagem de feedback abaixo do botão, `aria-live="polite"`

### Layout admin

```
┌─────────────────────────────────────────┐
│ ☰  Iago Lopes | Hardware & Tech   ☀ 👤 │  ← header (sticky)
├──────┬──────────────────────────────────┤
│      │                                  │
│ Lead │   Outlet (rota filha)            │
│ Cli  │                                  │
│ OS   │                                  │
│ Estq │                                  │
│ Wiki │                                  │
│      │                                  │
└──────┴──────────────────────────────────┘
```

- Desktop ≥ 1024: nav lateral 220px fixo
- Tablet 768-1023: nav lateral colapsa em ícones (60px)
- Mobile < 768: nav vira drawer (hamburger no header)
- Theme toggle reusa lógica de `assets/js/lib/theme.js` da landing

---

## 7. Variáveis de ambiente

| Var | Onde | Valor |
|-----|------|-------|
| `SUPABASE_URL` | Vercel + middleware + endpoints | já existe (003) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + middleware + endpoints | já existe (003) |
| `IFL_SUPABASE_URL` (window) | injetado em `_layout.html` para cliente | mesmo valor de SUPABASE_URL |
| `IFL_SUPABASE_ANON_KEY` (window) | idem | nova var Vercel: `SUPABASE_ANON_KEY` |

Adicionar `SUPABASE_ANON_KEY` ao Vercel + ao build (`vercel.json` headers ou template).

---

## 8. Testes

### Playwright `tests/admin-auth.spec.js`

- **Test 1:** acessar `/admin` sem cookie → redireciona pra `/admin/login?next=/admin`.
- **Test 2:** `/admin/login` carrega com form visível, axe-core sem violações.
- **Test 3:** preencher email + clicar "Receber link" → feedback "manda o olhar no email".
- **Test 4:** mock magic link → `/admin/auth/callback?code=fake` → cookie setado, redirect pra `/admin`.
- **Test 5:** logout limpa cookie, redireciona pra `/`.
- **Test 6:** drawer mobile abre/fecha no viewport iPhone SE.

### Manual

- Magic link real chega ao email do Iago em ≤ 15s.
- Cookie httpOnly visível no DevTools (Application > Cookies).
- `SUPABASE_SERVICE_ROLE_KEY` **não aparece** em nenhum JS bundle (busca no DevTools Sources).

---

## 9. Riscos técnicos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Vercel Edge Middleware lento (cold start) | Manter middleware enxuto (só JWT verify). Não fazer query ao DB nele. |
| `signInWithPassword` no client retorna sessão mas não seta cookie httpOnly | Após login bem-sucedido, POST pro `/api/admin/auth-set-session` que seta cookies. |
| Cookie SameSite quebra em iframe | Não usamos iframe. `Lax` está OK. |
| Magic link aberto em browser diferente do que pediu | Funciona: o cookie é setado no browser que abre o link. Polling do `/admin/login` original detecta e auto-redireciona — mas se não, o user só precisa clicar de novo. |

---

## 10. Definição de pronto

- Spec respeitada 100%
- Lighthouse `/admin/login` ≥ 95 mobile
- Playwright + axe + manual passando
- `tasks.md` 100% checadas
- Deploy preview Vercel validado
- Iago testou em iPhone real
- ADR criado se desviarmos de qualquer princípio da constituição
