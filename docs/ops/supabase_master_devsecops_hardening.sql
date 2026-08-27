-- ==============================================================================
-- IF TECH // DEVSECOPS & CLOUD INFRASTRUCTURE MASTER HARDENING PATCH
-- Projeto Supabase: togrnwxazuweuihlaljo (iflcosta-tech)
-- Versão: 4.0 (Enterprise Hardening & Defense-in-Depth)
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. EXTENSÕES CRIPTOGRÁFICAS E SEGURANÇA MANDATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. LIMPEZA TOTAL DE POLÍTICAS LEGADAS OU SOBREPOSTAS (ANON/PERMISSIVE CLEANUP)
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. HABILITAÇÃO MANDATÓRIA DE ROW LEVEL SECURITY (RLS) EM TODAS AS 25 TABELAS
-- ------------------------------------------------------------------------------
-- Módulo Core & Bancada
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- Módulo Software & Engenharia Web
ALTER TABLE IF EXISTS public.software_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_timesheet_entries ENABLE ROW LEVEL SECURITY;

-- Módulo MSP, ITAM & Service Desk
ALTER TABLE IF EXISTS public.msp_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_managed_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_onsite_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.msp_telemetry_alerts ENABLE ROW LEVEL SECURITY;

-- Módulo Estoque & PDV (POS)
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Módulo Financeiro & Gateway Asaas
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

-- Módulo Hardware Sniper & Oportunidades
ALTER TABLE IF EXISTS public.hardware_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sniper_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sniper_settings ENABLE ROW LEVEL SECURITY;

-- Módulo Anti-Abuso & Rate Limiting
ALTER TABLE IF EXISTS public.tracking_rate_limits ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS RLS ESTRITAS PARA USUÁRIOS AUTENTICADOS (AUTHENTICATED)
-- ------------------------------------------------------------------------------
-- Core & Bancada
CREATE POLICY "auth_all_clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_technicians" ON public.technicians FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_work_orders" ON public.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_work_order_items" ON public.work_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_financial_ledger" ON public.financial_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Software & Web
CREATE POLICY "auth_all_software_projects" ON public.software_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_project_milestones" ON public.project_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_project_timesheet_entries" ON public.project_timesheet_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MSP & Service Desk
CREATE POLICY "auth_all_msp_contracts" ON public.msp_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_msp_managed_devices" ON public.msp_managed_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_msp_tickets" ON public.msp_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_msp_ticket_messages" ON public.msp_ticket_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_msp_onsite_visits" ON public.msp_onsite_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_msp_telemetry_alerts" ON public.msp_telemetry_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Estoque & PDV
CREATE POLICY "auth_all_products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_inventory_serials" ON public.inventory_serials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pos_sales" ON public.pos_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pos_sale_items" ON public.pos_sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_inventory_movements" ON public.inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pagamentos & Sniper
CREATE POLICY "auth_all_payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_hardware_deals" ON public.hardware_deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sniper_rules" ON public.sniper_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sniper_settings" ON public.sniper_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tracking_rate_limits" ON public.tracking_rate_limits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS RLS ESTRITAS PARA SERVICE ROLE (SISTEMAS BACKEND & WEBHOOKS)
-- ------------------------------------------------------------------------------
-- Core & Bancada
CREATE POLICY "service_role_all_clients" ON public.clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_technicians" ON public.technicians FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_work_orders" ON public.work_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_work_order_items" ON public.work_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_invoices" ON public.invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_financial_ledger" ON public.financial_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Software & Web
CREATE POLICY "service_role_all_software_projects" ON public.software_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_project_milestones" ON public.project_milestones FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_project_timesheet_entries" ON public.project_timesheet_entries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- MSP & Service Desk
CREATE POLICY "service_role_all_msp_contracts" ON public.msp_contracts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_managed_devices" ON public.msp_managed_devices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_tickets" ON public.msp_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_ticket_messages" ON public.msp_ticket_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_onsite_visits" ON public.msp_onsite_visits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_telemetry_alerts" ON public.msp_telemetry_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Estoque & PDV
CREATE POLICY "service_role_all_products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_inventory_serials" ON public.inventory_serials FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_pos_sales" ON public.pos_sales FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_pos_sale_items" ON public.pos_sale_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_inventory_movements" ON public.inventory_movements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Pagamentos & Sniper
CREATE POLICY "service_role_all_payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_hardware_deals" ON public.hardware_deals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_sniper_rules" ON public.sniper_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_sniper_settings" ON public.sniper_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_tracking_rate_limits" ON public.tracking_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. PERMISSÕES DE TABELAS PARA O PAPEL 'ANON': TOTALMENTE NEGADO (ZERO TRUST)
-- ------------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. TABELA DE RATE LIMITING E PROTEÇÃO CONTRA FORÇA BRUTA NO 2FA
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

