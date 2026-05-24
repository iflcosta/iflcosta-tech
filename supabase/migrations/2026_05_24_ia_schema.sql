-- Feature 012: IA Admin — Schema multi-tenant para automação com IA
-- Spec: /.specs/012-ia-admin/spec.md

CREATE SCHEMA IF NOT EXISTS ia;

-- ── Tenants (clientes contratantes) ─────────────────────────────────────────
CREATE TABLE ia.tenants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  biz_name    text,
  segment     text        NOT NULL CHECK (segment IN ('imobiliaria','clinica','pet','outro')),
  phone       text,
  email       text,
  plan        text        NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','basico','pro')),
  status      text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','trial')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Agentes IA (1:1 com tenant) ──────────────────────────────────────────────
CREATE TABLE ia.agents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES ia.tenants(id) ON DELETE CASCADE,
  name            text        NOT NULL DEFAULT 'Assistente',
  system_prompt   text        NOT NULL DEFAULT '',
  model           text        NOT NULL DEFAULT 'llama-3.3-70b-versatile'
                              CHECK (model IN ('llama-3.3-70b-versatile','llama-3.1-8b-instant')),
  temperature     numeric(3,2) NOT NULL DEFAULT 0.30
                              CHECK (temperature >= 0 AND temperature <= 1),
  max_tokens      int         NOT NULL DEFAULT 400 CHECK (max_tokens BETWEEN 100 AND 2000),
  schedule        jsonb,
  off_hours_msg   text        NOT NULL DEFAULT 'Olá! Estamos fora do horário de atendimento. Retornamos em breve.',
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

-- ── Versões de prompt (histórico) ────────────────────────────────────────────
CREATE TABLE ia.agent_versions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      uuid        NOT NULL REFERENCES ia.agents(id) ON DELETE CASCADE,
  system_prompt text        NOT NULL,
  model         text        NOT NULL,
  temperature   numeric(3,2) NOT NULL,
  max_tokens    int         NOT NULL,
  saved_by      text        NOT NULL DEFAULT 'iago',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Base de conhecimento / FAQ ────────────────────────────────────────────────
CREATE TABLE ia.knowledge (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid        NOT NULL REFERENCES ia.agents(id) ON DELETE CASCADE,
  question    text        NOT NULL,
  answer      text        NOT NULL,
  tags        text[],
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Instâncias WhatsApp (Evolution API) ──────────────────────────────────────
CREATE TABLE ia.wa_instances (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES ia.tenants(id) ON DELETE CASCADE,
  instance_name     text        NOT NULL UNIQUE,
  phone_number      text,
  status            text        NOT NULL DEFAULT 'disconnected'
                                CHECK (status IN ('connected','disconnected','banned','warming')),
  warmup_phase      int         NOT NULL DEFAULT 1 CHECK (warmup_phase BETWEEN 1 AND 5),
  warmup_started_at timestamptz,
  last_seen_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── Configuração anti-ban por instância ──────────────────────────────────────
CREATE TABLE ia.wa_config (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_instance_id      uuid        NOT NULL REFERENCES ia.wa_instances(id) ON DELETE CASCADE,
  delay_min_ms        int         NOT NULL DEFAULT 1500 CHECK (delay_min_ms >= 500),
  delay_max_ms        int         NOT NULL DEFAULT 4000 CHECK (delay_max_ms <= 15000),
  typing_enabled      boolean     NOT NULL DEFAULT true,
  typing_duration_ms  int         NOT NULL DEFAULT 2000,
  max_msgs_per_minute int         NOT NULL DEFAULT 8 CHECK (max_msgs_per_minute BETWEEN 1 AND 30),
  max_msgs_per_day    int,
  blackout_start      time,
  blackout_end        time,
  opt_out_keywords    text[]      NOT NULL DEFAULT ARRAY['parar','sair','cancelar','remove','stop','não quero'],
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wa_instance_id),
  CHECK (delay_min_ms < delay_max_ms)
);

-- ── Conversas WhatsApp ────────────────────────────────────────────────────────
CREATE TABLE ia.conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES ia.tenants(id) ON DELETE CASCADE,
  wa_instance_id  uuid        REFERENCES ia.wa_instances(id) ON DELETE SET NULL,
  contact_phone   text        NOT NULL,
  contact_name    text,
  status          text        NOT NULL DEFAULT 'bot'
                              CHECK (status IN ('bot','needs_human','closed')),
  opted_out       boolean     NOT NULL DEFAULT false,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  msg_count       int         NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, contact_phone)
);

CREATE INDEX ia_conversations_tenant_time_idx ON ia.conversations (tenant_id, last_message_at DESC);
CREATE INDEX ia_conversations_needs_human_idx ON ia.conversations (status) WHERE status = 'needs_human';

-- ── Mensagens ─────────────────────────────────────────────────────────────────
CREATE TABLE ia.messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES ia.conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user','assistant','system','human_agent')),
  content         text        NOT NULL,
  tokens_used     int,
  evolution_id    text        UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ia_messages_conv_time_idx ON ia.messages (conversation_id, created_at);

-- ── Leads do demo público ─────────────────────────────────────────────────────
CREATE TABLE ia.demo_leads (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact       text,
  contact_type  text        CHECK (contact_type IN ('phone','email')),
  demo_snippet  text,
  status        text        NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new','contacted','converted','discarded')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── RLS: service_role bypassa por design; anon sem acesso ────────────────────
ALTER TABLE ia.tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.agents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.knowledge      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.wa_instances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.wa_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia.demo_leads     ENABLE ROW LEVEL SECURITY;

-- ── Trigger: updated_at automático em agents e wa_config ─────────────────────
CREATE OR REPLACE FUNCTION ia.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON ia.agents
  FOR EACH ROW EXECUTE FUNCTION ia.set_updated_at();

CREATE TRIGGER wa_config_updated_at
  BEFORE UPDATE ON ia.wa_config
  FOR EACH ROW EXECUTE FUNCTION ia.set_updated_at();
