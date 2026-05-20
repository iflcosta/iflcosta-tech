# Plan: Captação de Leads

**Feature:** `003-lead-capture`
**Status:** Draft
**Criada:** 2026-05-19
**Spec:** [spec.md](./spec.md)
**Depende de:** [001-design-system/plan.md](../001-design-system/plan.md), [002-landing-public/plan.md](../002-landing-public/plan.md)

> Este plano traduz a `spec.md` em decisões concretas: arquitetura do form, schema SQL completo, endpoint server-side, máscara de telefone, anti-spam, validações, redirect WhatsApp, persistência local e analytics. O modal já existe estaticamente na landing — aqui resolvemos o **comportamento de produção**.

---

## 1. Decisões Estratégicas

### Stack confirmada para este feature

| Camada | Decisão | Justificativa |
|---|---|---|
| UI modal | HTML + CSS classes BEM já existente no `index.html` | Coerente com ADR 0005 (landing sem Web Components) |
| UI página `/orcamento` | Página estática `orcamento.html` reusando os mesmos componentes | Princípio II (zero build) |
| Validação cliente | JS vanilla com Constraint Validation API + custom error display | Sem framework, sem dependência, ≤ 3KB |
| Máscara de telefone | Função pura própria em `assets/js/lib/phone-mask.js` | Libs de máscara (IMask, Cleave) custam 10-30KB; pra um único campo, função inline ganha |
| Submit handler | `fetch()` para `/api/leads` (POST JSON) | Padrão moderno; sem `<form action>` clássico |
| Endpoint server | Vercel Edge Function `/api/leads` em JS | Stack já existe no projeto legado |
| Persistência | Supabase Postgres (tabela `leads`) via service_role no endpoint | Princípio III (único banco) |
| Anti-spam | Honeypot + rate limit por IP hash + timing check (≥ 3s) | Sem CAPTCHA visível (decisão confirmada com Iago) |
| Redirect pós-submit | `window.location.assign(wa.me/...)` com fallback visual | Princípio IV (WhatsApp é o canal) |
| Analytics | GA4 via `gtag()` global, eventos disparados em hooks no JS | Conforme RF-31 |

### Trade-offs aceitos

- **Sem reCAPTCHA / Turnstile nessa fase.** Se o spam passar de ~5/dia em produção real, abrimos ADR 0006 e adicionamos Turnstile (não Google, por LGPD).
- **Sem validação assíncrona de telefone existente** (verificar se já existe lead com mesmo número antes de inserir). Dedupe é feito no servidor com `ON CONFLICT` por (telefone normalizado, dia), respondendo 200 OK silenciosamente — não vamos atritar o usuário por isso.
- **Mensagem de WhatsApp em template fixo no servidor** — não montada no cliente. Garante consistência e permite incluir info que o cliente não viu (ex: ID do lead pra rastreio).

---

## 2. Schema SQL — Tabela `leads`

### Migration

```sql
-- /supabase/migrations/2026_05_19_create_leads.sql

create extension if not exists "pgcrypto";

create type lead_servico as enum (
  'celular_tablet',
  'notebook_pc',
  'custom_pc',
  'suporte_ti',
  'outro'
);

create type lead_origem as enum (
  'modal',
  'page'
);

create type lead_status as enum (
  'novo',
  'contatado',
  'orcamento_enviado',
  'convertido',
  'perdido'
);

create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  nome         text not null check (char_length(nome) between 2 and 80),
  telefone     text not null check (telefone ~ '^[0-9]{10,11}$'),
  email        text,
  servico      lead_servico not null,
  mensagem     text check (char_length(mensagem) <= 1500),
  cidade       text,
  urgencia     text check (urgencia in ('hoje', 'essa_semana', 'sem_pressa')),
  origem       lead_origem not null,
  cta_location text,
  user_agent   text check (char_length(user_agent) <= 500),
  referrer     text check (char_length(referrer) <= 500),
  consent_at   timestamptz not null,
  ip_hash      text,
  status       lead_status not null default 'novo',
  notes        text  -- preenchido pelo admin
);

-- Índice pra dedupe por (telefone, dia)
create unique index leads_telefone_day_uniq
  on public.leads (telefone, date_trunc('day', created_at));

-- Índices pra queries do admin
create index leads_status_idx on public.leads (status, created_at desc);
create index leads_created_at_idx on public.leads (created_at desc);

-- Row Level Security
alter table public.leads enable row level security;

-- Apenas service_role pode INSERT (via endpoint server-side)
-- anon não pode nada (nem SELECT)
-- authenticated (admin logado) pode SELECT/UPDATE/DELETE — políticas adicionadas em 005-admin-crm
create policy "service_role full access" on public.leads
  for all to service_role using (true) with check (true);

-- (Políticas pro admin authenticated serão adicionadas em 005-admin-crm)

-- Audit trigger (preparação pra 005)
create table public.audit_log (
  id          bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor       text,           -- 'system' | 'admin' | uuid de auth.users
  action      text not null,  -- 'lead_created', 'lead_status_changed', etc.
  entity      text not null,  -- 'leads', 'customers', etc.
  entity_id   text,
  before      jsonb,
  after       jsonb
);

create or replace function public.log_lead_insert()
returns trigger language plpgsql as $$
begin
  insert into public.audit_log (actor, action, entity, entity_id, after)
  values ('system', 'lead_created', 'leads', new.id::text, to_jsonb(new));
  return new;
end;
$$;

create trigger leads_audit_insert
  after insert on public.leads
  for each row execute function public.log_lead_insert();
```

