-- ==============================================================================
-- IFL COSTA TECH — FIX DEFINITIVO PGRST203 (FUNCTION OVERLOADING RESOLVER)
-- Remove todas as assinaturas duplicadas e recria as RPCs com assinatura única
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. DROP DAS FUNÇÕES SOBRECARREGADAS ANTIGAS
DROP FUNCTION IF EXISTS rpc_advance_work_order_status(INT, TEXT);
DROP FUNCTION IF EXISTS rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT);
DROP FUNCTION IF EXISTS rpc_advance_work_order_status CASCADE;

DROP FUNCTION IF EXISTS rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS rpc_update_work_order_budget(INT, JSONB);
DROP FUNCTION IF EXISTS rpc_update_work_order_budget CASCADE;

DROP FUNCTION IF EXISTS rpc_create_work_order_atomic(TEXT, TEXT, os_service_type_enum, TEXT, TEXT, TEXT, DECIMAL, JSONB);
DROP FUNCTION IF EXISTS rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB);
DROP FUNCTION IF EXISTS rpc_create_work_order_atomic CASCADE;

DROP FUNCTION IF EXISTS rpc_track_work_order_by_number(INT);
DROP FUNCTION IF EXISTS rpc_track_work_order_by_number(INT, TEXT);
DROP FUNCTION IF EXISTS rpc_track_work_order_by_number CASCADE;

DROP FUNCTION IF EXISTS rpc_advance_work_order_status_by_token(UUID, TEXT);
DROP FUNCTION IF EXISTS rpc_advance_work_order_status_by_token CASCADE;

