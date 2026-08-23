-- ==============================================================================
-- IFL COSTA TECH — RPC DE BUSCA COM DUPLA CONFIRMAÇÃO (OS + WHATSAPP)
-- Executar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. Rastreamento com Validação de Segurança (Número da OS + WhatsApp)
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
BEGIN
    IF p_os_number IS NULL OR p_phone IS NULL OR length(trim(p_phone)) = 0 THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Número da OS e WhatsApp cadastrado são obrigatórios.');
    END IF;

    v_clean_phone := REGEXP_REPLACE(p_phone, '\D', '', 'g');

    -- Busca o token da OS apenas se o WhatsApp coincidir (completo ou últimos 4 dígitos)
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

    -- Retorna os dados sanitizados da OS
    RETURN rpc_track_work_order(v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;

-- 2. Conceder permissão de execução em rpc_track_work_order por Token Direto
GRANT EXECUTE ON FUNCTION rpc_track_work_order(UUID) TO anon, authenticated, service_role;