### Retenção (cron mensal)

```sql
-- A rodar via Supabase cron ou GitHub Action mensal
-- Purga leads não convertidos com > 180 dias (LGPD)
delete from public.leads
where status in ('novo', 'perdido')
  and created_at < now() - interval '180 days';
```

---

## 3. Endpoint `POST /api/leads`

### Localização

`/api/leads.js` na raiz do projeto Vercel (Edge Function).

### Contract

**Request:**
```http
POST /api/leads HTTP/1.1
Content-Type: application/json

{
  "nome": "Maria Silva",
  "telefone": "(11) 91234-5678",
  "email": "maria@example.com",     // opcional
  "servico": "celular_tablet",      // enum
  "mensagem": "Tela trincada...",   // opcional ≤ 1500 chars
  "cidade": "Bragança Paulista",    // opcional, apenas modo page
  "urgencia": "essa_semana",        // opcional, apenas modo page
  "origem": "modal",                // modal | page
  "cta_location": "hero",           // opcional
  "consent": true,                  // OBRIGATÓRIO true
  "website": "",                    // honeypot — DEVE ser string vazia
  "_t": 1716120000000               // timestamp client-side de form_open (anti-bot timing)
}
```

**Response (sucesso):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true,
  "redirect": "https://wa.me/5511919691542?text=Oi%20Iago%2C%20sou%20Maria%20Silva..."
}
```

**Response (validação falhou):**
```http
HTTP/1.1 400 Bad Request

{
  "ok": false,
  "error": "validation_failed",
  "message": "Telefone precisa ter 10 ou 11 dígitos.",
  "field": "telefone"
}
```

**Response (rate limit):**
```http
HTTP/1.1 429 Too Many Requests

{
  "ok": false,
  "error": "rate_limited",
  "message": "Muitas tentativas. Tenta de novo em alguns minutos."
}
```

**Response (consent ausente):**
```http
HTTP/1.1 400 Bad Request

{
  "ok": false,
  "error": "consent_missing",
  "message": "É preciso aceitar a Política de Privacidade pra continuar."
}
```

**Response (honeypot ou timing falhou):**
```http
HTTP/1.1 200 OK

