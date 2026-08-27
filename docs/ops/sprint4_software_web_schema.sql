-- ==============================================================================
-- IF TECH — SPRINT 4: SOFTWARE & ENGENHARIA WEB (MOTOR 50/50 & HOMOLOGAÇÃO)
-- Arquivo: docs/ops/sprint4_software_web_schema.sql
-- Projeto: togrnwxazuweuihlaljo (iflcosta-tech)
-- Compatível com: PostgreSQL 15+ & Supabase RLS
-- ==============================================================================

-- 1. ENUMS ESPECÍFICOS DE SOFTWARE E MILESTONES
DO $$ BEGIN
    CREATE TYPE project_status_enum AS ENUM (
        'Briefing',
        'Em_Desenvolvimento',
        'Em_QA',
        'Homologacao_Cliente',
        'Concluido',
        'Pausado',
        'Cancelado'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE milestone_billing_type_enum AS ENUM (
        'Entrada_50',
        'Entrega_50',
        'Hora_Avulsa',
        'Mensalidade_Suporte'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE milestone_status_enum AS ENUM (
        'Pendente',
        'Em_Andamento',
        'Aguardando_Aprovacao',
        'Aprovado_Pago'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABELA DE PROJETOS DE SOFTWARE (software_projects)
CREATE TABLE IF NOT EXISTS public.software_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    service_code VARCHAR(20) NOT NULL DEFAULT 'SW-01',
    status project_status_enum NOT NULL DEFAULT 'Briefing',
    scope_description TEXT NOT NULL DEFAULT '',
    repository_url VARCHAR(255),
    staging_url VARCHAR(255),
    production_url VARCHAR(255),
    total_budget DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    recurrent_support_mrr DECIMAL(10, 2) DEFAULT 0.00,
    start_date DATE DEFAULT CURRENT_DATE,
    estimated_delivery_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
    actual_delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Garante colunas adicionais para projetos existentes
ALTER TABLE public.software_projects
    ADD COLUMN IF NOT EXISTS client_token UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS lighthouse_performance_score INT DEFAULT 98,
    ADD COLUMN IF NOT EXISTS lighthouse_seo_score INT DEFAULT 100,
    ADD COLUMN IF NOT EXISTS lighthouse_best_practices_score INT DEFAULT 100,
    ADD COLUMN IF NOT EXISTS lighthouse_accessibility_score INT DEFAULT 95,
    ADD COLUMN IF NOT EXISTS qa_homologated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS homologation_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS kickoff_deposit_paid BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS final_delivery_paid BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_software_projects_code ON public.software_projects(project_code);
CREATE INDEX IF NOT EXISTS idx_software_projects_token ON public.software_projects(client_token);
CREATE INDEX IF NOT EXISTS idx_software_projects_client ON public.software_projects(client_id);

-- 3. TABELA DE MILESTONES / ENTREGÁVEIS (project_milestones)
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.software_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    billing_type milestone_billing_type_enum NOT NULL DEFAULT 'Entrada_50',
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    percentage_of_total DECIMAL(5, 2) NOT NULL DEFAULT 50.00,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    asaas_payment_id VARCHAR(100),
    status milestone_status_enum NOT NULL DEFAULT 'Pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.project_milestones
    ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS status milestone_status_enum NOT NULL DEFAULT 'Pendente';

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON public.project_milestones(project_id);

-- 4. TABELA DE TIMESHEET / HORAS ADICIONAIS (project_timesheet_entries)
CREATE TABLE IF NOT EXISTS public.project_timesheet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.software_projects(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
    activity_description TEXT NOT NULL,
    hours_spent DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 130.00,
    is_billable BOOLEAN NOT NULL DEFAULT true,
    is_billed BOOLEAN NOT NULL DEFAULT false,
    worked_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_timesheet_project ON public.project_timesheet_entries(project_id);

-- 5. HABILITA RLS (Row Level Security)
ALTER TABLE public.software_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_timesheet_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "allow_anon_select_software_projects" ON public.software_projects;
    CREATE POLICY "allow_anon_select_software_projects" ON public.software_projects FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "allow_anon_select_project_milestones" ON public.project_milestones;
    CREATE POLICY "allow_anon_select_project_milestones" ON public.project_milestones FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "allow_service_role_all_software" ON public.software_projects;
    CREATE POLICY "allow_service_role_all_software" ON public.software_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "allow_service_role_all_milestones" ON public.project_milestones;
    CREATE POLICY "allow_service_role_all_milestones" ON public.project_milestones FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "allow_service_role_all_timesheet" ON public.project_timesheet_entries;
    CREATE POLICY "allow_service_role_all_timesheet" ON public.project_timesheet_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

-- 6. RPC ATÔMICA: CRIAÇÃO DE PROJETO DE SOFTWARE COM MOTOR 50/50
CREATE OR REPLACE FUNCTION public.rpc_create_software_project_atomic(
    p_client_id UUID,
    p_title TEXT,
    p_service_code TEXT,
    p_scope_description TEXT,
    p_total_budget DECIMAL,
    p_estimated_delivery_date DATE,
    p_repository_url TEXT DEFAULT NULL,
    p_staging_url TEXT DEFAULT NULL,
    p_recurrent_support_mrr DECIMAL DEFAULT 0.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project_id UUID;
    v_project_code VARCHAR(50);
    v_seq_num INT;
    v_client_token UUID := gen_random_uuid();
    v_half_budget DECIMAL(10, 2);
BEGIN
    SELECT COUNT(*) + 1 INTO v_seq_num FROM public.software_projects;
    v_project_code := 'PRJ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_seq_num::TEXT, 3, '0');
    v_half_budget := ROUND((COALESCE(p_total_budget, 0.00) / 2.00), 2);

    INSERT INTO public.software_projects (
        project_code,
        client_id,
        title,
        service_code,
        status,
        scope_description,
        repository_url,
        staging_url,
        client_token,
        total_budget,
        recurrent_support_mrr,
        estimated_delivery_date
    ) VALUES (
        v_project_code,
        p_client_id,
        p_title,
        COALESCE(p_service_code, 'SW-01'),
        'Briefing',
        COALESCE(p_scope_description, 'Projeto de Desenvolvimento de Software'),
        p_repository_url,
        p_staging_url,
        v_client_token,
        COALESCE(p_total_budget, 0.00),
        COALESCE(p_recurrent_support_mrr, 0.00),
        COALESCE(p_estimated_delivery_date, CURRENT_DATE + INTERVAL '14 days')
    )
    RETURNING id INTO v_project_id;

    -- Milestone 1: Entrada 50% Kickoff
    INSERT INTO public.project_milestones (
        project_id,
        title,
        description,
        billing_type,
        amount,
        percentage_of_total,
        due_date,
        status
    ) VALUES (
        v_project_id,
        'Milestone 1 // Sinal de Entrada (50% Kickoff)',
        'Aprovação de Arquitetura, Wireframes e Início do Desenvolvimento',
        'Entrada_50',
        v_half_budget,
        50.00,
        CURRENT_DATE,
        'Pendente'
    );

    -- Milestone 2: Entrega 50% Homologação
    INSERT INTO public.project_milestones (
        project_id,
        title,
        description,
        billing_type,
        amount,
        percentage_of_total,
        due_date,
        status
    ) VALUES (
        v_project_id,
        'Milestone 2 // Homologação & Go-Live (50% Entrega)',
        'Entrega em Staging, Auditoria Lighthouse >95, Treinamento e Deploy em Produção',
        'Entrega_50',
        v_half_budget,
        50.00,
        COALESCE(p_estimated_delivery_date, CURRENT_DATE + INTERVAL '14 days'),
        'Pendente'
    );

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'project_id', v_project_id,
        'project_code', v_project_code,
        'client_token', v_client_token,
        'total_budget', p_total_budget,
        'milestone_entry_amount', v_half_budget
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_create_software_project_atomic(UUID, TEXT, TEXT, TEXT, DECIMAL, DATE, TEXT, TEXT, DECIMAL) TO anon, authenticated, service_role;

-- 7. RPC: LANÇAMENTO DE TIMESHEET (HORAS EXTRAS)
CREATE OR REPLACE FUNCTION public.rpc_log_project_timesheet(
    p_project_id UUID,
    p_activity_description TEXT,
    p_hours_spent DECIMAL,
    p_technician_id UUID DEFAULT NULL,
    p_hourly_rate DECIMAL DEFAULT 130.00,
    p_is_billable BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entry_id UUID;
    v_total_value DECIMAL(10, 2);
BEGIN
    v_total_value := ROUND((COALESCE(p_hours_spent, 1.00) * COALESCE(p_hourly_rate, 130.00)), 2);

    INSERT INTO public.project_timesheet_entries (
        project_id,
        technician_id,
        activity_description,
        hours_spent,
        hourly_rate,
        is_billable
    ) VALUES (
        p_project_id,
        p_technician_id,
        p_activity_description,
        COALESCE(p_hours_spent, 1.00),
        COALESCE(p_hourly_rate, 130.00),
        COALESCE(p_is_billable, true)
    )
    RETURNING id INTO v_entry_id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'entry_id', v_entry_id,
        'hours_spent', p_hours_spent,
        'hourly_rate', p_hourly_rate,
        'total_value', v_total_value
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_log_project_timesheet(UUID, TEXT, DECIMAL, UUID, DECIMAL, BOOLEAN) TO anon, authenticated, service_role;

-- 8. RPC: HOMOLOGAÇÃO DIGITAL DO CLIENTE COM HASH DE INTEGRIDADE
CREATE OR REPLACE FUNCTION public.rpc_homologate_software_project(
    p_client_token UUID,
    p_signer_name TEXT,
    p_signer_document TEXT,
    p_signer_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project RECORD;
    v_hash VARCHAR(64);
BEGIN
    SELECT * INTO v_project FROM public.software_projects WHERE client_token = p_client_token;
    IF v_project.id IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Token de projeto inválido');
    END IF;

    v_hash := ENCODE(DIGEST(v_project.project_code || '|' || v_project.id::TEXT || '|' || CURRENT_TIMESTAMP::TEXT || '|' || COALESCE(p_signer_name, 'Cliente'), 'sha256'), 'hex');

    UPDATE public.software_projects
    SET 
        status = 'Concluido',
        qa_homologated_at = CURRENT_TIMESTAMP,
        homologation_hash = v_hash,
        actual_delivery_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_project.id;

    UPDATE public.project_milestones
    SET 
        is_completed = true,
        completed_at = CURRENT_TIMESTAMP,
        status = 'Aprovado_Pago'
    WHERE project_id = v_project.id AND billing_type = 'Entrega_50';

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'project_code', v_project.project_code,
        'status', 'Concluido',
        'homologation_hash', v_hash,
        'homologated_at', CURRENT_TIMESTAMP
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_homologate_software_project(UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 9. RPC: CONSULTA PÚBLICA SEGURA DO PROJETO PELO TOKEN OU CÓDIGO
CREATE OR REPLACE FUNCTION public.rpc_get_client_software_project_by_token(
    p_token_or_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project RECORD;
    v_client RECORD;
    v_milestones JSONB;
    v_timesheet_total_hours DECIMAL(10, 2);
BEGIN
    SELECT * INTO v_project 
    FROM public.software_projects 
    WHERE client_token::TEXT = p_token_or_code 
       OR project_code = UPPER(TRIM(p_token_or_code))
       OR id::TEXT = p_token_or_code;

    IF v_project.id IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false);
    END IF;

    SELECT id, name, trade_name, whatsapp, email INTO v_client
    FROM public.clients
    WHERE id = v_project.client_id;

    SELECT COALESCE(JSONB_AGG(ROW_TO_JSON(m)), '[]'::JSONB) INTO v_milestones
    FROM (
        SELECT id, title, description, billing_type, amount, percentage_of_total, due_date, is_completed, is_paid, status
        FROM public.project_milestones
        WHERE project_id = v_project.id
        ORDER BY created_at ASC
    ) m;

    SELECT COALESCE(SUM(hours_spent), 0.00) INTO v_timesheet_total_hours
    FROM public.project_timesheet_entries
    WHERE project_id = v_project.id;

    RETURN JSONB_BUILD_OBJECT(
        'found', true,
        'id', v_project.id,
        'project_code', v_project.project_code,
        'title', v_project.title,
        'service_code', v_project.service_code,
        'status', v_project.status,
        'scope_description', v_project.scope_description,
        'repository_url', v_project.repository_url,
        'staging_url', v_project.staging_url,
        'production_url', v_project.production_url,
        'total_budget', v_project.total_budget,
        'recurrent_support_mrr', v_project.recurrent_support_mrr,
        'kickoff_deposit_paid', v_project.kickoff_deposit_paid,
        'final_delivery_paid', v_project.final_delivery_paid,
        'estimated_delivery_date', v_project.estimated_delivery_date,
        'actual_delivery_date', v_project.actual_delivery_date,
        'lighthouse_performance_score', v_project.lighthouse_performance_score,
        'lighthouse_seo_score', v_project.lighthouse_seo_score,
        'lighthouse_best_practices_score', v_project.lighthouse_best_practices_score,
        'lighthouse_accessibility_score', v_project.lighthouse_accessibility_score,
        'qa_homologated_at', v_project.qa_homologated_at,
        'homologation_hash', v_project.homologation_hash,
        'client', JSONB_BUILD_OBJECT('name', v_client.name, 'trade_name', v_client.trade_name, 'whatsapp', v_client.whatsapp),
        'milestones', v_milestones,
        'timesheet_total_hours', v_timesheet_total_hours
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_client_software_project_by_token(TEXT) TO anon, authenticated, service_role;
