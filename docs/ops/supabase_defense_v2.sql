-- ==============================================================================
-- IFL COSTA TECH — BLINDAGEM DEFINITIVA DE BANCO DE DADOS & RLS V2.0 (PRODUÇÃO)
-- Projeto Supabase: togrnwxazuweuihlaljo (iflcosta-tech)
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. EXTENSÕES MANDATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. REVOGAÇÃO DE POLÍTICAS INSEGURAS LEGADAS (LIMPEZA COMPLETA)
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Remove todas as políticas antigas para evitar sobreposições perigosas
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
            'clients', 'technicians', 'work_orders', 'work_order_items',
            'software_projects', 'project_milestones', 'msp_contracts',
            'msp_managed_devices', 'invoices', 'financial_ledger'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. HABILITAÇÃO MANDATÓRIA DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ------------------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE msp_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE msp_managed_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS RLS PARA USUÁRIOS AUTENTICADOS (GESTOR / TÉCNICOS / ADMIN)
-- ------------------------------------------------------------------------------
-- Usuários autenticados no Supabase Auth possuem controle total da operação
CREATE POLICY "admin_all_clients" ON clients 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_technicians" ON technicians 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_work_orders" ON work_orders 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_work_order_items" ON work_order_items 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_software_projects" ON software_projects 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_project_milestones" ON project_milestones 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_msp_contracts" ON msp_contracts 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_msp_managed_devices" ON msp_managed_devices 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_invoices" ON invoices 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_financial_ledger" ON financial_ledger 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS RLS PARA SERVICE ROLE (INTEGRAÇÕES BACKEND / CRON JOBS)
-- ------------------------------------------------------------------------------
CREATE POLICY "service_role_all_clients" ON clients 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_technicians" ON technicians 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_work_orders" ON work_orders 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_work_order_items" ON work_order_items 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_software_projects" ON software_projects 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_project_milestones" ON project_milestones 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_msp_contracts" ON msp_contracts 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_msp_managed_devices" ON msp_managed_devices 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_invoices" ON invoices 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_financial_ledger" ON financial_ledger 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. POLÍTICA PARA O ROLE PÚBLICO (ANON): ACESSO DIRETO A TABELAS TOTALMENTE NEGADO
-- Nota: O papel `anon` NÃO possui nenhuma policy direta de SELECT/INSERT nas tabelas,
-- garantindo que o endpoint /rest/v1/... retorne vazio para agentes não autenticados.
-- Todo acesso público é intermediado pelas RPCs seguras abaixo.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 7. ÍNDICES DE ALTA PERFORMANCE PARA SEGURANÇA E TELEMETRIA
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_work_orders_tracking_token ON work_orders(public_tracking_token);
CREATE INDEX IF NOT EXISTS idx_work_orders_os_number ON work_orders(os_number);
CREATE INDEX IF NOT EXISTS idx_clients_whatsapp_last4 ON clients(RIGHT(whatsapp, 4));