{ "ok": true, "redirect": null }
```
*(Fingimos sucesso pro bot, mas não persistimos nada. Cliente também não redireciona porque `redirect: null`.)*

### Fluxo do endpoint

```javascript
// /api/leads.js (pseudo-código)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '3');
const RATE_LIMIT_WINDOW_S = parseInt(process.env.RATE_LIMIT_WINDOW || '3600');
const MIN_FILL_TIME_MS = 3000;

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '5511919691542';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  const body = await req.json().catch(() => null);
  if (!body) return json(400, { ok: false, error: 'invalid_json' });

  // 1. Honeypot
  if (body.website && body.website.length > 0) {
    return json(200, { ok: true, redirect: null }); // fake success
  }

  // 2. Timing check (form_open → submit < 3s = bot)
  const elapsed = Date.now() - (body._t || 0);
  if (elapsed < MIN_FILL_TIME_MS) {
    return json(200, { ok: true, redirect: null }); // fake success
  }

  // 3. Validação de campos
  const validation = validateLead(body);
  if (!validation.ok) {
    return json(400, {
      ok: false,
      error: 'validation_failed',
      message: validation.message,
      field: validation.field
    });
  }

  // 4. Consent obrigatório
  if (body.consent !== true) {
    return json(400, {
      ok: false,
      error: 'consent_missing',
      message: 'É preciso aceitar a Política de Privacidade pra continuar.'
    });
  }

  // 5. Rate limit por IP hash
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || '';
  const ipHash = await sha256(ip + process.env.IP_SALT);
  const rateOk = await checkRateLimit(ipHash);
  if (!rateOk) {
    return json(429, {
      ok: false,
      error: 'rate_limited',
      message: 'Muitas tentativas. Tenta de novo em alguns minutos.'
    });
  }

  // 6. Normalização
  const telefone = body.telefone.replace(/\D/g, ''); // só dígitos

  // 7. Insert no Supabase
  const insertPayload = {
    nome: body.nome.trim(),
    telefone,
    email: body.email?.trim() || null,
    servico: body.servico,
    mensagem: body.mensagem?.trim() || null,
    cidade: body.cidade || null,
    urgencia: body.urgencia || null,
    origem: body.origem,
    cta_location: body.cta_location || null,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 500),
    referrer: body.referrer?.slice(0, 500) || null,
    consent_at: new Date().toISOString(),
    ip_hash: ipHash
  };

  const { data, error } = await supabase
    .from('leads')
    .insert(insertPayload)
    .select('id')
    .single();

  // Trata dedupe (mesmo telefone no mesmo dia) como sucesso silencioso
  if (error && error.code === '23505') {
    return json(200, {
      ok: true,
      redirect: buildWhatsAppUrl(body),
      deduped: true
    });
  }

  if (error) {
    console.error('lead insert failed', error);
    return json(500, {
      ok: false,
      error: 'server_error',
      message: 'Algo deu errado do meu lado. Manda direto no WhatsApp: ' + formatPhone(WHATSAPP_NUMBER)
    });
  }

  // 8. Resposta com redirect
  return json(200, {
    ok: true,
    redirect: buildWhatsAppUrl(body)
  });
}
```

### Funções auxiliares

```javascript
function validateLead(b) {
  if (typeof b.nome !== 'string' || b.nome.trim().length < 2 || b.nome.length > 80)
    return { ok: false, field: 'nome', message: 'Nome precisa ter entre 2 e 80 caracteres.' };

  const tel = (b.telefone || '').replace(/\D/g, '');
  if (!/^[0-9]{10,11}$/.test(tel))
    return { ok: false, field: 'telefone', message: 'Telefone precisa ter 10 ou 11 dígitos. Coloca o DDD junto.' };

  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))
    return { ok: false, field: 'email', message: 'Email parece inválido.' };

  const SERVICOS = ['celular_tablet', 'notebook_pc', 'custom_pc', 'suporte_ti', 'outro'];
  if (!SERVICOS.includes(b.servico))
    return { ok: false, field: 'servico', message: 'Escolhe um serviço.' };

  if (b.mensagem && b.mensagem.length > 1500)
    return { ok: false, field: 'mensagem', message: 'Mensagem ficou muito longa (máx 1500).' };

  if (!['modal', 'page'].includes(b.origem))
    return { ok: false, field: 'origem', message: 'Origem inválida.' };

  return { ok: true };
}

function buildWhatsAppUrl(b) {
  const SERVICO_NAMES = {
    celular_tablet: 'Conserto de celular/tablet',
    notebook_pc: 'Manutenção de notebook/PC',
    custom_pc: 'Montagem de Custom PC',
    suporte_ti: 'Suporte TI / Redes',
    outro: 'Suporte técnico'
  };
  const lines = [
    `Oi Iago, sou ${b.nome.trim().split(' ')[0]}.`,
    `Preciso de: ${SERVICO_NAMES[b.servico]}.`
  ];
  if (b.cidade) lines.push(`Cidade: ${b.cidade}.`);
  if (b.urgencia) lines.push(`Urgência: ${b.urgencia.replace('_', ' ')}.`);
  if (b.mensagem) lines.push(`\nDetalhes: ${b.mensagem.trim().slice(0, 400)}`);
  lines.push('\nVim pelo site.');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Rate limit usando Supabase como backing store
async function checkRateLimit(ipHash) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_S * 1000).toISOString();
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gt('created_at', windowStart);
  return (count || 0) < RATE_LIMIT_MAX;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Variáveis de ambiente necessárias

