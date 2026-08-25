-- ==============================================================================
-- IFL COSTA TECH — CISO SUPABASE DEFENSE V3.0 (BLINDAGEM TOTAL PRODUÇÃO)
-- Projeto Supabase: togrnwxazuweuihlaljo (iflcosta-tech)
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. EXTENSÕES MANDATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. LIMPEZA TOTAL DE POLÍTICAS PERMISSIVAS LEGADAS (ANON PERMISSIVE POLICIES)
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND policyname ILIKE '%anon%'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. HABILITAÇÃO MANDATÓRIA DE RLS EM TODAS AS TABELAS DO SISTEMA
-- ------------------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE msp_contracts ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS RLS ESTREITAS (APENAS AUTHENTICATED E SERVICE_ROLE)
-- ------------------------------------------------------------------------------
CREATE POLICY "auth_all_clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_work_orders" ON work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_work_order_items" ON work_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_clients" ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_work_orders" ON work_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_work_order_items" ON work_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. TABELA DE RATE LIMITING CONTRA FORÇA BRUTA NO 2FA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tracking_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number INT NOT NULL,
    attempt_ip TEXT,
    failed_attempts INT DEFAULT 1,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_rate_limits_lookup 
ON tracking_rate_limits(os_number, locked_until);

-- ------------------------------------------------------------------------------
-- 6. RPC 1: RASTREAMENTO SEGURO POR TOKEN UUID (ZERO LEAK LGPD)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_track_work_order(p_token UUID)
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
            FROM work_order_items woi
            WHERE woi.work_order_id = wo.id
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM work_orders wo
    JOIN clients c ON c.id = wo.client_id
    WHERE wo.public_tracking_token = p_token;

    IF v_result IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Ordem de Serviço não localizada para este token.');
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_work_order(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. RPC 2: RASTREAMENTO COM 2º FATOR MANDATÓRIO & RATE LIMITING
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_track_work_order_by_number(
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

    -- Checagem de Rate Limit (Bloqueio contra Brute-force dos 4 dígitos)
    SELECT * INTO v_rate 
    FROM tracking_rate_limits 
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

    -- Validação Estrita de 2FA
    SELECT wo.public_tracking_token
    INTO v_token
    FROM work_orders wo
    JOIN clients c ON c.id = wo.client_id
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
            INSERT INTO tracking_rate_limits (os_number, failed_attempts, last_attempt_at)
            VALUES (p_os_number, 1, CURRENT_TIMESTAMP);
        ELSE
            UPDATE tracking_rate_limits
            SET failed_attempts = failed_attempts + 1,
                locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE NULL END,
                last_attempt_at = CURRENT_TIMESTAMP
            WHERE os_number = p_os_number;
        END IF;

        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Dados divergentes. Confirme a OS e os últimos dígitos do WhatsApp.');
    END IF;

    -- Reset do rate limit em caso de sucesso
    IF v_rate IS NOT NULL THEN
        DELETE FROM tracking_rate_limits WHERE os_number = p_os_number;
    END IF;

    RETURN rpc_track_work_order(v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. RPC 3: APROVAÇÃO SEGURA POR TOKEN (PORTAL DO CLIENTE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_advance_work_order_status_by_token(
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
    SELECT * INTO v_wo FROM work_orders WHERE public_tracking_token = p_token;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Token de OS inválido.');
    END IF;

    IF COALESCE(v_wo.total_parts, 0) > 0 THEN
        v_target_status := 'Aguardando_Sinal_Peca';
    ELSE
        v_target_status := 'Diagnostico_Concluido';
    END IF;

    UPDATE work_orders
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

GRANT EXECUTE ON FUNCTION rpc_advance_work_order_status_by_token(UUID, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 9. RPC 4: AVALIAÇÃO / NPS DO CLIENTE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_submit_customer_review(
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
    SELECT * INTO v_wo FROM work_orders WHERE public_tracking_token = p_token;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'OS não encontrada.');
    END IF;

    UPDATE work_orders
    SET 
        customer_rating = p_rating,
        customer_feedback = p_feedback,
        customer_reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT('success', true, 'os_number', v_wo.os_number);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_submit_customer_review(UUID, INT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 10. REVOGAÇÃO GERAL DE RPCS ADMINISTRATIVAS PARA O PAPEL 'ANON'
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION rpc_get_kanban_work_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION rpc_get_admin_dashboard_metrics() FROM anon;
REVOKE EXECUTE ON FUNCTION rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB) FROM anon;
DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION rpc_get_clients_overview() FROM anon;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- Concessão estrita para usuários autenticados e service_role
GRANT EXECUTE ON FUNCTION rpc_get_kanban_work_orders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rpc_get_admin_dashboard_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB) TO authenticated, service_role;
DO $$ BEGIN
    GRANT EXECUTE ON FUNCTION rpc_get_clients_overview() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN null; END $$;