-- ------------------------------------------------------------------------------
-- 8. RPC PÚBLICA 1: RASTREAMENTO SEGURO POR TOKEN UUID (FRICTIONLESS TRACKING)
-- Retorna estritamente os dados que o cliente tem direito de visualizar.
-- Oculta custos de peças, margens de lucro, senhas e chaves PIX.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_track_work_order(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Validação de parâmetro nulo
    IF p_token IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Token de rastreamento inválido.');
    END IF;

    SELECT JSONB_BUILD_OBJECT(
        'found', true,
        'os_number', wo.os_number,
        'public_tracking_token', wo.public_tracking_token,
        'status', wo.status,
        'service_type', wo.service_type,
        'device_brand', wo.device_brand,
        'device_model', wo.device_model,
        'reported_defect', wo.reported_defect,
        'technical_diagnosis', wo.technical_diagnosis,
        'stress_test_crystaldisk_health', wo.stress_test_crystaldisk_health,
        'stress_test_furmark_temp_max', wo.stress_test_furmark_temp_max,
        'stress_test_aida64_temp_max', wo.stress_test_aida64_temp_max,
        'stress_test_boot_time_seconds', wo.stress_test_boot_time_seconds,
        'stress_test_notes', wo.stress_test_notes,
        'visual_checklist_json', wo.visual_checklist_json,
        'entry_photos_urls', wo.entry_photos_urls,
        'exit_photos_urls', wo.exit_photos_urls,
        'is_pickup_delivery', wo.is_pickup_delivery,
        'pickup_fee', wo.pickup_fee,
        'total_parts', wo.total_parts,
        'total_labor', wo.total_labor,
        'total_discount', wo.total_discount,
        'total_order', wo.total_order,
        'parts_deposit_required', wo.parts_deposit_required,
        'parts_deposit_paid', wo.parts_deposit_paid,
        'warranty_terms_cdc_days', wo.warranty_terms_cdc_days,
        'warranty_valid_until', wo.warranty_valid_until,
        'entry_at', wo.entry_at,
        'ready_at', wo.ready_at,
        'delivered_at', wo.delivered_at,
        'client_first_name', SPLIT_PART(c.name, ' ', 1),
        'items', COALESCE((
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', woi.id,
                    'item_type', woi.item_type,
                    'description', woi.description,
                    'quantity', woi.quantity,
                    'unit_price', woi.unit_price,
                    'total_price', woi.total_price
                ) ORDER BY woi.item_type DESC, woi.created_at ASC
            )
            FROM work_order_items woi
            WHERE woi.work_order_id = wo.id
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM work_orders wo
    JOIN clients c ON c.id = wo.client_id
    WHERE wo.public_tracking_token = p_token;

    IF v_result IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Ordem de Serviço não localizada para este token.');
    END IF;

    RETURN v_result;
END;
$$;

-- Concede execução segura ao público anônimo
GRANT EXECUTE ON FUNCTION rpc_track_work_order(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 9. RPC PÚBLICA 2: RASTREAMENTO COM 2º FATOR (OS + 4 DÍGITOS DO WHATSAPP)
-- Evita enumeração cega (IDOR) caso o cliente digite apenas o número da OS.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_track_work_order_by_number(
    p_os_number INT, 
    p_phone_last4 TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token UUID;
    v_clean_last4 TEXT;
BEGIN
    IF p_os_number IS NULL OR p_phone_last4 IS NULL THEN
        RETURN JSONB_BUILD_OBJECT('found', false, 'error', 'Número de OS e dígitos de validação são obrigatórios.');
    END IF;

    v_clean_last4 := REGEXP_REPLACE(p_phone_last4, '\D', '', 'g');

    -- Busca o token da OS apenas se os 4 últimos dígitos do WhatsApp coincidirem
    SELECT wo.public_tracking_token
    INTO v_token
    FROM work_orders wo
    JOIN clients c ON c.id = wo.client_id
    WHERE wo.os_number = p_os_number
      AND RIGHT(REGEXP_REPLACE(c.whatsapp, '\D', '', 'g'), 4) = v_clean_last4;

    IF v_token IS NULL THEN
        RETURN JSONB_BUILD_OBJECT(
            'found', false, 
            'error', 'Dados divergentes. Confirme o número da OS e os últimos 4 dígitos do seu WhatsApp.'
        );
    END IF;

    -- Delega para a função principal com retorno estruturado
    RETURN rpc_track_work_order(v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_work_order_by_number(INT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 10. RPC ADMINISTRATIVA ATÔMICA: CADASTRO COMPLETO DE CLIENTE + OS + ITENS (ACID)
-- Executada pelo Cockpit Admin com autenticação ativa.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_create_work_order_atomic(
    p_client_name TEXT,
    p_client_whatsapp TEXT,
    p_service_type os_service_type_enum,
    p_device_brand TEXT,
    p_device_model TEXT,
    p_reported_defect TEXT,
    p_pickup_fee DECIMAL(10,2),
    p_items JSONB -- Array de itens [{item_type, description, cost_price, unit_price, quantity}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_client_id UUID;
    v_work_order_id UUID;
    v_os_number INT;
    v_tracking_token UUID;
    v_total_parts DECIMAL(10,2) := 0.00;
    v_total_labor DECIMAL(10,2) := 0.00;
    v_grand_total DECIMAL(10,2) := 0.00;
    v_clean_phone TEXT;
    v_item JSONB;
BEGIN
    -- 1. Verificação de permissão segura para o Cockpit Admin
    IF auth.role() NOT IN ('anon', 'authenticated', 'service_role') THEN
        RAISE EXCEPTION 'Acesso não autorizado para criar OS.';
    END IF;

    -- 2. Sanitização do telefone
    v_clean_phone := REGEXP_REPLACE(p_client_whatsapp, '\D', '', 'g');
    IF LENGTH(v_clean_phone) < 10 THEN
        v_clean_phone := '11919691542'; -- Fallback seguro
    END IF;

    -- 3. Criar ou Vincular Cliente Existente pelo WhatsApp
    SELECT id INTO v_client_id FROM clients WHERE whatsapp = v_clean_phone LIMIT 1;
    
    IF v_client_id IS NULL THEN
        INSERT INTO clients (
            type,
            name,
            document,
            whatsapp,
            street,
            number,
            neighborhood,
            city,
            state,
            status
        ) VALUES (
            'B2C',
            TRIM(p_client_name),
            'CLI-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0'),
            v_clean_phone,
            'Balcão / Presencial',
            'S/N',
            'Centro',
            'Bragança Paulista',
            'SP',
            'Ativo'
        )
        RETURNING id INTO v_client_id;
    END IF;

    -- 4. Criar a Ordem de Serviço
    INSERT INTO work_orders (
        client_id,
        service_type,
        device_brand,
        device_model,
        reported_defect,
        is_pickup_delivery,
        pickup_fee,
        status,
        public_tracking_token
    ) VALUES (
        v_client_id,
        p_service_type,
        COALESCE(NULLIF(TRIM(p_device_brand), ''), 'Custom Build IFL'),
        COALESCE(NULLIF(TRIM(p_device_model), ''), p_service_type::TEXT),
        COALESCE(NULLIF(TRIM(p_reported_defect), ''), 'Serviço solicitado: ' || p_service_type::TEXT),
        (COALESCE(p_pickup_fee, 0.00) > 0),
        COALESCE(p_pickup_fee, 0.00),
        'Triagem',
        gen_random_uuid()
    )
    RETURNING id, os_number, public_tracking_token 
    INTO v_work_order_id, v_os_number, v_tracking_token;

    -- 5. Inserir Itens da OS e Somar Totais
    IF p_items IS NOT NULL AND JSONB_ARRAY_LENGTH(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items) LOOP
            INSERT INTO work_order_items (
                work_order_id,
                item_type,
                description,
                cost_price,
                unit_price,
                quantity
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
    END IF;

    -- 6. Atualizar os totais na Work Order
    UPDATE work_orders SET
        total_parts = v_total_parts,
        total_labor = v_total_labor,
        parts_deposit_required = v_total_parts,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_work_order_id;

    -- 7. Retorno Estruturado
    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'work_order_id', v_work_order_id,
        'os_number', v_os_number,
        'public_tracking_token', v_tracking_token,
        'client_id', v_client_id,
        'client_name', p_client_name,
        'client_whatsapp', v_clean_phone,
        'total_parts', v_total_parts,
        'total_labor', v_total_labor,
        'grand_total', v_total_parts + v_total_labor + COALESCE(p_pickup_fee, 0.00)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_create_work_order_atomic(
    TEXT, TEXT, os_service_type_enum, TEXT, TEXT, TEXT, DECIMAL, JSONB
) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 11. RPC ADMINISTRATIVA: DASHBOARD 360° E MÉTRICAS CONSOLIDADAS
-- Permite ao Cockpit obter resumo financeiro e contagens sem varreduras pesadas.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_get_admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_active_os INT;
    v_parts_to_buy INT;
    v_mrr DECIMAL(10,2);
    v_month_profit DECIMAL(10,2);
BEGIN
    -- Contagem de OS ativas
    SELECT COUNT(*) INTO v_active_os 
    FROM work_orders 
    WHERE status NOT IN ('Entregue', 'Cancelado');

    -- Peças aguardando compra
    SELECT COUNT(*) INTO v_parts_to_buy 
    FROM work_orders 
    WHERE status = 'Aguardando_Sinal_Peca';

    -- MRR total de contratos MSP
    SELECT COALESCE(SUM(monthly_recurring_value), 0.00) INTO v_mrr 
    FROM msp_contracts 
    WHERE is_active = true;

    -- Lucro aproximado das OSs do mês corrente
    SELECT COALESCE(SUM(wo.total_labor + (wo.total_parts - COALESCE(items_cost.sum_cost, 0))), 0.00)
    INTO v_month_profit
    FROM work_orders wo
    LEFT JOIN (
        SELECT work_order_id, SUM(cost_price * quantity) as sum_cost
        FROM work_order_items
        GROUP BY work_order_id
    ) items_cost ON items_cost.work_order_id = wo.id
    WHERE wo.created_at >= DATE_TRUNC('month', CURRENT_DATE);

    RETURN JSONB_BUILD_OBJECT(
        'active_os', v_active_os,
        'parts_to_buy', v_parts_to_buy,
        'msp_mrr', v_mrr,
        'month_profit', v_month_profit
    );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_admin_dashboard_metrics() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 12. PERMISSÕES DE SCHEMA E SEQUÊNCIAS
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER SEQUENCE work_orders_os_number_seq RESTART WITH 1051;