| Var | Origem | Notas |
|---|---|---|
| `SUPABASE_URL` | Vercel project env | Já configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel project env | **Apenas servidor** — nunca expor cliente |
| `WHATSAPP_NUMBER` | Vercel project env | `5511919691542` |
| `RATE_LIMIT_MAX` | Vercel project env | 3 |
| `RATE_LIMIT_WINDOW` | Vercel project env | 3600 |
| `IP_SALT` | Vercel project env | String secreta longa, rotacionar anualmente |

---

## 4. Cliente — Comportamento JS

### Arquitetura

Em vez de inflar `app.js` (que já passa de 200 linhas com várias responsabilidades), criar módulos pequenos consumidos por `app.js`:

```
/assets/js
├── app.js                       ← entry, importa os módulos
├── /lib
│   ├── phone-mask.js            ← máscara (11) 9 9999-9999
│   ├── form-validation.js       ← regras client-side
│   ├── orcamento-form.js        ← orquestrador do modal + page form
│   └── analytics.js             ← gtag() wrapper + eventos
```

Como a landing não tem bundler, cada arquivo é incluído via `<script>` com `defer` na ordem correta, OU usamos `<script type="module">` (preferível — permite `import` nativo).

### Estratégia: ES Modules nativos

Em `index.html` (e `orcamento.html`):

```html
<script type="module" src="/assets/js/main.js"></script>
```

Onde `main.js` faz:

```javascript
import { initTheme } from './lib/theme.js';
import { initOrcamentoForm } from './lib/orcamento-form.js';
import { initAnalytics } from './lib/analytics.js';
import { initConsent } from './lib/consent.js';
// ... etc

initTheme();
initAnalytics();
initConsent();
initOrcamentoForm();
// ...
```

**Atenção:** isso é uma evolução do `app.js` atual (IIFE único). Precisamos refatorar `app.js` pra extrair as funções pra módulos — task de implementação (ver `tasks.md`).

### Phone mask (`lib/phone-mask.js`)

```javascript
// Aplica máscara (11) 9 9999-9999 em input pt-BR
export function attachPhoneMask(input) {
  input.addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 0) formatted = '(' + digits.slice(0, 2);
    if (digits.length > 2) formatted += ') ' + digits.slice(2, digits.length === 11 ? 3 : 2);
    if (digits.length > 7) formatted += ' ' + digits.slice(digits.length === 11 ? 3 : 2, digits.length === 11 ? 7 : 6) + '-' + digits.slice(digits.length === 11 ? 7 : 6);
    else if (digits.length > 6) formatted += ' ' + digits.slice(digits.length === 11 ? 3 : 2, digits.length) + (digits.length === 11 ? '' : '-' + digits.slice(6));
    e.target.value = formatted;
  });
  input.addEventListener('blur', (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length < 10) input.setCustomValidity('Coloca o DDD + número completo, tipo (11) 91234-5678.');
    else input.setCustomValidity('');
  });
}
```

*(Implementação real pode ser refinada — testes em `tasks.md`.)*

### Form orchestrator (`lib/orcamento-form.js`)

