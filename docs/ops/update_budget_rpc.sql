-- ==============================================================================
-- RPC: ATUALIZAR ORÇAMENTO DE OS EXISTENTE (MOMENTO 2 DA BANCADA)
-- Evita duplicação de OS e move o card de Triagem para Orçamento / Sinal
-- ==============================================================================

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

    -- Atualiza a Work Order
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
