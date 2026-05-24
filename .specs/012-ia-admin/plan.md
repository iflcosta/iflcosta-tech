# Plan: IA Admin — Painel de Gestão de Automação

**Feature:** `012-ia-admin`
**Spec:** `.specs/012-ia-admin/spec.md`
**Criado:** 2026-05-24

---

## Visão Geral da Arquitetura

```
ia.iflcosta.tech/admin    ← HTML vanilla (Vercel static)
        │
        │ fetch()
        ▼
/api/ia/admin/*           ← Vercel Edge Functions (service_role)
        │
        │ Supabase client
        ▼
Supabase ia.* schema      ← Postgres + RLS

        ▲
        │ lê config anti-ban
        │ grava conversas/mensagens
/api/ia/webhook/whatsapp  ← recebe do n8n (VPS)
        ▲
        │
Evolution API + n8n (VPS) ← orquestra respostas WA
```

**Princípio:** o painel admin é só configuração e monitoramento. A inteligência (LLM + WA) fica no n8n/VPS. O painel **não** envia mensagens diretamente — manda para o n8n que envia.

---

## Fase 1 — Fundação (banco + auth + scaffold)

### 1.1 Schema Supabase `ia.*`

Criar migration única com todas as tabelas:

```sql
CREATE SCHEMA ia;

CREATE TABLE ia.tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                     -- nome exibido
  biz_name    text,                              -- razão social
  segment     text NOT NULL,                     -- imobiliaria|clinica|pet|outro
  phone       text,
  email       text,
  plan        text NOT NULL DEFAULT 'trial',     -- trial|basico|pro
  status      text NOT NULL DEFAULT 'active',    -- active|inactive|trial
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ia.agents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES ia.tenants(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'Assistente',
  system_prompt   text NOT NULL DEFAULT '',
  model           text NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  temperature     numeric(3,2) NOT NULL DEFAULT 0.30,
  max_tokens      int NOT NULL DEFAULT 400,
  schedule        jsonb,   -- { mon:[9,18], tue:[9,18], ... } null = 24/7
  off_hours_msg   text DEFAULT 'Olá! Estamos fora do horário de atendimento. Retornamos em breve.',
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE TABLE ia.agent_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      uuid NOT NULL REFERENCES ia.agents(id) ON DELETE CASCADE,
  system_prompt text NOT NULL,
  model         text NOT NULL,
  temperature   numeric(3,2) NOT NULL,
  max_tokens    int NOT NULL,
  saved_by      text NOT NULL DEFAULT 'iago',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ia.knowledge (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id  uuid NOT NULL REFERENCES ia.agents(id) ON DELETE CASCADE,
  question  text NOT NULL,
  answer    text NOT NULL,
  tags      text[],
  active    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ia.wa_instances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES ia.tenants(id) ON DELETE CASCADE,
  instance_name   text NOT NULL UNIQUE,          -- nome na Evolution API
  phone_number    text,
  status          text NOT NULL DEFAULT 'disconnected', -- connected|disconnected|banned|warming
  warmup_phase    int NOT NULL DEFAULT 1,
  warmup_started_at timestamptz,
  last_seen_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ia.wa_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_instance_id      uuid NOT NULL REFERENCES ia.wa_instances(id) ON DELETE CASCADE UNIQUE,
  delay_min_ms        int NOT NULL DEFAULT 1500,
  delay_max_ms        int NOT NULL DEFAULT 4000,
  typing_enabled      boolean NOT NULL DEFAULT true,
  typing_duration_ms  int NOT NULL DEFAULT 2000,
  max_msgs_per_minute int NOT NULL DEFAULT 8,
  max_msgs_per_day    int,                       -- null = auto por fase de warmup
  blackout_start      time,
  blackout_end        time,
  opt_out_keywords    text[] NOT NULL DEFAULT ARRAY['parar','sair','cancelar','remove','stop'],
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ia.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES ia.tenants(id) ON DELETE CASCADE,
  wa_instance_id  uuid REFERENCES ia.wa_instances(id),
  contact_phone   text NOT NULL,
  contact_name    text,
  status          text NOT NULL DEFAULT 'bot',   -- bot|needs_human|closed
  opted_out       boolean NOT NULL DEFAULT false,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  msg_count       int NOT NULL DEFAULT 0
);
CREATE INDEX ON ia.conversations (tenant_id, last_message_at DESC);
CREATE INDEX ON ia.conversations (status) WHERE status = 'needs_human';

CREATE TABLE ia.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ia.conversations(id) ON DELETE CASCADE,
  role            text NOT NULL,                 -- user|assistant|system|human_agent
  content         text NOT NULL,
  tokens_used     int,
  evolution_id    text UNIQUE,                   -- idempotência — id da mensagem na Evolution
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON ia.messages (conversation_id, created_at);

CREATE TABLE ia.demo_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact       text,                            -- phone ou email
  contact_type  text,                            -- phone|email
  demo_snippet  text,                            -- últimas 3 msgs do demo
  status        text NOT NULL DEFAULT 'new',     -- new|contacted|converted|discarded
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS: service_role acessa tudo; anon não acessa nada
ALTER TABLE ia.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.wa_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.wa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.demo_leads ENABLE ROW LEVEL SECURITY;
-- service_role bypassa RLS por design do Supabase.
```