```javascript
import { attachPhoneMask } from './phone-mask.js';
import { validateField } from './form-validation.js';
import { track } from './analytics.js';

const STORAGE_KEY_PREFIX = 'ifl-form-draft:';
const STORAGE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const FORM_OPEN_KEY = '_t_form_open';

export function initOrcamentoForm() {
  const forms = document.querySelectorAll('[data-orcamento-form]');
  forms.forEach(setupForm);
}

function setupForm(form) {
  const mode = form.dataset.mode || 'modal'; // 'modal' | 'page'
  const tel = form.querySelector('[name="telefone"]');
  if (tel) attachPhoneMask(tel);

  // Restaurar draft
  restoreDraft(form, mode);

  // Salvar draft em cada input
  form.addEventListener('input', () => saveDraft(form, mode));

  // Validação em blur
  form.querySelectorAll('input, select, textarea').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formOpenAt = parseInt(sessionStorage.getItem(FORM_OPEN_KEY + mode) || '0');

    if (!form.checkValidity()) {
      form.reportValidity();
      track('form_submit_error', { form_type: mode, error_code: 'client_validation' });
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Enviando…';

    const payload = collectPayload(form, formOpenAt, mode);
    track('form_submit_attempt', { form_type: mode });

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.ok && data.redirect) {
        track('form_submit_success', { form_type: mode, servico: payload.servico });
        clearDraft(mode);
        showSuccess(form);
        // Pequeno delay pra usuário ver "✓ Enviado"
        setTimeout(() => {
          track('whatsapp_redirect', { from_form: mode });
          window.location.assign(data.redirect);
        }, 800);
      } else if (data.ok && !data.redirect) {
        // Honeypot/timing — silencioso. Mostra sucesso falso pro bot.
        showSuccess(form);
      } else {
        showError(form, data.message || 'Algo deu errado. Tenta de novo.');
        track('form_submit_error', { form_type: mode, error_code: data.error });
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        submitBtn.textContent = 'Enviar orçamento';
      }
    } catch (err) {
      showError(form, 'Não consegui enviar. Tenta de novo ou fala direto: (11) 91969-1542');
      track('form_submit_error', { form_type: mode, error_code: 'network' });
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Enviar orçamento';
    }
  });
}

function collectPayload(form, formOpenAt, mode) {
  const fd = new FormData(form);
  return {
    nome: fd.get('nome'),
    telefone: fd.get('whats') || fd.get('telefone'),
    email: fd.get('email') || null,
    servico: fd.get('servico'),
    mensagem: fd.get('problema') || fd.get('mensagem') || null,
    cidade: fd.get('cidade') || null,
    urgencia: fd.get('urgencia') || null,
    origem: mode,
    cta_location: form.dataset.ctaLocation || null,
    consent: fd.get('consent') === 'on' || fd.get('consent') === 'true',
    website: fd.get('website') || '',
    referrer: document.referrer || null,
    _t: formOpenAt
  };
}

// ... saveDraft / restoreDraft / clearDraft / showSuccess / showError elididos por brevidade
```

### Form open timestamp (anti-bot)

Quando o modal abre (`openModal()` em `app.js`), grava timestamp:

```javascript
sessionStorage.setItem('_t_form_open:modal', Date.now().toString());
track('form_open', { form_type: 'modal', cta_location: ctaLocation });
```

E quando `/orcamento` carrega:

```javascript
sessionStorage.setItem('_t_form_open:page', Date.now().toString());
track('form_open', { form_type: 'page' });
```

---

## 5. Página `/orcamento` (versão longa)

### Arquivo: `c:/iflcosta-tech/orcamento.html`

Reusa o layout das páginas legais (header + footer + container central), mas o conteúdo é o formulário longo. Diferenças do modal:

- Adiciona campos: **Email**, **Cidade** (select), **Urgência** (select), **Como soube de mim** (select opcional)
- Campos condicionais: se `servico === custom_pc`, mostra **Tipo de uso** (gamer/produtividade/workstation) e **Faixa de orçamento**
- Atributo no form: `data-orcamento-form data-mode="page"`
- Não tem `modal__actions` — usa botão de submit normal em destaque
- Hero curto no topo: "Orçamento online — vou responder em até 1 hora útil."

Estrutura HTML (esqueleto):

```html
<section>
  <div class="container" style="max-width: 720px;">
    <div class="section-head">
      <span class="eyebrow">Orçamento</span>
      <h1>Me conta o que está acontecendo</h1>
      <p>Quanto mais detalhe, mais preciso o orçamento. Vou responder em até 1 hora útil.</p>
    </div>

    <form data-orcamento-form data-mode="page" class="page-form" novalidate>
      <!-- Honeypot (igual ao modal) -->
      <!-- Chips de serviço -->
      <!-- Campos: nome, telefone, email -->
      <!-- Campos condicionais: tipo_uso (só Custom PC), orcamento, prazo -->
      <!-- Cidade, Urgência, Como soube -->
      <!-- Mensagem detalhada (1500 chars com counter) -->
      <!-- Checkbox LGPD -->
      <!-- Botão submit -->
    </form>
  </div>
</section>
```

