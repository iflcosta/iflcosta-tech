-- ==============================================================================
-- IFL COSTA TECH — CRM ÚNICO & VISÃO 360° DE CLIENTES
-- ==============================================================================

CREATE OR REPLACE FUNCTION rpc_get_clients_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', c.id,
            'name', c.name,
            'whatsapp', c.whatsapp,
            'type', COALESCE(c.type::TEXT, 'B2C'),
            'status', COALESCE(c.status::TEXT, 'Ativo'),
            'email', c.email,
            'document', c.document,
            'street', c.street,
            'number', c.number,
            'neighborhood', c.neighborhood,
            'city', c.city,
            'notes', c.notes,
            'created_at', c.created_at,
            'total_orders', COUNT(wo.id),
            'total_spent', COALESCE(SUM(wo.total_parts + wo.total_labor + COALESCE(wo.pickup_fee, 0.00)), 0.00),
            'last_order_at', MAX(wo.created_at)
        ) ORDER BY c.created_at DESC
    ) INTO v_result
    FROM clients c
    LEFT JOIN work_orders wo ON wo.client_id = c.id
    GROUP BY c.id;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_clients_overview() TO anon, authenticated, service_role;
