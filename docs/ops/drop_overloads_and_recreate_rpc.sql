-- ==============================================================================
-- DROPAR TODAS AS SOBRECARGAS DE rpc_create_work_order_atomic
-- ==============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure AS func_signature 
        FROM pg_proc 
        WHERE proname = 'rpc_create_work_order_atomic' 
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE;';
        RAISE NOTICE 'Dropada funcao: %', r.func_signature;
    END LOOP;
END $$;

-- ==============================================================================
-- CRIAR FUNCAO CANÔNICA ÚNICA (SEM SOBRECARGA) NO FORMATO MMYYXXX
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_create_work_order_atomic(
    p_client_name TEXT,
    p_client_whatsapp TEXT,
    p_service_type TEXT DEFAULT 'Hardware_Reparo',
    p_device_brand TEXT DEFAULT 'Equipamento',
    p_device_model TEXT DEFAULT 'Hardware',
    p_reported_defect TEXT DEFAULT 'Entrada em triagem técnica',
    p_pickup_fee DECIMAL DEFAULT 0.00,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_device_serial TEXT DEFAULT '',
    p_device_access_pin TEXT DEFAULT ''
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
    v_service_enum os_service_type_enum := 'Hardware_Reparo';
    v_prefix_full TEXT;
    v_min_os INT;
    v_max_os INT;
BEGIN
    v_clean_phone := REGEXP_REPLACE(p_client_whatsapp, '\D', '', 'g');
    IF length(v_clean_phone) = 0 THEN
        v_clean_phone := '11999999999';
    END IF;

    BEGIN
        v_service_enum := p_service_type::os_service_type_enum;
    EXCEPTION WHEN OTHERS THEN
        v_service_enum := 'Hardware_Reparo';
    END;

    -- Upsert do Cliente no CRM
    SELECT id INTO v_client_id FROM clients WHERE whatsapp = v_clean_phone LIMIT 1;
    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, whatsapp, status)
        VALUES (TRIM(p_client_name), v_clean_phone, 'Ativo')
        RETURNING id INTO v_client_id;
    ELSE
        UPDATE clients SET name = TRIM(p_client_name), updated_at = CURRENT_TIMESTAMP WHERE id = v_client_id;
    END IF;

    -- Geração do número de OS no formato MMYYXXX (ex: 0826001)
    v_prefix_full := TO_CHAR(CURRENT_DATE, 'MM') || TO_CHAR(CURRENT_DATE, 'YY');
    v_min_os := (v_prefix_full || '001')::INT;
    v_max_os := (v_prefix_full || '999')::INT;

    SELECT COALESCE(MAX(os_number), v_min_os - 1) + 1 INTO v_os_number 
    FROM work_orders 
    WHERE os_number >= v_min_os AND os_number <= v_max_os;

    IF v_os_number < v_min_os THEN
        v_os_number := v_min_os;
    END IF;

    v_tracking_token := gen_random_uuid();

    -- Inserção da Ordem de Serviço
    INSERT INTO work_orders (
        client_id, os_number, service_type, device_brand, device_model,
        device_serial, device_access_pin, reported_defect, status, 
        public_tracking_token, is_pickup_delivery, pickup_fee
    ) VALUES (
        v_client_id, v_os_number, v_service_enum,
        COALESCE(NULLIF(TRIM(p_device_brand), ''), 'Equipamento'),
        COALESCE(NULLIF(TRIM(p_device_model), ''), 'Hardware IFL'),
        COALESCE(NULLIF(TRIM(p_device_serial), ''), ''),
        COALESCE(NULLIF(TRIM(p_device_access_pin), ''), ''),
        COALESCE(NULLIF(TRIM(p_reported_defect), ''), 'Entrada em triagem técnica'),
        'Triagem', v_tracking_token, (COALESCE(p_pickup_fee, 0.00) > 0), COALESCE(p_pickup_fee, 0.00)
    ) RETURNING id INTO v_work_order_id;

    -- Inserção de Peças/Mão de Obra se houver
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

        UPDATE work_orders SET 
            total_parts = v_total_parts,
            total_labor = v_total_labor,
            total_amount = v_total_parts + v_total_labor + COALESCE(pickup_fee, 0.00)
        WHERE id = v_work_order_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'work_order_id', v_work_order_id,
        'os_number', v_os_number,
        'formatted_os_number', LPAD(v_os_number::text, 7, '0'),
        'public_tracking_token', v_tracking_token,
        'client_id', v_client_id,
        'message', 'OS criada com sucesso no formato MMYYXXX'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;