A página é spawn-able futuramente em SEO orgânico ("orçamento conserto celular bragança paulista").

---

## 6. Integração com a landing existente

### Modal — mudanças mínimas no `index.html`

A estrutura HTML do modal já está pronta. Mudanças necessárias:

- Adicionar `data-mode="modal"` no `<form>`
- Adicionar `data-cta-location` em cada botão `[data-modal-open]` (já parcialmente feito em alguns hero)
- Trocar `<script src="assets/js/app.js" defer>` por `<script type="module" src="assets/js/main.js"></script>`
- Refatorar `app.js` quebrando em módulos (ver §4)

### Anti-spam — adições no HTML do modal

```html
<!-- Honeypot — JÁ EXISTE no index.html linha 850 -->
<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
  <label>Website</label>
  <input type="text" name="website" tabindex="-1" autocomplete="off">
</div>
```

✓ Já implementado.

---

## 7. Tratamento de erros — UX

### Erros de cliente (Constraint Validation API)

- Browser exibe popup nativa em campos `required` ou com `setCustomValidity`
- Mensagens custom em pt-BR via `setCustomValidity` no blur
- `aria-invalid="true"` + `aria-describedby` apontando pro `<span class="hint">` com cor de erro
- `.field.has-error` adiciona estilo de erro (border vermelho + hint vermelho)

### Erros de servidor

- 4xx: mostra `data.message` em banner inline acima do submit (use `.form-error`, novo padrão CSS — adicionar no components.css em task)
- 429: mensagem específica "muitas tentativas"
- 500: oferece alternativa "Fala direto no WhatsApp: (11) 91969-1542"
- network error: mesma mensagem do 500 + sugestão de tentar de novo

### Erros silenciosos (bot)

- Honeypot disparado ou timing < 3s → response `{ ok: true, redirect: null }`
- Cliente que recebe `redirect: null` mostra a tela de sucesso normalmente mas **não navega** pro WhatsApp. Bot vai embora satisfeito.

---

## 8. Analytics — Eventos Disparados

| Evento | Quando | Parâmetros |
|---|---|---|
| `form_open` | `openModal()` ou page `/orcamento` carregada | `form_type` (modal\|page), `cta_location` |
| `form_field_focus` | Primeiro focus em cada campo (uma vez) | `field_name` |
| `form_submit_attempt` | Click no botão submit | `form_type` |
| `form_submit_success` | Resposta 200 com `redirect` truthy | `form_type`, `servico` |
| `form_submit_error` | Qualquer erro (validação, network, server) | `form_type`, `error_code` |
| `whatsapp_redirect` | Imediatamente antes do `location.assign(wa.me/...)` | `from_form` |
| `whatsapp_open` | Click em link `wa.me/...` direto (não pelo form) | `cta_location` |

**Sem PII em nenhum evento.** Apenas categorias e enums.

---

## 9. Persistência local (draft)

```javascript
function saveDraft(form, mode) {
  const fd = new FormData(form);
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (k === 'consent' || k === 'website' || k === 'servico') continue; // não salvar
    if (typeof v === 'string') data[k] = v;
  }
  const expires = Date.now() + STORAGE_TTL_MS;
  sessionStorage.setItem(STORAGE_KEY_PREFIX + mode, JSON.stringify({ data, expires }));
}

function restoreDraft(form, mode) {
  const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + mode);
  if (!raw) return;
  try {
    const { data, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      sessionStorage.removeItem(STORAGE_KEY_PREFIX + mode);
      return;
    }
    Object.entries(data).forEach(([k, v]) => {
      const field = form.querySelector(`[name="${k}"]`);
      if (field) field.value = v;
    });
  } catch (e) { /* corrupted, ignore */ }
}

function clearDraft(mode) {
  sessionStorage.removeItem(STORAGE_KEY_PREFIX + mode);
}
```

---