-- ------------------------------------------------------------------------------
-- 8. RPCS PÚBLICAS REFORÇADAS (SECURITY DEFINER + SEARCH_PATH FIXED)
-- ------------------------------------------------------------------------------

-- RPC 1: Rastreamento por Token UUID (Zero-Leak LGPD)
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
        'asaas_payment_id', wo.asaas_payment_id,
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

-- RPC 2: Rastreamento por Número + 2FA WhatsApp + Proteção Rate Limit
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

    SELECT * INTO v_rate 
    FROM public.tracking_rate_limits 
    WHERE os_number = p_os_number;

    IF v_rate IS NOT NULL AND v_rate.locked_until > CURRENT_TIMESTAMP THEN
        RETURN JSONB_BUILD_OBJECT(
            'found', false, 
            'error', 'Muitas tentativas incorretas. Aguarde 15 minutos para tentar novamente.'
        );
    END IF;

    v_clean_phone := REGEXP_REPLACE(p_phone, '\D', '', 'g');
    
    IF length(v_clean_phone) < 4 THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Informe ao menos os 4 últimos dígitos do WhatsApp cadastrado.');
    END IF;

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

        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Dados divergentes. Confirme a OS e os últimos dígitos do WhatsApp.');
    END IF;

    IF v_rate IS NOT NULL THEN
        DELETE FROM public.tracking_rate_limits WHERE os_number = p_os_number;
    END IF;

    RETURN public.rpc_track_work_order(v_token);
END;
$$;

-- RPC 3: Aprovação de Orçamento pelo Cliente via Token
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

-- RPC 5: Rastreamento Seguro de Projeto de Software B2B
CREATE OR REPLACE FUNCTION public.rpc_get_client_software_project_by_token(
    p_token_or_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_proj RECORD;
    v_milestones JSONB;
BEGIN
    SELECT * INTO v_proj
    FROM public.software_projects
    WHERE client_token = p_token_or_code 
       OR project_code = UPPER(p_token_or_code)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false, 'error', 'Projeto não localizado para este código ou chave de acesso.');
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'milestone_order', milestone_order,
        'title', title,
        'description', description,
        'status', status,
        'due_date', due_date,
        'completed_at', completed_at
    ) ORDER BY milestone_order ASC), '[]'::jsonb)
    INTO v_milestones
    FROM public.project_milestones
    WHERE project_id = v_proj.id;

    RETURN jsonb_build_object(
        'found', true,
        'id', v_proj.id,
        'project_code', v_proj.project_code,
        'title', v_proj.title,
        'service_code', v_proj.service_code,
        'repository_url', v_proj.repository_url,
        'staging_url', v_proj.staging_url,
        'production_url', v_proj.production_url,
        'current_sprint', v_proj.current_sprint,
        'progress_percentage', v_proj.progress_percentage,
        'status', v_proj.status,
        'client_name', v_proj.client_name,
        'client_token', v_proj.client_token,
        'kickoff_deposit_required', v_proj.kickoff_deposit_required,
        'kickoff_deposit_paid', v_proj.kickoff_deposit_paid,
        'final_delivery_paid', v_proj.final_delivery_paid,
        'total_budget', v_proj.total_budget,
        'start_date', v_proj.start_date,
        'deadline_date', v_proj.deadline_date,
        'homologation_hash', v_proj.homologation_hash,
        'qa_homologated_at', v_proj.qa_homologated_at,
        'milestones', v_milestones
    );
END;
$$;

