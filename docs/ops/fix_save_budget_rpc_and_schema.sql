-- ==============================================================================
-- IF TECH — CORREÇÃO CRÍTICA DO ORÇAMENTO (BUDGET) & ATOMICIDADE NO SUPABASE
-- Resolve erro HTTP 400 Bad Request no PATCH /work_orders
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. EXPANSÃO DO ENUM DE STATUS DA ORDEM DE SERVIÇO (os_status_enum)
-- Garante que todos os estados utilizados no frontend, portal e cockpit sejam aceitos
DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Triagem';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Orcamento_Aguardando_Aprovacao';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Aguardando_Aprovacao';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Aguardando_Sinal_Peca';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Peca_Encomendada';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Peca_Recebida_Fila';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Aprovado_Fila_Bancada';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Aprovado_Pelo_Cliente';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Diagnostico_Concluido';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Diagnostico_Em_Andamento';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Na_Bancada';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Teste_Estresse_QA';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Testes_QA';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Pronto';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Entregue';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Cancelado';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Recusado_Devolucao';
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 2. GARANTIR TODAS AS COLUNAS SUPORTADAS EM public.work_orders
-- Evita erros 400 em chamadas diretas .update() que contenham total_amount ou parts_deposit_status
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS parts_deposit_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS device_serial TEXT DEFAULT '';
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS device_access_pin TEXT DEFAULT '';
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS pix_qr_code_url TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS parts_deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS acquisition_channel TEXT DEFAULT 'Balcao_Presencial';


-- 3. DROP DE ASSINATURAS ANTERIORES PARA EVITAR AMBIGUIDADE
DROP FUNCTION IF EXISTS public.rpc_save_budget_atomic(INT, UUID, TEXT, TEXT, DECIMAL, DECIMAL, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.rpc_save_budget_atomic(INT, TEXT, TEXT, DECIMAL, DECIMAL, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.rpc_save_budget_atomic(INT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.rpc_update_work_order_budget(INT, JSONB);


-- 4. CRIAÇÃO DA RPC CANÔNICA: rpc_save_budget_atomic
CREATE OR REPLACE FUNCTION public.rpc_save_budget_atomic(
    p_os_number INT DEFAULT NULL,
    p_work_order_id UUID DEFAULT NULL,
    p_service_type TEXT DEFAULT 'Hardware_Reparo',
    p_technical_diagnosis TEXT DEFAULT '',
    p_total_labor DECIMAL DEFAULT 0.00,
    p_total_parts DECIMAL DEFAULT 0.00,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_status TEXT DEFAULT 'Orcamento_Aguardando_Aprovacao'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
    v_item JSONB;
    v_calc_parts DECIMAL(10,2) := 0.00;
    v_calc_labor DECIMAL(10,2) := 0.00;
    v_final_parts DECIMAL(10,2);
    v_final_labor DECIMAL(10,2);
    v_final_total DECIMAL(10,2);
    v_service_enum os_service_type_enum;
    v_target_status os_status_enum;
    v_has_items BOOLEAN := false;
BEGIN
    -- 1. Localizar Ordem de Serviço
    IF p_work_order_id IS NOT NULL THEN
        SELECT * INTO v_wo FROM public.work_orders WHERE id = p_work_order_id LIMIT 1;
    ELSIF p_os_number IS NOT NULL THEN
        SELECT * INTO v_wo FROM public.work_orders WHERE os_number = p_os_number LIMIT 1;
    END IF;

    IF v_wo IS NULL OR NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ordem de Serviço não localizada pelos identificadores informados.'
        );
    END IF;

    -- 2. Tratar Enum de Tipo de Serviço
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

    -- 3. Inserir/Atualizar Itens na Tabela Filha work_order_items
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
                    work_order_id,
                    item_type,
                    description,
                    cost_price,
                    unit_price,
                    quantity
                ) VALUES (
                    v_wo.id,
                    v_itype,
                    v_desc,
                    v_cost,
                    v_price,
                    v_qty
                );

                IF v_itype = 'Labor' OR v_itype ILIKE '%mao%' OR v_itype ILIKE '%mão%' OR v_itype ILIKE '%servico%' OR v_itype ILIKE '%serviço%' THEN
                    v_calc_labor := v_calc_labor + (v_price * v_qty);
                ELSE
                    v_calc_parts := v_calc_parts + (v_price * v_qty);
                END IF;
            END;
        END LOOP;
    END IF;

    -- Determina totais finais
    IF v_has_items THEN
        v_final_parts := v_calc_parts;
        v_final_labor := CASE WHEN v_calc_labor > 0 THEN v_calc_labor ELSE COALESCE(p_total_labor, 0.00) END;
    ELSE
        v_final_parts := COALESCE(p_total_parts, 0.00);
        v_final_labor := COALESCE(p_total_labor, 0.00);
    END IF;

    v_final_total := v_final_parts + v_final_labor + COALESCE(v_wo.pickup_fee, 0.00);

    -- 4. Tratar Enum de Status
    BEGIN
        v_target_status := p_status::os_status_enum;
    EXCEPTION WHEN OTHERS THEN
        IF v_final_parts > 0 THEN
            v_target_status := 'Aguardando_Sinal_Peca'::os_status_enum;
        ELSE
            v_target_status := 'Diagnostico_Concluido'::os_status_enum;
        END IF;
    END;

    -- 5. Atualizar Registro Principal em public.work_orders
    UPDATE public.work_orders
    SET 
        service_type = COALESCE(v_service_enum, service_type),
        technical_diagnosis = COALESCE(NULLIF(TRIM(p_technical_diagnosis), ''), technical_diagnosis),
        status = v_target_status,
        total_parts = v_final_parts,
        total_labor = v_final_labor,
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
        'total_amount', v_final_total,
        'parts_deposit_required', v_final_parts,
        'parts_deposit_paid', (v_final_parts = 0),
        'message', 'Orçamento salvo e sincronizado com sucesso.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_save_budget_atomic(INT, UUID, TEXT, TEXT, DECIMAL, DECIMAL, JSONB, TEXT) TO anon, authenticated, service_role;


-- 5. WRAPPER DE COMPATIBILIDADE LEGADA: rpc_update_work_order_budget
CREATE OR REPLACE FUNCTION public.rpc_update_work_order_budget(
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
BEGIN
    RETURN public.rpc_save_budget_atomic(
        p_os_number := p_os_number,
        p_service_type := p_service_type,
        p_technical_diagnosis := p_diagnosis,
        p_items := p_items,
        p_status := 'Orcamento_Aguardando_Aprovacao'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
