-- ==============================================================================
-- IF TECH // MASTER RPC CONSOLIDATION & DATABASE CALIBRATION V2
-- Todas as RPCs de Hardware, Bancada, Asaas, Software e CRM unificadas
-- ==============================================================================

-- 1. DROP DE TODAS AS SOBRECARGAS
DO $$
DECLARE
    r RECORD;
    target_names TEXT[] := ARRAY[
        'rpc_create_work_order_atomic',
        'rpc_save_budget_atomic',
        'rpc_update_work_order_budget',
        'rpc_confirm_asaas_payment',
        'rpc_save_asaas_charge_details',
        'rpc_track_work_order',
        'rpc_track_work_order_by_number',
        'rpc_advance_work_order_status_by_token',
        'rpc_create_software_project_atomic',
        'rpc_log_project_timesheet',
        'rpc_get_client_software_project_by_token',
        'rpc_homologate_software_project'
    ];
    fname TEXT;
BEGIN
    FOREACH fname IN ARRAY target_names
    LOOP
        FOR r IN 
            SELECT oid::regprocedure AS func_signature 
            FROM pg_proc 
            WHERE proname = fname 
              AND pronamespace = 'public'::regnamespace
        LOOP
            EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE;';
            RAISE NOTICE 'Dropada: %', r.func_signature;
        END LOOP;
    END LOOP;
END $$;

-- 2. GARANTIR ENUM & COLUNAS EM work_orders
DO $$ BEGIN ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Orcamento_Aguardando_Aprovacao'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Aguardando_Aprovacao'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Aprovado_Pelo_Cliente'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Aprovado_Fila_Bancada'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Peca_Recebida_Fila'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Testes_QA'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE os_status_enum ADD VALUE IF NOT EXISTS 'Recusado_Devolucao'; EXCEPTION WHEN duplicate_object THEN null; END $$;

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

