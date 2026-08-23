-- ==============================================================================
-- IFL COSTA TECH — SPRINT 1 CONSOLIDATED SUPABASE RPC PATCH (PRODUÇÃO)
-- Projeto Supabase: togrnwxazuweuihlaljo (iflcosta-tech)
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. EXTENSÕES & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Garante que o enum de status contenha todos os status operacionais da bancada
DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Orcamento_Aguardando_Aprovacao';
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Testes_QA';
EXCEPTION WHEN OTHERS THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 2. RPC: LISTAGEM DE ORDENS DO KANBAN COM RELACIONAMENTO DE CLIENTE
-- Utilizada pelo Cockpit Admin para renderizar os cards em tempo real
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_get_kanban_work_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', wo.id,
            'os_number', wo.os_number,
            'public_tracking_token', wo.public_tracking_token,
            'status', wo.status,
            'service_type', wo.service_type,
            'device_brand', wo.device_brand,
            'device_model', wo.device_model,
            'reported_defect', wo.reported_defect,
            'client_name', c.name,
            'client_whatsapp', c.whatsapp,
            'total_parts', wo.total_parts,
            'total_labor', wo.total_labor,
            'total_amount', COALESCE(wo.total_order, (wo.total_parts + wo.total_labor + wo.pickup_fee - wo.total_discount)),
            'parts_deposit_required', wo.parts_deposit_required,
            'parts_deposit_paid', wo.parts_deposit_paid,
            'stress_test_aida64_temp_max', wo.stress_test_aida64_temp_max,
            'stress_test_furmark_temp_max', wo.stress_test_furmark_temp_max,
            'stress_test_crystaldisk_health', wo.stress_test_crystaldisk_health,
            'stress_test_boot_time_seconds', wo.stress_test_boot_time_seconds,
            'created_at', wo.created_at,
            'entry_at', wo.entry_at
        ) ORDER BY wo.created_at DESC
    ), '[]'::jsonb)
    INTO v_result
    FROM work_orders wo
    JOIN clients c ON c.id = wo.client_id
    WHERE wo.status != 'Cancelado';

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_kanban_work_orders() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. RPC: AVANÇO DE ETAPA / TRANSIÇÃO DE STATUS DA OS (COCKPIT BANCADA)
-- Transiciona a OS entre as colunas do Kanban com registro de telemetria
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

    -- Converte status recebido para o enum seguro
    BEGIN
        v_status_enum := p_new_status::os_status_enum;
    EXCEPTION WHEN OTHERS THEN
        IF p_new_status ILIKE '%triagem%' THEN
            v_status_enum := 'Triagem';
        ELSIF p_new_status ILIKE '%orcamento%' OR p_new_status ILIKE '%aprovacao%' THEN
            v_status_enum := 'Diagnostico_Concluido';
        ELSIF p_new_status ILIKE '%sinal%' THEN
            v_status_enum := 'Aguardando_Sinal_Peca';
        ELSIF p_new_status ILIKE '%encomendada%' THEN
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
-- 4. RPC: ATUALIZAR ORÇAMENTO DE OS EXISTENTE (MOMENTO 2 DA BANCADA)
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
    v_service_enum os_service_type_enum;
    v_target_status os_status_enum;
BEGIN
    SELECT * INTO v_wo FROM work_orders WHERE os_number = p_os_number;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'OS não encontrada.');
    END IF;

    -- Converte service type se válido
    BEGIN
        v_service_enum := p_service_type::os_service_type_enum;
    EXCEPTION WHEN OTHERS THEN
        v_service_enum := v_wo.service_type;
    END;

    -- Limpa itens antigos da OS se houver
    DELETE FROM work_order_items WHERE work_order_id = v_wo.id;

    -- Processa e insere novos itens
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

    -- Define o próximo status apropriado
    IF v_parts_total > 0 THEN
        v_target_status := 'Aguardando_Sinal_Peca';
    ELSE
        v_target_status := 'Diagnostico_Concluido';
    END IF;

    -- Atualiza a Work Order (sem tentar escrever em total_order que é gerado)
    UPDATE work_orders
    SET 
        service_type = COALESCE(v_service_enum, service_type),
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
-- 5. RPC: RASTREAMENTO COM OU SEM VALIDAÇÃO DE WHATSAPP (PORTAL DO CLIENTE)
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
        
        -- Busca exigindo confirmação de telefone (completo ou últimos 4 dígitos)
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
            RETURN JSONB_BUILD_OBJECT(
                'found', false, 
                'error', 'Dados não conferem. Confirme o número da OS e o WhatsApp cadastrado.'
            );
        END IF;
    ELSE
        -- Busca direta por número da OS (retorno sanitizado público)
        SELECT wo.public_tracking_token
        INTO v_token
        FROM work_orders wo
        WHERE wo.os_number = p_os_number
        ORDER BY wo.created_at DESC
        LIMIT 1;

        IF v_token IS NULL THEN
            RETURN JSONB_BUILD_OBJECT(
                'found', false, 
                'error', 'Ordem de Serviço #' || p_os_number || ' não encontrada.'
            );
        END IF;
    END IF;

    -- Retorna os dados sanitizados da OS via rpc_track_work_order
    RETURN rpc_track_work_order(v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 6. RPC: APROVAÇÃO DE ORÇAMENTO PELO CLIENTE (PORTAL DO CLIENTE VIA TOKEN)
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
        updated_at = NOW()
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT('success', true, 'os_number', v_wo.os_number, 'status', v_status_enum::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_advance_work_order_status_by_token(UUID, TEXT) TO anon, authenticated, service_role;
