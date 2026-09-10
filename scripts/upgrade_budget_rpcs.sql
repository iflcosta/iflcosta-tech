-- 1. DROP OLD rpc_save_budget_atomic IF SIGNATURE CHANGED
DROP FUNCTION IF EXISTS public.rpc_save_budget_atomic(INT, UUID, TEXT, TEXT, DECIMAL, DECIMAL, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.rpc_save_budget_atomic(INT, UUID, TEXT, TEXT, DECIMAL, DECIMAL, JSONB, TEXT, DECIMAL);

-- 2. CREATE rpc_save_budget_atomic WITH p_pickup_fee
CREATE OR REPLACE FUNCTION public.rpc_save_budget_atomic(
    p_os_number INT DEFAULT NULL,
    p_work_order_id UUID DEFAULT NULL,
    p_service_type TEXT DEFAULT 'Hardware_Reparo',
    p_technical_diagnosis TEXT DEFAULT '',
    p_total_labor DECIMAL DEFAULT 0.00,
    p_total_parts DECIMAL DEFAULT 0.00,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_status TEXT DEFAULT 'Orcamento_Aguardando_Aprovacao',
    p_pickup_fee DECIMAL DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS 
DECLARE
    v_wo RECORD;
    v_item JSONB;
    v_calc_parts DECIMAL(10,2) := 0.00;
    v_calc_labor DECIMAL(10,2) := 0.00;
    v_final_parts DECIMAL(10,2);
    v_final_labor DECIMAL(10,2);
    v_final_pickup DECIMAL(10,2);
    v_final_total DECIMAL(10,2);
    v_service_enum os_service_type_enum;
    v_target_status os_status_enum;
    v_has_items BOOLEAN := false;
BEGIN
    IF p_work_order_id IS NOT NULL THEN
        SELECT * INTO v_wo FROM public.work_orders WHERE id = p_work_order_id LIMIT 1;
    END IF;

    IF v_wo.id IS NULL AND p_os_number IS NOT NULL THEN
        SELECT * INTO v_wo FROM public.work_orders WHERE os_number = p_os_number LIMIT 1;
    END IF;

    IF v_wo.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ordem de Serviço não localizada pelos identificadores informados.'
        );
    END IF;

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

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        v_has_items := true;
        DELETE FROM public.work_order_items WHERE work_order_id = v_wo.id;

        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            DECLARE
                v_itype TEXT := COALESCE(v_item->>'item_type', 'Hardware');
                v_desc TEXT := COALESCE(NULLIF(TRIM(v_item->>'description'), ''), 'Componente');
                v_cost DECIMAL(10,2) := COALESCE((v_item->>'cost_price')::DECIMAL, 0.00);
                v_price DECIMAL(10,2) := COALESCE((v_item->>'unit_price')::DECIMAL, 0.00);
                v_qty INT := COALESCE((v_item->>'quantity')::INT, 1);
            BEGIN
                INSERT INTO public.work_order_items (
                    work_order_id, item_type, description, cost_price, unit_price, quantity
                ) VALUES (
                    v_wo.id, v_itype, v_desc, v_cost, v_price, v_qty
                );

                IF v_itype = 'Labor' OR v_itype ILIKE '%mao%' OR v_itype ILIKE '%mão%' OR v_itype ILIKE '%servico%' OR v_itype ILIKE '%serviço%' THEN
                    v_calc_labor := v_calc_labor + (v_price * v_qty);
                ELSE
                    v_calc_parts := v_calc_parts + (v_price * v_qty);
                END IF;
            END;
        END LOOP;
    END IF;

    IF v_has_items THEN
        v_final_parts := v_calc_parts;
        v_final_labor := CASE WHEN v_calc_labor > 0 THEN v_calc_labor ELSE COALESCE(p_total_labor, 0.00) END;
    ELSE
        v_final_parts := COALESCE(p_total_parts, 0.00);
        v_final_labor := COALESCE(p_total_labor, 0.00);
    END IF;

    IF p_pickup_fee IS NOT NULL THEN
        v_final_pickup := p_pickup_fee;
    ELSE
        v_final_pickup := COALESCE(v_wo.pickup_fee, 0.00);
    END IF;

    v_final_total := v_final_parts + v_final_labor + v_final_pickup;

    BEGIN
        v_target_status := p_status::os_status_enum;
    EXCEPTION WHEN OTHERS THEN
        IF v_final_parts > 0 THEN
            v_target_status := 'Aguardando_Sinal_Peca'::os_status_enum;
        ELSE
            v_target_status := 'Diagnostico_Concluido'::os_status_enum;
        END IF;
    END;

    UPDATE public.work_orders
    SET 
        service_type = COALESCE(v_service_enum, service_type),
        technical_diagnosis = COALESCE(NULLIF(TRIM(p_technical_diagnosis), ''), technical_diagnosis),
        status = v_target_status,
        total_parts = v_final_parts,
        total_labor = v_final_labor,
        pickup_fee = v_final_pickup,
        is_pickup_delivery = (v_final_pickup > 0 OR v_wo.is_pickup_delivery),
        total_amount = v_final_total,
        parts_deposit_required = v_final_parts,
        parts_deposit_paid = CASE WHEN v_final_parts = 0 THEN true ELSE false END,
        parts_deposit_status = CASE WHEN v_final_parts = 0 THEN 'CONFIRMED' ELSE 'PENDING' END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN jsonb_build_object(
        'success', true,
        'work_order_id', v_wo.id,
        'os_number', v_wo.os_number,
        'public_tracking_token', v_wo.public_tracking_token,
        'status', v_target_status::TEXT,
        'total_parts', v_final_parts,
        'total_labor', v_final_labor,
        'pickup_fee', v_final_pickup,
        'total_amount', v_final_total,
        'parts_deposit_required', v_final_parts,
        'parts_deposit_paid', (v_final_parts = 0),
        'message', 'Orçamento salvo e sincronizado com sucesso.'
    );
END;
;

GRANT EXECUTE ON FUNCTION public.rpc_save_budget_atomic(INT, UUID, TEXT, TEXT, DECIMAL, DECIMAL, JSONB, TEXT, DECIMAL) TO anon, authenticated, service_role;

-- 3. UPDATE rpc_track_work_order TO RETURN pickup_fee AND total_order
CREATE OR REPLACE FUNCTION public.rpc_track_work_order(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS 
DECLARE
    v_res JSONB;
BEGIN
    SELECT jsonb_build_object(
        'found', true,
        'id', wo.id,
        'os_number', wo.os_number,
        'public_tracking_token', wo.public_tracking_token,
        'status', wo.status,
        'device_brand', wo.device_brand,
        'device_model', wo.device_model,
        'reported_defect', wo.reported_defect,
        'technical_diagnosis', wo.technical_diagnosis,
        'is_pickup_delivery', wo.is_pickup_delivery,
        'pickup_fee', COALESCE(wo.pickup_fee, 0.00),
        'total_parts', COALESCE(wo.total_parts, 0.00),
        'total_labor', COALESCE(wo.total_labor, 0.00),
        'total_order', COALESCE(wo.total_order, wo.total_amount, 0.00),
        'total_amount', COALESCE(wo.total_amount, 0.00),
        'parts_deposit_paid', COALESCE(wo.parts_deposit_paid, false),
        'parts_deposit_status', CASE WHEN COALESCE(wo.parts_deposit_paid, false) THEN 'CONFIRMED' ELSE 'PENDING' END,
        'client_first_name', COALESCE(SPLIT_PART(c.name, ' ', 1), 'Cliente'),
        'client_name', COALESCE(c.name, 'Cliente'),
        'client_whatsapp', COALESCE(c.whatsapp, ''),
        'created_at', wo.created_at,
        'items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', woi.id,
                'item_type', woi.item_type,
                'description', woi.description,
                'unit_price', woi.unit_price,
                'quantity', woi.quantity
            ))
            FROM public.work_order_items woi
            WHERE woi.work_order_id = wo.id
        ), '[]'::jsonb)
    ) INTO v_res
    FROM public.work_orders wo
    LEFT JOIN public.clients c ON wo.client_id = c.id
    WHERE wo.public_tracking_token = p_token;

    IF v_res IS NULL THEN
        RETURN jsonb_build_object('found', false, 'error', 'OS nao encontrada.');
    END IF;

    RETURN v_res;
END;
;

GRANT EXECUTE ON FUNCTION public.rpc_track_work_order(UUID) TO anon, authenticated, service_role;
