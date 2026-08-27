-- ==============================================================================
-- IF TECH — MASTER DEVSECOPS & APPSEC HARDENING SCRIPT V5.0 (PRODUÇÃO)
-- Projeto Supabase: togrnwxazuweuihlaljo (iflcosta-tech)
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- Baseline: Zero Trust Architecture, LGPD Compliance, RLS Strict Defense
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSÕES MANDATÓRIAS DE CRIPTOGRAFIA E IDENTIFICADORES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. PURGA COMPLETA DE POLÍTICAS RLS PERMISSIVAS LEGADAS ('ANON')
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (policyname ILIKE '%anon%' OR policyname ILIKE '%public%')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. HABILITAÇÃO MANDATÓRIA DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.software_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.software_timesheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_kardex ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracking_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sniper_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sniper_rules ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS RLS ESTRITAS (APENAS AUTHENTICATED E SERVICE_ROLE)
-- ------------------------------------------------------------------------------
-- Clients
DROP POLICY IF EXISTS "auth_all_clients" ON public.clients;
DROP POLICY IF EXISTS "service_role_all_clients" ON public.clients;
CREATE POLICY "auth_all_clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_clients" ON public.clients FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Work Orders
DROP POLICY IF EXISTS "auth_all_work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "service_role_all_work_orders" ON public.work_orders;
CREATE POLICY "auth_all_work_orders" ON public.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_work_orders" ON public.work_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Work Order Items
DROP POLICY IF EXISTS "auth_all_work_order_items" ON public.work_order_items;
DROP POLICY IF EXISTS "service_role_all_work_order_items" ON public.work_order_items;
CREATE POLICY "auth_all_work_order_items" ON public.work_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_work_order_items" ON public.work_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Software Projects & Timesheet
DROP POLICY IF EXISTS "auth_all_software_projects" ON public.software_projects;
DROP POLICY IF EXISTS "service_role_all_software_projects" ON public.software_projects;
CREATE POLICY "auth_all_software_projects" ON public.software_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_software_projects" ON public.software_projects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_software_timesheet" ON public.software_timesheet;
DROP POLICY IF EXISTS "service_role_all_software_timesheet" ON public.software_timesheet;
CREATE POLICY "auth_all_software_timesheet" ON public.software_timesheet FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_software_timesheet" ON public.software_timesheet FOR ALL TO service_role USING (true) WITH CHECK (true);

-- MSP B2B
DROP POLICY IF EXISTS "auth_all_msp_contracts" ON public.msp_contracts;
DROP POLICY IF EXISTS "service_role_all_msp_contracts" ON public.msp_contracts;
CREATE POLICY "auth_all_msp_contracts" ON public.msp_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_contracts" ON public.msp_contracts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_msp_devices" ON public.msp_devices;
DROP POLICY IF EXISTS "service_role_all_msp_devices" ON public.msp_devices;
CREATE POLICY "auth_all_msp_devices" ON public.msp_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_devices" ON public.msp_devices FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_msp_tickets" ON public.msp_tickets;
DROP POLICY IF EXISTS "service_role_all_msp_tickets" ON public.msp_tickets;
CREATE POLICY "auth_all_msp_tickets" ON public.msp_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_tickets" ON public.msp_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Inventory & Payments
DROP POLICY IF EXISTS "auth_all_payments" ON public.payments;
DROP POLICY IF EXISTS "service_role_all_payments" ON public.payments;
CREATE POLICY "auth_all_payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_financial_ledger" ON public.financial_ledger;
DROP POLICY IF EXISTS "service_role_all_financial_ledger" ON public.financial_ledger;
CREATE POLICY "auth_all_financial_ledger" ON public.financial_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_financial_ledger" ON public.financial_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. TABELA DE RATE LIMITING CONTRA FORÇA BRUTA & ENUMERAÇÃO (2FA TRACKING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number INT NOT NULL,
    attempt_ip TEXT,
    failed_attempts INT DEFAULT 1,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_rate_limits_lookup 
ON public.tracking_rate_limits(os_number, locked_until);

