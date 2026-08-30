
-- 1. GARANTIR COLUNA total_amount EM work_orders
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS client_whatsapp TEXT DEFAULT '';

-- 2. RECRIAR rpc_track_work_order CANÔNICA
CREATE OR REPLACE FUNCTION public.rpc_track_work_order(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_res JSONB;
BEGIN
    SELECT jsonb_build_object(
        'found', true,
        'id', wo.id,
        'os_number', wo.os_number,
        'public_tracking_token', wo.public_tracking_token,
        'status', wo.status,
        'device_brand', COALESCE(wo.device_brand, 'Equipamento'),
        'device_model', COALESCE(wo.device_model, 'Hardware'),
        'reported_defect', COALESCE(wo.reported_defect, 'Entrada em bancada'),
        'technical_diagnosis', COALESCE(wo.technical_diagnosis, 'Em triagem e diagnóstico'),
        'is_pickup_delivery', COALESCE(wo.is_pickup_delivery, false),
        'total_parts', COALESCE(wo.total_parts, 0.00),
        'total_labor', COALESCE(wo.total_labor, 0.00),
        'total_order', COALESCE(wo.total_amount, wo.total_order, (COALESCE(wo.total_parts, 0.00) + COALESCE(wo.total_labor, 0.00))),
        'total_amount', COALESCE(wo.total_amount, wo.total_order, (COALESCE(wo.total_parts, 0.00) + COALESCE(wo.total_labor, 0.00))),
        'parts_deposit_paid', COALESCE(wo.parts_deposit_paid, false),
        'parts_deposit_status', CASE WHEN COALESCE(wo.parts_deposit_paid, false) THEN 'CONFIRMED' ELSE 'PENDING' END,
        'client_first_name', COALESCE(SPLIT_PART(c.name, ' ', 1), 'Cliente'),
        'client_name', COALESCE(c.name, 'Cliente'),
        'client_whatsapp', COALESCE(c.whatsapp, wo.client_whatsapp, ''),
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
        RETURN jsonb_build_object('found', false, 'error', 'OS não encontrada.');
    END IF;

    RETURN v_res;
END;
$$;

-- 3. RECRIAR rpc_track_work_order_by_number CANÔNICA
CREATE OR REPLACE FUNCTION public.rpc_track_work_order_by_number(p_os_number INT, p_phone TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_phone TEXT;
    v_token UUID;
BEGIN
    v_clean_phone := REGEXP_REPLACE(COALESCE(p_phone, ''), '\D', '', 'g');
    
    SELECT wo.public_tracking_token INTO v_token
    FROM public.work_orders wo
    LEFT JOIN public.clients c ON wo.client_id = c.id
    WHERE wo.os_number = p_os_number
      AND (
          v_clean_phone = '' 
          OR LENGTH(v_clean_phone) < 4 
          OR c.whatsapp LIKE ('%' || v_clean_phone)
          OR wo.client_whatsapp LIKE ('%' || v_clean_phone)
      )
    LIMIT 1;

    IF v_token IS NULL THEN
        RETURN jsonb_build_object('found', false, 'error', 'OS ou telefone não conferem.');
    END IF;

    RETURN public.rpc_track_work_order(v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_track_work_order(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;