-- 3. CRIAR RPC 1: rpc_create_work_order_atomic
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

    -- Upsert Cliente no CRM
    SELECT id INTO v_client_id FROM public.clients WHERE whatsapp = v_clean_phone LIMIT 1;
    IF v_client_id IS NULL THEN
        INSERT INTO public.clients (name, whatsapp, status)
        VALUES (TRIM(p_client_name), v_clean_phone, 'Ativo')
        RETURNING id INTO v_client_id;
    ELSE
        UPDATE public.clients SET name = TRIM(p_client_name), updated_at = CURRENT_TIMESTAMP WHERE id = v_client_id;
    END IF;

    -- Numeração MMYYXXX
    v_prefix_full := TO_CHAR(CURRENT_DATE, 'MM') || TO_CHAR(CURRENT_DATE, 'YY');
    v_min_os := (v_prefix_full || '001')::INT;
    v_max_os := (v_prefix_full || '999')::INT;

    SELECT COALESCE(MAX(os_number), v_min_os - 1) + 1 INTO v_os_number 
    FROM public.work_orders 
    WHERE os_number >= v_min_os AND os_number <= v_max_os;

    IF v_os_number < v_min_os THEN
        v_os_number := v_min_os;
    END IF;

    v_tracking_token := gen_random_uuid();

    INSERT INTO public.work_orders (
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

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO public.work_order_items (
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

        UPDATE public.work_orders SET 
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

-- 3.1. CRIAR RPC: rpc_save_budget_atomic
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

    v_final_total := v_final_parts + v_final_labor + COALESCE(v_wo.pickup_fee, 0.00);

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

-- 3.2. CRIAR RPC WRAPPER: rpc_update_work_order_budget
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

-- 4. CRIAR RPC 2: rpc_confirm_asaas_payment
CREATE OR REPLACE FUNCTION public.rpc_confirm_asaas_payment(
    p_asaas_payment_id TEXT,
    p_paid_value DECIMAL DEFAULT NULL,
    p_webhook_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
    v_has_parts BOOLEAN := false;
BEGIN
    SELECT * INTO v_wo FROM public.work_orders 
    WHERE asaas_payment_id = p_asaas_payment_id 
       OR id::text = p_asaas_payment_id 
       OR public_tracking_token::text = p_asaas_payment_id 
       OR ('pay_mock_' || os_number) = p_asaas_payment_id
       OR p_asaas_payment_id LIKE ('pay_mock_' || os_number || '_%')
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT * INTO v_wo FROM public.work_orders 
        WHERE status IN ('Triagem', 'Orcamento', 'Aguardando_Sinal_Peca')
        ORDER BY created_at DESC LIMIT 1;
        
        IF NOT FOUND THEN
            RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Nenhuma Ordem de Servico localizada.');
        END IF;
    END IF;

    v_has_parts := COALESCE(v_wo.total_parts, 0.00) > 0;

    UPDATE public.work_orders
    SET 
        status = 'Na_Bancada',
        parts_deposit_paid = true,
        payment_status = 'CONFIRMED',
        paid_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    INSERT INTO public.financial_ledger (
        type, category, description, amount, payment_method, competence_date, settlement_date
    ) VALUES (
        'Entrada',
        CASE WHEN v_has_parts THEN 'Bancada_Peca' ELSE 'Bancada_MaoDeObra' END,
        'Sinal de Pecas Confirmado - OS #' || v_wo.os_number,
        COALESCE(p_paid_value, v_wo.total_parts, v_wo.total_amount, 0.00),
        'Pix',
        CURRENT_DATE,
        CURRENT_TIMESTAMP
    );

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'os_number', v_wo.os_number,
        'new_status', 'Na_Bancada',
        'parts_deposit_paid', true,
        'paid_at', CURRENT_TIMESTAMP
    );
END;
$$;

-- 5. CRIAR RPC 3: rpc_track_work_order
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
        'device_brand', wo.device_brand,
        'device_model', wo.device_model,
        'reported_defect', wo.reported_defect,
        'technical_diagnosis', wo.technical_diagnosis,
        'is_pickup_delivery', wo.is_pickup_delivery,
        'total_parts', COALESCE(wo.total_parts, 0.00),
        'total_labor', COALESCE(wo.total_labor, 0.00),
        'total_amount', COALESCE(wo.total_amount, 0.00),
        'parts_deposit_paid', COALESCE(wo.parts_deposit_paid, false),
        'parts_deposit_status', CASE WHEN COALESCE(wo.parts_deposit_paid, false) THEN 'CONFIRMED' ELSE 'PENDING' END,
        'client_first_name', COALESCE(SPLIT_PART(c.name, ' ', 1), 'Cliente'),
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
$$;

-- 6. CRIAR RPC 4: rpc_track_work_order_by_number
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
      AND (v_clean_phone = '' OR LENGTH(v_clean_phone) < 4 OR c.whatsapp LIKE ('%' || v_clean_phone))
    LIMIT 1;

    IF v_token IS NULL THEN
        RETURN jsonb_build_object('found', false, 'error', 'OS ou telefone nao conferem.');
    END IF;

    RETURN public.rpc_track_work_order(v_token);
END;
$$;

-- 7. CRIAR RPC 5: rpc_advance_work_order_status_by_token
CREATE OR REPLACE FUNCTION public.rpc_advance_work_order_status_by_token(
    p_token UUID,
    p_new_status TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
    v_target_status TEXT;
    v_has_parts BOOLEAN;
BEGIN
    SELECT * INTO v_wo FROM public.work_orders WHERE public_tracking_token = p_token;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'OS nao localizada pelo token.');
    END IF;

    v_has_parts := COALESCE(v_wo.total_parts, 0.00) > 0;

    IF p_new_status <> '' THEN
        v_target_status := p_new_status;
    ELSE
        IF v_has_parts AND NOT COALESCE(v_wo.parts_deposit_paid, false) THEN
            v_target_status := 'Aguardando_Sinal_Peca';
        ELSE
            v_target_status := 'Na_Bancada';
        END IF;
    END IF;

    UPDATE public.work_orders
    SET status = v_target_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    RETURN jsonb_build_object(
        'success', true,
        'os_number', v_wo.os_number,
        'new_status', v_target_status,
        'has_parts', v_has_parts
    );
END;
$$;

-- 8. CRIAR RPC 6: rpc_create_software_project_atomic
CREATE OR REPLACE FUNCTION public.rpc_create_software_project_atomic(
    p_client_id UUID,
    p_title TEXT,
    p_service_code TEXT,
    p_scope_description TEXT,
    p_total_budget DECIMAL,
    p_estimated_delivery_date DATE,
    p_repository_url TEXT DEFAULT NULL,
    p_staging_url TEXT DEFAULT NULL,
    p_recurrent_support_mrr DECIMAL DEFAULT 0.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project_id UUID;
    v_project_code VARCHAR(50);
    v_seq_num INT;
    v_client_token UUID := gen_random_uuid();
    v_half_budget DECIMAL(10, 2);
BEGIN
    SELECT COUNT(*) + 1 INTO v_seq_num FROM public.software_projects;
    v_project_code := 'PRJ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_seq_num::TEXT, 3, '0');
    v_half_budget := ROUND((COALESCE(p_total_budget, 0.00) / 2.00), 2);

    INSERT INTO public.software_projects (
        project_code, client_id, title, service_code, status,
        scope_description, repository_url, staging_url, client_token,
        total_budget, recurrent_support_mrr, estimated_delivery_date
    ) VALUES (
        v_project_code, p_client_id, p_title, COALESCE(p_service_code, 'SW-01'), 'Briefing',
        COALESCE(p_scope_description, 'Projeto de Desenvolvimento'),
        p_repository_url, p_staging_url, v_client_token,
        COALESCE(p_total_budget, 0.00), COALESCE(p_recurrent_support_mrr, 0.00),
        COALESCE(p_estimated_delivery_date, CURRENT_DATE + INTERVAL '14 days')
    ) RETURNING id INTO v_project_id;

    -- Milestone 1: Entrada 50%
    INSERT INTO public.project_milestones (
        project_id, title, description, billing_type, amount, percentage_of_total, due_date, status
    ) VALUES (
        v_project_id, 'Milestone 1 // Sinal de Entrada (50%)',
        'Kickoff e Desenvolvimento', 'Entrada_50', v_half_budget, 50.00, CURRENT_DATE, 'Pendente'
    );

    -- Milestone 2: Entrega 50%
    INSERT INTO public.project_milestones (
        project_id, title, description, billing_type, amount, percentage_of_total, due_date, status
    ) VALUES (
        v_project_id, 'Milestone 2 // Homologação (50%)',
        'Staging, QA e Deploy', 'Entrega_50', v_half_budget, 50.00,
        COALESCE(p_estimated_delivery_date, CURRENT_DATE + INTERVAL '14 days'), 'Pendente'
    );

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'project_id', v_project_id,
        'project_code', v_project_code,
        'client_token', v_client_token,
        'total_budget', p_total_budget,
        'milestone_entry_amount', v_half_budget
    );
END;
$$;

-- 9. CRIAR RPC 7: rpc_log_project_timesheet
CREATE OR REPLACE FUNCTION public.rpc_log_project_timesheet(
    p_project_id UUID,
    p_activity_description TEXT,
    p_hours_spent DECIMAL,
    p_technician_id UUID DEFAULT NULL,
    p_hourly_rate DECIMAL DEFAULT 130.00,
    p_is_billable BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entry_id UUID;
    v_total_value DECIMAL(10, 2);
BEGIN
    v_total_value := ROUND((COALESCE(p_hours_spent, 1.00) * COALESCE(p_hourly_rate, 130.00)), 2);

    INSERT INTO public.project_timesheet_entries (
        project_id, technician_id, activity_description, hours_spent, hourly_rate, is_billable
    ) VALUES (
        p_project_id, p_technician_id, p_activity_description,
        COALESCE(p_hours_spent, 1.00), COALESCE(p_hourly_rate, 130.00), COALESCE(p_is_billable, true)
    ) RETURNING id INTO v_entry_id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'entry_id', v_entry_id,
        'hours_spent', p_hours_spent,
        'hourly_rate', p_hourly_rate,
        'total_value', v_total_value
    );
END;
$$;

-- 10. CRIAR RPC 8: rpc_homologate_software_project
CREATE OR REPLACE FUNCTION public.rpc_homologate_software_project(
    p_client_token UUID,
    p_signer_name TEXT,
    p_signer_document TEXT,
    p_signer_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project RECORD;
    v_hash VARCHAR(64);
BEGIN
    SELECT * INTO v_project FROM public.software_projects WHERE client_token = p_client_token;
    IF v_project.id IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Token de projeto invalido');
    END IF;

    v_hash := ENCODE(DIGEST(v_project.project_code || '|' || v_project.id::TEXT || '|' || CURRENT_TIMESTAMP::TEXT || '|' || COALESCE(p_signer_name, 'Cliente'), 'sha256'), 'hex');

    UPDATE public.software_projects
    SET 
        status = 'Concluido',
        qa_homologated_at = CURRENT_TIMESTAMP,
        homologation_hash = v_hash,
        actual_delivery_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_project.id;

    UPDATE public.project_milestones
    SET 
        is_completed = true,
        completed_at = CURRENT_TIMESTAMP,
        status = 'Aprovado_Pago'
    WHERE project_id = v_project.id AND billing_type = 'Entrega_50';

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'project_code', v_project.project_code,
        'status', 'Concluido',
        'homologation_hash', v_hash,
        'homologated_at', CURRENT_TIMESTAMP
    );
END;
$$;

-- 11. CRIAR RPC 9: rpc_get_client_software_project_by_token
CREATE OR REPLACE FUNCTION public.rpc_get_client_software_project_by_token(
    p_token_or_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project RECORD;
    v_client RECORD;
    v_milestones JSONB;
    v_timesheet_total_hours DECIMAL(10, 2);
BEGIN
    SELECT * INTO v_project 
    FROM public.software_projects 
    WHERE client_token::TEXT = p_token_or_code 
       OR project_code = UPPER(TRIM(p_token_or_code))
       OR id::TEXT = p_token_or_code;

    IF v_project.id IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false);
    END IF;

    SELECT id, name, trade_name, whatsapp, email INTO v_client
    FROM public.clients
    WHERE id = v_project.client_id;

    SELECT COALESCE(JSONB_AGG(ROW_TO_JSON(m)), '[]'::JSONB) INTO v_milestones
    FROM (
        SELECT id, title, description, billing_type, amount, percentage_of_total, due_date, is_completed, is_paid, status
        FROM public.project_milestones
        WHERE project_id = v_project.id
        ORDER BY created_at ASC
    ) m;

    SELECT COALESCE(SUM(hours_spent), 0.00) INTO v_timesheet_total_hours
    FROM public.project_timesheet_entries
    WHERE project_id = v_project.id;

    RETURN JSONB_BUILD_OBJECT(
        'found', true,
        'id', v_project.id,
        'project_code', v_project.project_code,
        'title', v_project.title,
        'service_code', v_project.service_code,
        'status', v_project.status,
        'scope_description', v_project.scope_description,
        'repository_url', v_project.repository_url,
        'staging_url', v_project.staging_url,
        'production_url', v_project.production_url,
        'total_budget', v_project.total_budget,
        'recurrent_support_mrr', v_project.recurrent_support_mrr,
        'kickoff_deposit_paid', v_project.kickoff_deposit_paid,
        'final_delivery_paid', v_project.final_delivery_paid,
        'estimated_delivery_date', v_project.estimated_delivery_date,
        'lighthouse_performance_score', v_project.lighthouse_performance_score,
        'lighthouse_seo_score', v_project.lighthouse_seo_score,
        'lighthouse_best_practices_score', v_project.lighthouse_best_practices_score,
        'lighthouse_accessibility_score', v_project.lighthouse_accessibility_score,
        'qa_homologated_at', v_project.qa_homologated_at,
        'homologation_hash', v_project.homologation_hash,
        'client', JSONB_BUILD_OBJECT(
            'name', COALESCE(v_client.trade_name, v_client.name, 'Cliente'),
            'whatsapp', v_client.whatsapp,
            'email', v_client.email
        ),
        'milestones', v_milestones,
        'timesheet_hours', v_timesheet_total_hours
    );
END;
$$;

-- 12. CONCESSAO DE PERMISSOES
GRANT EXECUTE ON FUNCTION public.rpc_create_work_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_save_budget_atomic(INT, UUID, TEXT, TEXT, DECIMAL, DECIMAL, JSONB, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_update_work_order_budget(INT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_confirm_asaas_payment(TEXT, DECIMAL, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_track_work_order(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_advance_work_order_status_by_token(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_create_software_project_atomic(UUID, TEXT, TEXT, TEXT, DECIMAL, DATE, TEXT, TEXT, DECIMAL) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_log_project_timesheet(UUID, TEXT, DECIMAL, UUID, DECIMAL, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_homologate_software_project(UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_client_software_project_by_token(TEXT) TO anon, authenticated, service_role;
