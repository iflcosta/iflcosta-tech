-- ==============================================================================
-- IF TECH — STATE MACHINE V3.0 DEFINITIVE PATCH (SUPABASE)
-- Resolve definitivamente o desacoplamento de Fila de Bancada e Sinal de Peças
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. ATUALIZAÇÃO SEGURA DO ENUM DE STATUS DA OS
DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Aprovado_Fila_Bancada';
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Peca_Recebida_Fila';
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Recusado_Devolucao';
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 2. DROP DAS ASSINATURAS ANTIGAS
DROP FUNCTION IF EXISTS rpc_advance_work_order_status_by_token(UUID, TEXT);
DROP FUNCTION IF EXISTS rpc_advance_work_order_status(INT, TEXT, INT, INT, INT, INT, TEXT);
DROP FUNCTION IF EXISTS rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB);

-- 3. RPC APRIMORADA: APROVAÇÃO INTELIGENTE POR TOKEN (PORTAL DO CLIENTE)
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
    v_has_parts BOOLEAN;
BEGIN
    SELECT * INTO v_wo FROM work_orders WHERE public_tracking_token = p_token;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Token de OS inválido.');
    END IF;

    -- Avalia se existem peças cadastradas com valor > 0
    v_has_parts := (COALESCE(v_wo.total_parts, 0.00) > 0.00);

    IF p_new_status = 'Aprovado_Pelo_Cliente' OR p_new_status ILIKE '%aprovad%' THEN
        IF v_has_parts AND NOT COALESCE(v_wo.parts_deposit_paid, false) THEN
            -- Se tem peças e o sinal não foi pago -> Aguarda Sinal
            v_target_status := 'Aguardando_Sinal_Peca';
        ELSE
            -- Se NÃO tem peças (100% M.O.) ou sinal já quitado -> Vai para a Fila de Início (NÃO direto pra Bancada)
            v_target_status := 'Aprovado_Fila_Bancada';
        END IF;
    ELSIF p_new_status ILIKE '%recusad%' OR p_new_status ILIKE '%cancel%' THEN
        v_target_status := 'Recusado_Devolucao';
    ELSE
        BEGIN
            v_target_status := p_new_status::os_status_enum;
        EXCEPTION WHEN OTHERS THEN
            v_target_status := 'Aprovado_Fila_Bancada';
        END;
    END IF;

    UPDATE work_orders
    SET 
        status = v_target_status,
        parts_deposit_paid = CASE WHEN NOT v_has_parts THEN true ELSE parts_deposit_paid END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true, 
        'os_number', v_wo.os_number, 
        'status', v_target_status::TEXT,
        'has_parts', v_has_parts
    );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_advance_work_order_status_by_token(UUID, TEXT) TO anon, authenticated, service_role;

-- 4. RPC APRIMORADA: AVANÇO DE STATUS NO COCKPIT ADMIN
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
        ELSIF p_new_status ILIKE '%orcamento%' OR p_new_status ILIKE '%diagnostico%' THEN
            v_status_enum := 'Diagnostico_Concluido';
        ELSIF p_new_status ILIKE '%sinal%' THEN
            v_status_enum := 'Aguardando_Sinal_Peca';
        ELSIF p_new_status ILIKE '%encomendada%' THEN
            v_status_enum := 'Peca_Encomendada';
        ELSIF p_new_status ILIKE '%fila%' OR p_new_status ILIKE '%aprovad%' THEN
            v_status_enum := 'Aprovado_Fila_Bancada';
        ELSIF p_new_status ILIKE '%bancada%' THEN
            v_status_enum := 'Na_Bancada';
        ELSIF p_new_status ILIKE '%qa%' OR p_new_status ILIKE '%teste%' THEN
            v_status_enum := 'Teste_Estresse_QA';
        ELSIF p_new_status ILIKE '%pronto%' THEN
            v_status_enum := 'Pronto';
        ELSIF p_new_status ILIKE '%entregue%' THEN
            v_status_enum := 'Entregue';
        ELSIF p_new_status ILIKE '%recusad%' THEN
            v_status_enum := 'Recusado_Devolucao';
        ELSE
            v_status_enum := 'Aprovado_Fila_Bancada';
        END IF;
    END;

    UPDATE work_orders
    SET 
        status = v_status_enum,
        parts_deposit_paid = CASE 
            WHEN v_status_enum IN ('Peca_Encomendada', 'Aprovado_Fila_Bancada', 'Na_Bancada', 'Teste_Estresse_QA', 'Pronto', 'Entregue') 
            THEN true 
            ELSE parts_deposit_paid 
        END,
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

-- 5. RPC APRIMORADA: ATUALIZAÇÃO DE ORÇAMENTO
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
    v_service_enum os_service_type_enum := 'Hardware_Reparo';
BEGIN
    SELECT * INTO v_wo FROM work_orders WHERE os_number = p_os_number;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'OS não encontrada.');
    END IF;

    IF p_service_type IS NOT NULL THEN
        BEGIN
            v_service_enum := p_service_type::os_service_type_enum;
        EXCEPTION WHEN OTHERS THEN
            IF p_service_type ILIKE '%upgrade%' THEN
                v_service_enum := 'Hardware_Upgrade';
            ELSIF p_service_type ILIKE '%montagem%' THEN
                v_service_enum := 'Montagem_PC';
            ELSIF p_service_type ILIKE '%software%' OR p_service_type ILIKE '%formatacao%' THEN
                v_service_enum := 'Software_Bancada';
            ELSIF p_service_type ILIKE '%msp%' THEN
                v_service_enum := 'MSP_Avulso';
            ELSE
                v_service_enum := v_wo.service_type;
            END IF;
        END;
    ELSE
        v_service_enum := v_wo.service_type;
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

    UPDATE work_orders
    SET 
        service_type = v_service_enum,
        technical_diagnosis = COALESCE(p_diagnosis, technical_diagnosis),
        status = 'Diagnostico_Concluido',
        total_parts = v_parts_total,
        total_labor = v_labor_total,
        parts_deposit_required = v_parts_total,
        parts_deposit_paid = CASE WHEN v_parts_total = 0 THEN true ELSE false END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'os_number', v_wo.os_number,
        'public_tracking_token', v_wo.public_tracking_token,
        'status', 'Diagnostico_Concluido',
        'total_parts', v_parts_total,
        'total_labor', v_labor_total,
        'grand_total', v_parts_total + v_labor_total + COALESCE(v_wo.pickup_fee, 0.00)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