### 1.2 Auth + Middleware

- Reutilizar `middleware.js` existente: adicionar `/ia/admin/:path*` ao `matcher`.
- Mesma lógica de cookie `sb-access-token` / `sb-refresh-token`.
- Nenhum código novo de auth — só ampliar o matcher.

### 1.3 Scaffold HTML

Estrutura de páginas:
```
ia/admin/
  index.html          → dashboard
  tenants/
    index.html        → lista de tenants
    novo/index.html   → criar tenant
    [id]/index.html   → detalhe tenant (tabs: Agente | WA | Conversas)
  conversations/
    index.html        → monitor global de conversas
  leads/
    index.html        → leads do demo público
```

CSS: importar `/assets/css/tokens.css` + `/assets/css/base.css` + `/assets/css/components.css` + `/assets/css/layout.css`. Criar `/ia/admin/style.css` para overrides mínimos (igual ao padrão do hardware admin).

---

## Fase 2 — CRUD de Tenants e Agentes

### 2.1 API Edge — Tenants

`/api/ia/admin/tenants.js` — GET (lista) + POST (criar)
`/api/ia/admin/tenants/[id].js` — GET + PATCH + DELETE

Validação: `name` obrigatório, `segment` em enum, `status` em enum.
DELETE: soft-delete (setar `status='inactive'`), nunca deletar dados.

### 2.2 API Edge — Agentes

`/api/ia/admin/agents/[tenant_id].js` — GET + POST (criar 1ª vez) + PATCH (atualizar)

Todo PATCH salva versão em `ia.agent_versions` antes de sobrescrever.

`/api/ia/admin/agents/[tenant_id]/versions.js` — GET (lista) + POST (restaurar versão X)

`/api/ia/admin/agents/[tenant_id]/knowledge.js` — GET + POST
`/api/ia/admin/agents/[tenant_id]/knowledge/[id].js` — PATCH + DELETE

### 2.3 UI — Lista de Tenants

Tabela/cards com: nome, segmento, plano, status (badge colorido), instância WA (ícone status), última conversa. Link para detalhe. Botão "+ Novo tenant". Filtro de status.

### 2.4 UI — Detalhe do Tenant (3 tabs)

**Tab Agente:**
- Textarea system prompt (monospace, resize vertical, placeholder com exemplo por segmento).
- Variáveis disponíveis listadas abaixo: `{{nome_empresa}}`, `{{segmento}}`, `{{horario}}`.
- Seletor modelo + slider temperatura + campo max_tokens.
- Config horário de atendimento (checkboxes dias + inputs hora início/fim).
- Mensagem fora de horário.
- Botão "Salvar" (com indicador de versão atual: "v3 — salvo há 2h").
- Link "Ver histórico de versões" → modal com lista de versões, botão reverter.

**Tab FAQ:**
- Lista de pares Q/A com toggle ativo/inativo.
- Botão "+ Adicionar" → inline form.
- Edição inline ou modal.

**Tab Instância WA:**
- Status atual (badge: conectado 🟢 / desconectado 🟡 / banido 🔴 / em warmup 🔵).
- Fase de warmup + barra de progresso (dias restantes até fase 5).
- Limite de msgs/dia atual (baseado na fase).
- Form de config anti-ban: todos os campos de `ia.wa_config`.
- Botão "Verificar status" (ping Evolution API).
- Botão "Ver QR Code" (modal).
- Botão "Registrar nova instância".

---

## Fase 3 — Monitor de Conversas

### 3.1 API Edge — Conversas