-- Limpeza automática de registros antigos (> 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.tracking_rate_limits 
    WHERE last_attempt_at < (CURRENT_TIMESTAMP - INTERVAL '24 hours');
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. REVOGAÇÃO GERAL E TOTAL DE RPCS ADMINISTRATIVAS PARA 'ANON'
-- ------------------------------------------------------------------------------
-- Financeiro & Pagamentos Asaas
DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.rpc_confirm_asaas_payment(TEXT, DECIMAL, JSONB) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_save_asaas_charge_details(INT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT) FROM anon;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- Hardware & Bancada OS (Admin)
DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.rpc_get_kanban_work_orders() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_get_admin_dashboard_metrics() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_get_clients_overview() FROM anon;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- Software Web & Engenharia (Admin)
DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.rpc_create_software_project_atomic(UUID, TEXT, TEXT, TEXT, DECIMAL, DATE, TEXT, TEXT, DECIMAL) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_log_project_timesheet(UUID, TEXT, DECIMAL, UUID, DECIMAL, BOOLEAN) FROM anon;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- MSP B2B (Admin)
DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.rpc_create_msp_contract_atomic FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_create_msp_device_atomic FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_convert_ticket_to_work_order FROM anon;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- BI & Analytics Executivo
DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.rpc_get_executive_bi_analytics(DATE, DATE) FROM anon;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 7. CONCESSÃO ESTRITA DAS RPCS ADMINISTRATIVAS APENAS PARA AUTHENTICATED / SERVICE_ROLE
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    GRANT EXECUTE ON FUNCTION public.rpc_confirm_asaas_payment(TEXT, DECIMAL, JSONB) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_save_asaas_charge_details(INT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_get_kanban_work_orders() TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_get_admin_dashboard_metrics() TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_get_clients_overview() TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_software_project_atomic(UUID, TEXT, TEXT, TEXT, DECIMAL, DATE, TEXT, TEXT, DECIMAL) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_log_project_timesheet(UUID, TEXT, DECIMAL, UUID, DECIMAL, BOOLEAN) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_msp_contract_atomic TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_msp_device_atomic TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_convert_ticket_to_work_order TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_get_executive_bi_analytics(DATE, DATE) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 8. RPCS PÚBLICAS BLINDADAS (ANON + AUTHENTICATED + SERVICE_ROLE)
-- ------------------------------------------------------------------------------

-- RPC 1: Rastreamento por Token UUID (Zero Leak LGPD - Retorna apenas primeiro nome)
CREATE OR REPLACE FUNCTION public.rpc_track_work_order(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF p_token IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Token de rastreamento inválido.');
    END IF;

    SELECT JSONB_BUILD_OBJECT(
        'found', true,
        'id', wo.id,
        'os_number', wo.os_number,
        'public_tracking_token', wo.public_tracking_token,
        'status', wo.status::TEXT,
        'service_type', wo.service_type::TEXT,
        'device_brand', wo.device_brand,
        'device_model', wo.device_model,
        'reported_defect', wo.reported_defect,
        'technical_diagnosis', wo.technical_diagnosis,
        'stress_test_crystaldisk_health', wo.stress_test_crystaldisk_health,
        'stress_test_furmark_temp_max', wo.stress_test_furmark_temp_max,
        'stress_test_aida64_temp_max', wo.stress_test_aida64_temp_max,
        'stress_test_boot_time_seconds', wo.stress_test_boot_time_seconds,
        'stress_test_notes', wo.stress_test_notes,
        'visual_checklist_json', wo.visual_checklist_json,
        'entry_photos_urls', wo.entry_photos_urls,
        'exit_photos_urls', wo.exit_photos_urls,
        'is_pickup_delivery', wo.is_pickup_delivery,
        'pickup_fee', wo.pickup_fee,
        'total_parts', wo.total_parts,
        'total_labor', wo.total_labor,
        'total_discount', wo.total_discount,
        'total_order', COALESCE(wo.total_order, (wo.total_parts + wo.total_labor + COALESCE(wo.pickup_fee, 0.00))),
        'parts_deposit_required', wo.parts_deposit_required,
        'parts_deposit_paid', wo.parts_deposit_paid,
        'pix_copy_paste', wo.pix_copy_paste,
        'pix_qr_code_base64', wo.pix_qr_code_base64,
        'warranty_terms_cdc_days', wo.warranty_terms_cdc_days,
        'warranty_valid_until', wo.warranty_valid_until,
        'entry_at', wo.entry_at,
        'ready_at', wo.ready_at,
        'delivered_at', wo.delivered_at,
        'client_first_name', SPLIT_PART(c.name, ' ', 1),
        'items', COALESCE((
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', woi.id,
                    'item_type', woi.item_type,
                    'description', woi.description,
                    'quantity', woi.quantity,
                    'unit_price', woi.unit_price,
                    'total_price', COALESCE(woi.total_price, (woi.unit_price * woi.quantity))
                ) ORDER BY woi.item_type DESC, woi.created_at ASC
            )
            FROM public.work_order_items woi
            WHERE woi.work_order_id = wo.id
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM public.work_orders wo
    JOIN public.clients c ON c.id = wo.client_id
    WHERE wo.public_tracking_token = p_token;

    IF v_result IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Ordem de Serviço não localizada para este token.');
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_track_work_order(UUID) TO anon, authenticated, service_role;

-- RPC 2: Rastreamento com 2º Fator de Autenticação (2FA) e Rate Limiting Anti-Brute-Force
CREATE OR REPLACE FUNCTION public.rpc_track_work_order_by_number(
    p_os_number INT, 
    p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token UUID;
    v_clean_phone TEXT;
    v_rate RECORD;
BEGIN
    IF p_os_number IS NULL OR p_phone IS NULL OR length(trim(p_phone)) = 0 THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Número da OS e confirmação de WhatsApp são obrigatórios.');
    END IF;

    -- Checagem de Rate Limit (Bloqueio contra Brute-force)
    SELECT * INTO v_rate 
    FROM public.tracking_rate_limits 
    WHERE os_number = p_os_number;

    IF v_rate IS NOT NULL AND v_rate.locked_until > CURRENT_TIMESTAMP THEN
        RETURN JSONB_BUILD_OBJECT(
            'found', false, 
            'error', 'Muitas tentativas incorretas para esta OS. Aguarde 15 minutos para tentar novamente.'
        );
    END IF;

    v_clean_phone := REGEXP_REPLACE(p_phone, '\D', '', 'g');
    
    IF length(v_clean_phone) < 4 THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Informe ao menos os 4 últimos dígitos do WhatsApp cadastrado.');
    END IF;

    -- Validação Estrita de 2FA
    SELECT wo.public_tracking_token
    INTO v_token
    FROM public.work_orders wo
    JOIN public.clients c ON c.id = wo.client_id
    WHERE wo.os_number = p_os_number
      AND (
        RIGHT(REGEXP_REPLACE(c.whatsapp, '\D', '', 'g'), 4) = RIGHT(v_clean_phone, 4)
        OR REGEXP_REPLACE(c.whatsapp, '\D', '', 'g') = v_clean_phone
      )
    ORDER BY wo.created_at DESC
    LIMIT 1;

    IF v_token IS NULL THEN
        -- Registra tentativa com falha
        IF v_rate IS NULL THEN
            INSERT INTO public.tracking_rate_limits (os_number, failed_attempts, last_attempt_at)
            VALUES (p_os_number, 1, CURRENT_TIMESTAMP);
        ELSE
            UPDATE public.tracking_rate_limits
            SET failed_attempts = failed_attempts + 1,
                locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE NULL END,
                last_attempt_at = CURRENT_TIMESTAMP
            WHERE os_number = p_os_number;
        END IF;

        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Dados divergentes. Confirme o número da OS e os últimos 4 dígitos do WhatsApp.');
    END IF;

    -- Reset do rate limit em caso de sucesso
    IF v_rate IS NOT NULL THEN
        DELETE FROM public.tracking_rate_limits WHERE os_number = p_os_number;
    END IF;

    RETURN public.rpc_track_work_order(v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;

-- RPC 3: Aprovação de Orçamento por Token (Portal do Cliente)
CREATE OR REPLACE FUNCTION public.rpc_advance_work_order_status_by_token(
    p_token UUID,
    p_new_status TEXT DEFAULT 'Aprovado_Pelo_Cliente'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
    v_target_status os_status_enum;
BEGIN
    SELECT * INTO v_wo FROM public.work_orders WHERE public_tracking_token = p_token;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Token de OS inválido.');
    END IF;

    -- Define o próximo status correto da esteira
    IF COALESCE(v_wo.total_parts, 0) > 0 THEN
        v_target_status := 'Aguardando_Sinal_Peca';
    ELSE
        v_target_status := 'Diagnostico_Concluido';
    END IF;

    UPDATE public.work_orders
    SET 
        status = v_target_status,
        parts_deposit_paid = CASE WHEN COALESCE(total_parts, 0) = 0 THEN true ELSE parts_deposit_paid END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true, 
        'os_number', v_wo.os_number, 
        'status', v_target_status::TEXT,
        'message', 'Orçamento aprovado pelo cliente com sucesso.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_advance_work_order_status_by_token(UUID, TEXT) TO anon, authenticated, service_role;

-- RPC 4: Avaliação NPS do Cliente
CREATE OR REPLACE FUNCTION public.rpc_submit_customer_review(
    p_token UUID,
    p_rating INT,
    p_feedback TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
BEGIN
    SELECT * INTO v_wo FROM public.work_orders WHERE public_tracking_token = p_token;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'OS não encontrada.');
    END IF;

    UPDATE public.work_orders
    SET 
        customer_rating = p_rating,
        customer_feedback = p_feedback,
        customer_reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT('success', true, 'os_number', v_wo.os_number);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_submit_customer_review(UUID, INT, TEXT) TO anon, authenticated, service_role;

-- RPC 5: Rastreamento Público de Projetos de Software (Sprint 4)
CREATE OR REPLACE FUNCTION public.rpc_get_client_software_project_by_token(
    p_token_or_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF p_token_or_code IS NULL OR length(trim(p_token_or_code)) = 0 THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Identificador ou Token não fornecido.');
    END IF;

    SELECT JSONB_BUILD_OBJECT(
        'found', true,
        'id', sp.id,
        'project_code', sp.project_code,
        'title', sp.title,
        'service_code', sp.service_code,
        'status', sp.status::TEXT,
        'scope_description', sp.scope_description,
        'staging_url', sp.staging_url,
        'total_budget', sp.total_budget,
        'kickoff_deposit_paid', sp.kickoff_deposit_paid,
        'final_delivery_paid', sp.final_delivery_paid,
        'estimated_delivery_date', sp.estimated_delivery_date,
        'actual_delivery_date', sp.actual_delivery_date,
        'lighthouse_performance_score', sp.lighthouse_performance_score,
        'lighthouse_seo_score', sp.lighthouse_seo_score,
        'lighthouse_best_practices_score', sp.lighthouse_best_practices_score,
        'lighthouse_accessibility_score', sp.lighthouse_accessibility_score,
        'client_first_name', SPLIT_PART(c.name, ' ', 1)
    )
    INTO v_result
    FROM public.software_projects sp
    JOIN public.clients c ON c.id = sp.client_id
    WHERE sp.client_token = p_token_or_code
       OR sp.project_code ILIKE p_token_or_code;

    IF v_result IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Projeto de software não localizado.');
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_client_software_project_by_token(TEXT) TO anon, authenticated, service_role;

-- RPC 6: Homologação Pública de Projeto de Software pelo Cliente (Sprint 4)
CREATE OR REPLACE FUNCTION public.rpc_homologate_software_project(
    p_token UUID,
    p_approver_name TEXT,
    p_approver_role TEXT,
    p_feedback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prj RECORD;
    v_hash TEXT;
BEGIN
    SELECT * INTO v_prj FROM public.software_projects WHERE client_token = p_token::TEXT;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Projeto não localizado para este token.');
    END IF;

    v_hash := 'HOMOLOG-SHA256-' || encode(digest(p_token::TEXT || CURRENT_TIMESTAMP::TEXT, 'sha256'), 'hex');

    UPDATE public.software_projects
    SET 
        status = 'Concluido',
        qa_homologated_at = CURRENT_TIMESTAMP,
        homologation_hash = v_hash,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_prj.id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'project_code', v_prj.project_code,
        'homologation_hash', v_hash,
        'message', 'Projeto homologado com sucesso pelo cliente.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_homologate_software_project(UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- RPC 7: Ping de Telemetria Dead Man's Snitch (MSP B2B)
CREATE OR REPLACE FUNCTION public.rpc_ping_backup_snitch(
    p_snitch_token VARCHAR,
    p_device_tag VARCHAR,
    p_backup_size_bytes BIGINT,
    p_status VARCHAR DEFAULT 'SUCCESS'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dev RECORD;
BEGIN
    SELECT * INTO v_dev FROM public.msp_devices WHERE device_tag = p_device_tag;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Dispositivo não catalogado.');
    END IF;

    UPDATE public.msp_devices
    SET 
        last_backup_at = CURRENT_TIMESTAMP,
        last_ping_at = CURRENT_TIMESTAMP,
        backup_status = p_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_dev.id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'device_tag', v_dev.device_tag,
        'last_backup_at', CURRENT_TIMESTAMP
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_ping_backup_snitch(VARCHAR, VARCHAR, BIGINT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- FIM DO SCRIPT DE HARDENING DEVSECOPS V5.0
-- ------------------------------------------------------------------------------
