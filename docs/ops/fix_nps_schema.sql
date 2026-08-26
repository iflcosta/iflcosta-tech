
-- ==============================================================================
-- IF TECH — AVALIAÇÕES / NPS & FEEDBACK DO CLIENTE
-- ==============================================================================
ALTER TABLE work_orders 
    ADD COLUMN IF NOT EXISTS customer_rating INT,
    ADD COLUMN IF NOT EXISTS customer_feedback TEXT,
    ADD COLUMN IF NOT EXISTS customer_reviewed_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION rpc_submit_customer_review(
    p_token UUID,
    p_rating INT,
    p_feedback TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
BEGIN
    SELECT * INTO v_wo FROM work_orders WHERE public_tracking_token = p_token;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'OS não encontrada.');
    END IF;

    UPDATE work_orders
    SET 
        customer_rating = p_rating,
        customer_feedback = p_feedback,
        customer_reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN JSONB_BUILD_OBJECT('success', true, 'os_number', v_wo.os_number);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_submit_customer_review(UUID, INT, TEXT) TO anon, authenticated, service_role;
