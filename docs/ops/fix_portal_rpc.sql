-- ==============================================================================
-- IFL COSTA TECH — RPC DE BUSCA UNIVERSAL & KANBAN INTERATIVO
-- Executar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. RPC de Busca Pública Universal (Aceita Token UUID ou Número #1051)
CREATE OR REPLACE FUNCTION rpc_track_public_work_order(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
    v_token UUID;
    v_num INT;
BEGIN
    IF p_query IS NULL OR length(trim(p_query)) = 0 THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Código de busca não informado.');
    END IF;

    v_clean := trim(p_query);

    -- Caso 1: Se for UUID (Token)
    IF v_clean ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        RETURN rpc_track_work_order(v_clean::UUID);
    END IF;

    -- Caso 2: Se for Número da OS (ex: #1051 ou 1051)
    v_clean := regexp_replace(v_clean, '\D', '', 'g');
    IF length(v_clean) > 0 THEN
        v_num := v_clean::INT;
        SELECT public_tracking_token INTO v_token
        FROM work_orders
        WHERE os_number = v_num
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_token IS NOT NULL THEN
            RETURN rpc_track_work_order(v_token);
        END IF;
    END IF;

    RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Ordem de Serviço não localizada.');
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_public_work_order(TEXT) TO anon, authenticated, service_role;

-- 2. RPC para o Cockpit Admin Listar Todas as OSs no Kanban
CREATE OR REPLACE FUNCTION rpc_get_kanban_work_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN COALESCE((
        SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', wo.id,
                'os_number', wo.os_number,
                'public_tracking_token', wo.public_tracking_token,
                'status', wo.status,
                'device_brand', wo.device_brand,
                'device_model', wo.device_model,
                'reported_defect', wo.reported_defect,
                'client_name', c.name,
                'client_whatsapp', c.whatsapp,
                'total_amount', wo.total_order,
                'created_at', wo.created_at
            ) ORDER BY wo.created_at DESC
        )
        FROM work_orders wo
        JOIN clients c ON c.id = wo.client_id
    ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_kanban_work_orders() TO anon, authenticated, service_role;
