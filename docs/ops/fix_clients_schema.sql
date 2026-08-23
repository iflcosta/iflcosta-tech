-- ==============================================================================
-- IFL COSTA TECH — FIX SCHEMA TABELA CLIENTS & CHECK-IN RÁPIDO (PRODUÇÃO)
-- Flexibiliza colunas cadastrais para permitir Check-in em 30 segundos
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. FLEXIBILIZAÇÃO DA TABELA CLIENTS (CAMPOS OPCIONAIS NO CHECK-IN RÁPIDO)
ALTER TABLE clients ALTER COLUMN document DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN street DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN number DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN neighborhood DROP NOT NULL;

-- Garante compatibilidade de nomes de coluna se type ou client_type forem referenciados
DO $$ BEGIN
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS type client_type_enum DEFAULT 'B2C';
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 2. RECRIAR RPC ATÔMICA DE ENTRADA / CRIAÇÃO DE OS COMPATÍVEL COM TABELA CLIENTS
CREATE OR REPLACE FUNCTION rpc_create_work_order_atomic(
    p_client_name TEXT,
    p_client_whatsapp TEXT,
    p_service_type TEXT,
    p_device_brand TEXT,
    p_device_model TEXT,
    p_reported_defect TEXT,
    p_pickup_fee DECIMAL DEFAULT 0.00,
    p_items JSONB DEFAULT '[]'::jsonb
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
    v_target_status os_status_enum := 'Triagem';
BEGIN
    -- Limpa telefone mantendo apenas números
    v_clean_phone := REGEXP_REPLACE(p_client_whatsapp, '\D', '', 'g');
    IF length(v_clean_phone) = 0 THEN
        v_clean_phone := '11999999999';
    END IF;

    -- 1. Localiza ou cadastra o cliente no CRM Único
    SELECT id INTO v_client_id FROM clients WHERE whatsapp = v_clean_phone LIMIT 1;
    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, whatsapp, type, status)
        VALUES (p_client_name, v_clean_phone, 'B2C', 'Ativo')
        RETURNING id INTO v_client_id;
    ELSE
        -- Atualiza nome do cliente se mudou
        UPDATE clients SET name = p_client_name WHERE id = v_client_id;
    END IF;

    -- 2. Gera o próximo número de OS sequencial e token UUID seguro
    SELECT COALESCE(MAX(os_number), 1050) + 1 INTO v_os_number FROM work_orders;
    v_tracking_token := gen_random_uuid();

    -- 3. Cria a Ordem de Serviço na tabela work_orders
    INSERT INTO work_orders (
        client_id, os_number, service_type, device_brand, device_model,
        reported_defect, status, public_tracking_token, is_pickup_delivery, pickup_fee
    ) VALUES (
        v_client_id, v_os_number, 'Hardware_Reparo', p_device_brand, p_device_model,
        p_reported_defect, 'Triagem', v_tracking_token, (p_pickup_fee > 0), p_pickup_fee
    ) RETURNING id INTO v_work_order_id;

    -- 4. Processa itens/peças iniciais se fornecidos
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

        IF v_total_parts > 0 THEN
            v_target_status := 'Aguardando_Sinal_Peca';
        ELSE
            v_target_status := 'Diagnostico_Concluido';
        END IF;

        UPDATE work_orders SET
            status = v_target_status,
            total_parts = v_total_parts,
            total_labor = v_total_labor,
            parts_deposit_required = v_total_parts,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_work_order_id;
    END IF;

    -- 5. Retorno estruturado para o frontend
    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'work_order_id', v_work_order_id,
        'os_number', v_os_number,
        'public_tracking_token', v_tracking_token,
        'client_id', v_client_id,
        'status', v_target_status::TEXT,
        'total_parts', v_total_parts,
        'total_labor', v_total_labor,
        'grand_total', v_total_parts + v_total_labor + COALESCE(p_pickup_fee, 0.00)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB) TO anon, authenticated, service_role;