-- ------------------------------------------------------------------------------
-- 2. RPC ÚNICA: AVANÇO DE STATUS DA OS (COCKPIT BANCADA)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_advance_work_order_status(
    p_os_number INT,
    p_new_status TEXT,
    p_stress_cpu INT DEFAULT NULL,
    p_stress_gpu INT DEFAULT NULL,
    p_stress_ssd INT DEFAULT NULL,
    p_stress_boot INT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
    v_status_enum os_status_enum;
BEGIN
    SELECT * INTO v_wo FROM work_orders WHERE os_number = p_os_number;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'OS não encontrada.');
    END IF;

    BEGIN
        v_status_enum := p_new_status::os_status_enum;
    EXCEPTION WHEN OTHERS THEN
        IF p_new_status ILIKE '%triagem%' THEN
            v_status_enum := 'Triagem';
        ELSIF p_new_status ILIKE '%orcamento%' OR p_new_status ILIKE '%aprovacao%' THEN
            v_status_enum := 'Diagnostico_Concluido';
        ELSIF p_new_status ILIKE '%sinal%' THEN
            v_status_enum := 'Aguardando_Sinal_Peca';
        ELSIF p_new_status ILIKE '%encomendada%' OR p_new_status ILIKE '%pago%' THEN
            v_status_enum := 'Peca_Encomendada';
        ELSIF p_new_status ILIKE '%bancada%' THEN
            v_status_enum := 'Na_Bancada';
        ELSIF p_new_status ILIKE '%qa%' OR p_new_status ILIKE '%teste%' THEN
            v_status_enum := 'Teste_Estresse_QA';
        ELSIF p_new_status ILIKE '%pronto%' THEN
            v_status_enum := 'Pronto';
        ELSIF p_new_status ILIKE '%entregue%' THEN
            v_status_enum := 'Entregue';
        ELSIF p_new_status ILIKE '%cancel%' THEN
            v_status_enum := 'Cancelado';
        ELSE
            v_status_enum := 'Na_Bancada';
        END IF;
    END;

    UPDATE work_orders
    SET 
        status = v_status_enum,
        parts_deposit_paid = CASE WHEN v_status_enum IN ('Peca_Encomendada', 'Na_Bancada', 'Teste_Estresse_QA', 'Pronto', 'Entregue') THEN true ELSE parts_deposit_paid END,
        stress_test_aida64_temp_max = COALESCE(p_stress_cpu, stress_test_aida64_temp_max),
        stress_test_furmark_temp_max = COALESCE(p_stress_gpu, stress_test_furmark_temp_max),
        stress_test_crystaldisk_health = COALESCE(p_stress_ssd, stress_test_crystaldisk_health),
        stress_test_boot_time_seconds = COALESCE(p_stress_boot, stress_test_boot_time_seconds),
        stress_test_notes = COALESCE(p_notes, stress_test_notes),
        ready_at = CASE WHEN v_status_enum = 'Pronto' AND ready_at IS NULL THEN CURRENT_TIMESTAMP ELSE ready_at END,
        delivered_at = CASE WHEN v_status_enum = 'Entregue' AND delivered_at IS NULL THEN CURRENT_TIMESTAMP ELSE delivered_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'os_number', v_wo.os_number,
        'new_status', v_status_enum::TEXT,
        'public_tracking_token', v_wo.public_tracking_token
    );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. RPC ÚNICA: ATUALIZAÇÃO DE ORÇAMENTO (SEM ERRO DE TIPO)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_update_work_order_budget(
    p_os_number INT,
    p_service_type TEXT,
    p_diagnosis TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
    v_item JSONB;
    v_parts_total DECIMAL(10,2) := 0.00;
    v_labor_total DECIMAL(10,2) := 0.00;
    v_target_status os_status_enum;
BEGIN
    SELECT * INTO v_wo FROM work_orders WHERE os_number = p_os_number;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'OS não encontrada.');
    END IF;

    DELETE FROM work_order_items WHERE work_order_id = v_wo.id;

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO work_order_items (
                work_order_id,
                item_type,
                description,
                cost_price,
                unit_price,
                quantity
            ) VALUES (
                v_wo.id,
                COALESCE(v_item->>'item_type', 'Part'),
                COALESCE(v_item->>'description', 'Componente'),
                COALESCE((v_item->>'cost_price')::DECIMAL, 0.00),
                COALESCE((v_item->>'unit_price')::DECIMAL, 0.00),
                COALESCE((v_item->>'quantity')::INT, 1)
            );

            IF (v_item->>'item_type') = 'Labor' THEN
                v_labor_total := v_labor_total + (COALESCE((v_item->>'unit_price')::DECIMAL, 0.00) * COALESCE((v_item->>'quantity')::INT, 1));
            ELSE
                v_parts_total := v_parts_total + (COALESCE((v_item->>'unit_price')::DECIMAL, 0.00) * COALESCE((v_item->>'quantity')::INT, 1));
            END IF;
        END LOOP;
    END IF;

    IF v_parts_total > 0 THEN
        v_target_status := 'Aguardando_Sinal_Peca';
    ELSE
        v_target_status := 'Diagnostico_Concluido';
    END IF;

    UPDATE work_orders
    SET 
        technical_diagnosis = COALESCE(p_diagnosis, technical_diagnosis),
        status = v_target_status,
        total_parts = v_parts_total,
        total_labor = v_labor_total,
        parts_deposit_required = v_parts_total,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'os_number', v_wo.os_number,
        'public_tracking_token', v_wo.public_tracking_token,
        'status', v_target_status::TEXT,
        'total_parts', v_parts_total,
        'total_labor', v_labor_total,
        'grand_total', v_parts_total + v_labor_total + COALESCE(v_wo.pickup_fee, 0.00)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. RPC ÚNICA: CRIAÇÃO ATÔMICA DE OS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_create_work_order_atomic(
    p_client_name TEXT,
    p_client_whatsapp TEXT,
    p_service_type TEXT,
    p_device_brand TEXT,
    p_device_model TEXT,
    p_reported_defect TEXT,
    p_pickup_fee DECIMAL DEFAULT 0.00,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_phone TEXT;
    v_client_id UUID;
    v_work_order_id UUID;
    v_os_number INT;
    v_tracking_token UUID;
    v_total_parts DECIMAL(10,2) := 0.00;
    v_total_labor DECIMAL(10,2) := 0.00;
    v_item JSONB;
    v_target_status os_status_enum := 'Triagem';
BEGIN
    v_clean_phone := REGEXP_REPLACE(p_client_whatsapp, '\D', '', 'g');
    IF length(v_clean_phone) = 0 THEN
        v_clean_phone := '11999999999';
    END IF;

    SELECT id INTO v_client_id FROM clients WHERE whatsapp = v_clean_phone LIMIT 1;
    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, whatsapp, client_type, status)
        VALUES (p_client_name, v_clean_phone, 'B2C', 'Ativo')
        RETURNING id INTO v_client_id;
    END IF;

    SELECT COALESCE(MAX(os_number), 1050) + 1 INTO v_os_number FROM work_orders;
    v_tracking_token := gen_random_uuid();

    INSERT INTO work_orders (
        client_id, os_number, service_type, device_brand, device_model,
        reported_defect, status, public_tracking_token, is_pickup_delivery, pickup_fee
    ) VALUES (
        v_client_id, v_os_number, 'Hardware_Reparo', p_device_brand, p_device_model,
        p_reported_defect, 'Triagem', v_tracking_token, (p_pickup_fee > 0), p_pickup_fee
    ) RETURNING id INTO v_work_order_id;

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO work_order_items (
                work_order_id, item_type, description, cost_price, unit_price, quantity
            ) VALUES (
                v_work_order_id,
                COALESCE(v_item->>'item_type', 'Part'),
                COALESCE(v_item->>'description', 'Componente'),
                COALESCE((v_item->>'cost_price')::DECIMAL, 0.00),
                COALESCE((v_item->>'unit_price')::DECIMAL, 0.00),
                COALESCE((v_item->>'quantity')::INT, 1)
            );

            IF (v_item->>'item_type') = 'Labor' THEN
                v_total_labor := v_total_labor + (COALESCE((v_item->>'unit_price')::DECIMAL, 0.00) * COALESCE((v_item->>'quantity')::INT, 1));
            ELSE
                v_total_parts := v_total_parts + (COALESCE((v_item->>'unit_price')::DECIMAL, 0.00) * COALESCE((v_item->>'quantity')::INT, 1));
            END IF;
        END LOOP;

        IF v_total_parts > 0 THEN
            v_target_status := 'Aguardando_Sinal_Peca';
        ELSE
            v_target_status := 'Diagnostico_Concluido';
        END IF;

        UPDATE work_orders SET
            status = v_target_status,
            total_parts = v_total_parts,
            total_labor = v_total_labor,
            parts_deposit_required = v_total_parts,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_work_order_id;
    END IF;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'work_order_id', v_work_order_id,
        'os_number', v_os_number,
        'public_tracking_token', v_tracking_token,
        'client_id', v_client_id,
        'status', v_target_status::TEXT,
        'total_parts', v_total_parts,
        'total_labor', v_total_labor,
        'grand_total', v_total_parts + v_total_labor + COALESCE(p_pickup_fee, 0.00)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. RPC ÚNICA: APROVAÇÃO POR TOKEN (PORTAL DO CLIENTE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_advance_work_order_status_by_token(
    p_token UUID,
    p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
    v_status_enum os_status_enum;
BEGIN
    SELECT * INTO v_wo FROM work_orders WHERE public_tracking_token = p_token;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Token de OS inválido.');
    END IF;

    BEGIN
        v_status_enum := p_new_status::os_status_enum;
    EXCEPTION WHEN OTHERS THEN
        v_status_enum := 'Aguardando_Sinal_Peca';
    END;

    UPDATE work_orders
    SET 
        status = v_status_enum,
        parts_deposit_paid = CASE WHEN v_status_enum IN ('Peca_Encomendada', 'Na_Bancada', 'Teste_Estresse_QA', 'Pronto', 'Entregue') THEN true ELSE parts_deposit_paid END,
        updated_at = NOW()
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT('success', true, 'os_number', v_wo.os_number, 'status', v_status_enum::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_advance_work_order_status_by_token(UUID, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. RPC ÚNICA: RASTREAMENTO COM VALIDAÇÃO DE WHATSAPP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_track_work_order_by_number(
    p_os_number INT, 
    p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token UUID;
    v_clean_phone TEXT;
BEGIN
    IF p_os_number IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Número da OS é obrigatório.');
    END IF;

    IF p_phone IS NOT NULL AND length(trim(p_phone)) > 0 AND trim(p_phone) != '0000' THEN
        v_clean_phone := REGEXP_REPLACE(p_phone, '\D', '', 'g');
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
            RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Dados não conferem.');
        END IF;
    ELSE
        SELECT wo.public_tracking_token
        INTO v_token
        FROM work_orders wo
        WHERE wo.os_number = p_os_number
        ORDER BY wo.created_at DESC
        LIMIT 1;

        IF v_token IS NULL THEN
            RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'OS não encontrada.');
        END IF;
    END IF;

    RETURN rpc_track_work_order(v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;