`/api/ia/admin/conversations.js` — GET (lista paginada: ?tenant=&status=&page=)
`/api/ia/admin/conversations/[id]/messages.js` — GET (histórico)
`/api/ia/admin/conversations/[id]/reply.js` — POST (envia resposta manual via n8n webhook)
`/api/ia/admin/conversations/[id]/status.js` — PATCH (bot|needs_human|closed)

**Resposta manual** → não chama Evolution diretamente. Faz POST para webhook n8n configurado
(`N8N_REPLY_WEBHOOK_URL` env var). n8n cuida do delay e envio via Evolution.

### 3.2 Webhook Recebedor

`/api/ia/webhook/whatsapp.js` — POST, autenticado por `WHATSAPP_WEBHOOK_TOKEN` (header `x-webhook-token`).

Payload esperado (vindo do n8n):
```json
{
  "event": "message_received" | "message_sent" | "instance_status",
  "instance_name": "tenant-x-prod",
  "data": { ... }
}
```

Processa: upsert em `ia.conversations` + insert em `ia.messages`. Idempotente via `evolution_id`.

### 3.3 UI — Monitor Global

- Lista de conversas com filtros: "Todas", "Aguardando humano" (badge count), "Bot ativo", "Fechadas".
- Card por conversa: foto/inicial do contato, número, tenant, última mensagem (truncada), tempo, badge de status.
- Clicar abre painel lateral (slide-in mobile) com timeline de mensagens.
- Input de resposta manual + botão enviar. Spinner enquanto processa.
- Botões: "Devolver ao bot", "Fechar", "Bloquear número".

---

## Fase 4 — Dashboard + Leads

### 4.1 API Edge — Stats

`/api/ia/admin/stats.js` — GET, retorna:
```json
{
  "tenants_active": 5,
  "conversations_open": 12,
  "msgs_today": 147,
  "needs_human": 3,
  "instances": [{ "name": "...", "status": "connected", "warmup_phase": 3 }]
}
```

### 4.2 API Edge — Demo Leads

`/ia/demo` já existe. Precisamos capturar leads.
`/api/ia/demo/lead.js` — POST público (sem auth). Cria entrada em `ia.demo_leads`.
`/api/ia/admin/demo-leads.js` — GET (lista) + PATCH (atualizar status).

Modificação em `ia/demo/index.html`: adicionar botão "Quero para o meu negócio" que abre
mini-form (nome + telefone ou email) → POST `/api/ia/demo/lead`.

### 4.3 UI — Dashboard

- 4 stat cards: Tenants ativos / Conversas abertas / Msgs hoje / Aguardando humano.
- Tabela de instâncias WA com status ao vivo.
- Lista das últimas 5 conversas com atividade.
- Link rápido para "Novo tenant".

---

## Decisões de Implementação

1. **Sem build step**: mesma abordagem do hardware admin — HTML estático, JS vanilla, Edge Functions.

2. **n8n lê config do Supabase**: no início de cada fluxo, n8n faz `GET /api/ia/config/:instance_name` (endpoint público com token) para buscar `wa_config` + `agent` do tenant. Cache de 5 min no n8n para não sobrecarregar.

3. **Resposta manual via n8n, nunca diretamente**: painel faz POST webhook → n8n → Evolution. Garante que delay/typing sejam aplicados mesmo em respostas manuais.

4. **Warmup automático via n8n cron**: n8n tem job diário que verifica `warmup_started_at` e avança `warmup_phase` quando os dias batem. Admin mostra a fase atual; não precisa de lógica no Vercel.

5. **Mesmo middleware de auth**: adicionar `/ia/admin/:path*` ao matcher de `middleware.js`. Zero código de auth duplicado.

6. **Schema `ia.*` no mesmo Supabase**: sem projeto separado, sem env vars novas. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem.

7. **Endpoint público de config** (`/api/ia/config/:instance`): lido pelo n8n. Autenticado por `IA_CONFIG_TOKEN` (env var Vercel). Retorna `wa_config` + `agent` (sem dados de tenant PII).

---

## Estimativas por Fase

| Fase | Conteúdo | Esforço |
|------|----------|---------|
| 1 — Fundação | Migration, auth, scaffold | M |
| 2 — Tenants + Agentes | CRUD completo + UI | L |
| 3 — Conversas | Monitor + webhook | L |
| 4 — Dashboard + Leads | Stats + demo leads | M |
| **Total** | | **~3–4 dias foco** |
