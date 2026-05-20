-- =============================================================================
-- Migration: create_leads
-- Feature:   003-lead-capture
-- Data:      2026-05-19
-- Propósito: Cria a tabela `leads` (captação via modal da landing e da página
--            `/orcamento`), enums de domínio, índices (dedupe diário por
--            telefone + performance pro admin), Row Level Security restrita
--            ao service_role nessa fase, tabela de auditoria e trigger que
--            registra inserções de leads. Políticas pra role `authenticated`
--            (admin logado) serão adicionadas na feature 005-admin-crm.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums de domínio
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Tabela principal: leads
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Índice pra dedupe por (telefone, dia)
-- Mesmo telefone no mesmo dia gera conflito (23505) e é tratado como
-- sucesso silencioso no endpoint /api/leads.
-- -----------------------------------------------------------------------------

create unique index leads_telefone_day_uniq
  on public.leads (telefone, date_trunc('day', created_at));

-- -----------------------------------------------------------------------------
-- Índices de performance pras queries do admin (feature 005)
-- -----------------------------------------------------------------------------

create index leads_status_idx on public.leads (status, created_at desc);
create index leads_created_at_idx on public.leads (created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Apenas service_role pode INSERT/SELECT/UPDATE/DELETE nessa fase
-- (via endpoint server-side em /api/leads).
-- anon não pode nada (nem SELECT).
-- authenticated (admin logado) ganhará políticas na feature 005-admin-crm.
-- -----------------------------------------------------------------------------

alter table public.leads enable row level security;

create policy "service_role full access" on public.leads
  for all to service_role using (true) with check (true);

-- (Políticas pro admin authenticated serão adicionadas em 005-admin-crm)

-- -----------------------------------------------------------------------------
-- Tabela de auditoria (preparação pra feature 005)
-- Registra ações relevantes sobre entidades do sistema (leads, customers, ...).
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Trigger: registra cada novo lead no audit_log
-- -----------------------------------------------------------------------------

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

-- =============================================================================
-- LGPD — Retenção de 180 dias (cron mensal)
--
-- Executar via Supabase cron ou GitHub Action mensal. Purga leads não
-- convertidos com mais de 180 dias. NÃO é executado por esta migration —
-- está aqui apenas como referência da query oficial.
--
-- delete from public.leads
-- where status in ('novo', 'perdido')
--   and created_at < now() - interval '180 days';
-- =============================================================================