## 10. Acessibilidade

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`, foco trap, esc-close, retorna foco ao trigger
- Inputs: cada um tem `<label for>` associado
- Mensagens dinâmicas: `aria-live="polite"` em banners de erro/sucesso
- Submit em loading: `aria-busy="true"` no botão
- Checkbox consent: link da Política tabable separado
- Honeypot: `aria-hidden="true"` + `tabindex="-1"` (não atrapalha leitor de tela)

---

## 11. Performance

- Módulos JS carregam com `defer` (ES Modules nativos já são deferred por default)
- Não há network request até o user submeter
- Toda validação client-side é síncrona
- Bundle JS total ≤ 8KB gzipped (objetivo)

---

## 12. Segurança

- **Service role key apenas no servidor** (`/api/leads`) — nunca exposta no cliente
- **IP hash com salt** — não armazena IP cru
- **Honeypot + timing + rate limit** em camadas (defesa em profundidade)
- **CORS:** endpoint só aceita POST do próprio origin (Vercel configura automaticamente para Edge Functions na mesma plataforma)
- **CSP futura:** ADR separado, vai restringir `script-src`, `connect-src` (Supabase + GA4 + wa.me)
- **Sanitização:** dados são tratados como string pura no servidor (não interpretados como HTML em lugar nenhum) — SQL injection mitigado por uso de driver Supabase (parameterized queries)

---

## 13. LGPD — Implementação Concreta

- Consent **obrigatório no servidor** (return 400 se false)
- `consent_at` é `timestamp NOT NULL` na tabela
- Política de Privacidade linkada no checkbox via `<a href="/privacidade">`
- Lead pode ser excluído por pedido do titular: admin tem ação "Apagar lead" (em `005-admin-crm`) que dispara `DELETE` + audit log
- Retenção 180 dias via cron mensal (script SQL na §2)
- IP hash + salt — não permite re-identificação

---

## 14. Testes

| Tipo | Ferramenta | Cobertura |
|---|---|---|
| Unit (phone mask) | Vitest ou Node native test | Casos: 10 dígitos, 11 dígitos, com não-dígitos, vazio, parcial |
| Unit (validation) | Idem | Cada regra de `validateLead` no servidor |
| Integração (endpoint) | Vitest + supabase test container | POST happy path, honeypot, timing, rate limit, dedupe, consent ausente |
| E2E (Playwright) | Já configurado em `002-landing-public/tasks.md` (T102) | Modal abre, valida consent, submete simulação |
| Manual | Smoke pessoal em mobile real | Após deploy preview |

---

## 15. Trade-offs e ADRs antecipados

| # | Tema | Decisão atual | Quando reabrir |
|---|---|---|---|
| 0006 | reCAPTCHA/Turnstile | NÃO usar | Se spam > 5/dia em produção |
| 0007 | Validação server-side em lib (Zod) | NÃO usar (validação manual) | Se schema crescer pra ≥ 10 campos |
| 0008 | Rate limit storage (Upstash) | Usar Supabase | Se latência do `count` ficar > 100ms |
| 0009 | Notification pra mim quando lead chegar | NÃO nessa fase | Quando admin (005) estiver pronto + push opt-in |

---

## 16. Critério de pronto (Feature 003)

A feature 003 é considerada **pronta** quando:

- [ ] Migration SQL aplicada no Supabase (tabela `leads` + RLS + audit trigger)
- [ ] Endpoint `/api/leads` deployado e respondendo a todos os casos do contract (validation, consent, honeypot, timing, rate limit, dedupe, success)
- [ ] Modal da landing submete e redireciona pro WhatsApp com mensagem pré-preenchida
- [ ] Página `/orcamento` standalone funcional com campos longos
- [ ] Máscara de telefone funciona em todos os campos relevantes
- [ ] Persistência sessionStorage funciona (preencher → fechar → reabrir → campos voltam)
- [ ] Eventos GA4 todos disparados conforme tabela §8
- [ ] axe-core sem violações `serious`/`critical` no form
- [ ] Playwright smoke test do form passa (modal, validation, consent block)
- [ ] Teste manual em iOS Safari + Android Chrome com redirect WhatsApp confirmado
- [ ] LGPD: cliente pode pedir exclusão e admin executa em ≤ 7 dias úteis

---

## 17. Próximos Passos

1. Aprovação deste `plan.md`
2. Geração de `tasks.md` desta feature — passos executáveis ordenados:
   - Schema SQL → endpoint `/api/leads` → refactor `app.js` em módulos → phone mask → form orchestrator → página `/orcamento` → analytics → testes
3. Execução no Claude Code (Antigravity)