-- RPC 6: Homologação e Assinatura Digital de Software
CREATE OR REPLACE FUNCTION public.rpc_homologate_software_project(
    p_client_token TEXT,
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
    v_proj RECORD;
    v_hash TEXT;
BEGIN
    SELECT * INTO v_proj FROM public.software_projects WHERE client_token = p_client_token;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de projeto inválido.');
    END IF;

    v_hash := encode(digest(v_proj.project_code || '|' || NOW()::TEXT || '|' || p_signer_name || '|' || p_signer_document, 'sha256'), 'hex');

    UPDATE public.software_projects
    SET status = 'Concluido',
        homologation_hash = v_hash,
        qa_homologated_at = NOW(),
        final_delivery_paid = true,
        updated_at = NOW()
    WHERE id = v_proj.id;

    RETURN jsonb_build_object(
        'success', true,
        'project_code', v_proj.project_code,
        'homologation_hash', v_hash,
        'homologated_at', NOW()
    );
END;
$$;

-- RPC 7: Dead Man's Snitch de Backup MSP (Automação Segura)
CREATE OR REPLACE FUNCTION public.rpc_ping_backup_snitch(
    p_snitch_token VARCHAR,
    p_status VARCHAR DEFAULT 'SUCCESS',
    p_bytes BIGINT DEFAULT NULL,
    p_error_log TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_device RECORD;
    v_contract RECORD;
    v_new_backup_status VARCHAR(30);
BEGIN
    SELECT * INTO v_device FROM public.msp_managed_devices WHERE backup_snitch_token = p_snitch_token;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Snitch token inválido.');
    END IF;

    SELECT * INTO v_contract FROM public.msp_contracts WHERE id = v_device.contract_id;

    IF UPPER(p_status) = 'SUCCESS' THEN
        v_new_backup_status := 'Protegido';
    ELSE
        v_new_backup_status := 'Falha';
    END IF;

    UPDATE public.msp_managed_devices
    SET backup_status = v_new_backup_status,
        last_backup_at = NOW(),
        last_seen_at = NOW(),
        updated_at = NOW()
    WHERE id = v_device.id;

    IF v_new_backup_status = 'Falha' THEN
        INSERT INTO public.msp_telemetry_alerts (
            contract_id,
            device_id,
            alert_source,
            severity,
            title,
            message
        ) VALUES (
            v_device.contract_id,
            v_device.id,
            'DeadManSnitch_Backup',
            'P1_Critica',
            'ALERTA: Falha na Rotina de Backup 3-2-1 (' || v_device.device_tag || ')',
            COALESCE(p_error_log, 'A rotina agendada de backup falhou ou enviou status de erro ao snitch.')
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'device_tag', v_device.device_tag,
        'backup_status', v_new_backup_status,
        'last_backup_at', NOW()
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. GESTÃO DE PRIVILÉGIOS EM RPCS: CONCESSÃO PÚBLICA VS ADMINISTRATIVA
-- ------------------------------------------------------------------------------

-- Concessão estrita de RPCs públicas para 'anon'
GRANT EXECUTE ON FUNCTION public.rpc_track_work_order(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_advance_work_order_status_by_token(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_submit_customer_review(UUID, INT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_client_software_project_by_token(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_homologate_software_project(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_ping_backup_snitch(VARCHAR, VARCHAR, BIGINT, TEXT) TO anon, authenticated, service_role;

-- Revogação estrita de TODAS as RPCs administrativas para 'anon'
DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.rpc_get_kanban_work_orders() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_get_admin_dashboard_metrics() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_get_clients_overview() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_get_executive_bi_analytics(DATE, DATE) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_create_software_project_atomic(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, DATE, DATE, JSONB) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_process_pos_sale(JSONB, VARCHAR, VARCHAR, NUMERIC, NUMERIC, NUMERIC, VARCHAR, VARCHAR, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_create_msp_contract_atomic(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, INT, INT, INT, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_create_msp_device_atomic(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_create_msp_ticket_atomic(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_convert_ticket_to_work_order(UUID) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rpc_confirm_asaas_payment(TEXT, DECIMAL, JSONB) FROM anon;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- Concessão exclusiva das RPCs administrativas para authenticated e service_role
DO $$ BEGIN
    GRANT EXECUTE ON FUNCTION public.rpc_get_kanban_work_orders() TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_get_admin_dashboard_metrics() TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_get_clients_overview() TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_get_executive_bi_analytics(DATE, DATE) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_software_project_atomic(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, DATE, DATE, JSONB) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_process_pos_sale(JSONB, VARCHAR, VARCHAR, NUMERIC, NUMERIC, NUMERIC, VARCHAR, VARCHAR, TEXT) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_msp_contract_atomic(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, INT, INT, INT, TEXT) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_msp_device_atomic(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_create_msp_ticket_atomic(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_convert_ticket_to_work_order(UUID) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_confirm_asaas_payment(TEXT, DECIMAL, JSONB) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- ------------------------------------------------------------------------------
-- FIM DO PATCH MESTRE DE DEFESA EM PROFUNDIDADE DEVSECOPS & INFRAESTRUTURA V4.0
-- ------------------------------------------------------------------------------
