-- ==============================================================================
-- IF TECH — SPRINT 2: MOTOR FINANCEIRO ASAAS & CONCILIAÇÃO DE PAGAMENTOS
-- Arquivo: docs/ops/sprint2_asaas_payments_schema.sql
-- Projeto: togrnwxazuweuihlaljo (iflcosta-tech)
-- Compatível com: Sandbox Asaas & Produção (Pix Dinâmico + Cartão até 12x)
-- ==============================================================================

-- 1. GARANTE A CRIAÇÃO DE ENUMS DE PAGAMENTO
DO $$ BEGIN
    CREATE TYPE asaas_payment_status_enum AS ENUM (
        'PENDING',
        'RECEIVED',
        'CONFIRMED',
        'OVERDUE',
        'REFUNDED',
        'RECEIVED_IN_CASH'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE asaas_billing_type_enum AS ENUM (
        'PIX',
        'CREDIT_CARD',
        'DEBIT_CARD',
        'BOLETO',
        'UNDEFINED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. CRIAÇÃO DA TABELA DE PAGAMENTOS (PAYMENTS)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    pos_sale_id UUID,
    
    -- Identificadores Oficiais do Gateway Asaas
    asaas_payment_id VARCHAR(100) UNIQUE,
    asaas_customer_id VARCHAR(100),
    asaas_invoice_url TEXT,
    
    -- Dados da Cobrança
    billing_type asaas_billing_type_enum NOT NULL DEFAULT 'PIX',
    payment_purpose VARCHAR(50) NOT NULL DEFAULT 'Sinal_Pecas', -- 'Sinal_Pecas', 'Valor_Total_OS', 'Venda_PDV', 'Mensalidade_MSP'
    value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
    net_value DECIMAL(10, 2), -- Valor líquido descontando taxa Asaas
    status asaas_payment_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Dados do Pix Dinâmico
    pix_qr_code_base64 TEXT,
    pix_copy_paste TEXT,
    pix_expiration_date TIMESTAMP WITH TIME ZONE,
    
    -- Dados do Cartão de Crédito
    credit_card_brand VARCHAR(50),
    credit_card_last_digits VARCHAR(4),
    installments_count INT DEFAULT 1,
    
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    confirmed_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    raw_webhook_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_wo ON public.payments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_id ON public.payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 3. ADIÇÃO DE COLUNAS DE RASTREAMENTO DIRETO NA TABELA WORK_ORDERS
DO $$ BEGIN
    ALTER TABLE public.work_orders 
    ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pix_qr_code_base64 TEXT,
    ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
    ADD COLUMN IF NOT EXISTS pix_expiration_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS parts_deposit_required DECIMAL(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS parts_deposit_paid BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 4. RPC ATÔMICA: REGISTRAR OU ATUALIZAR COBRANÇA ASAAS NA OS
CREATE OR REPLACE FUNCTION public.rpc_save_asaas_charge_details(
    p_os_number INT,
    p_asaas_payment_id TEXT,
    p_asaas_customer_id TEXT,
    p_pix_copy_paste TEXT,
    p_pix_qr_code_base64 TEXT,
    p_value DECIMAL,
    p_purpose TEXT DEFAULT 'Sinal_Pecas',
    p_invoice_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wo RECORD;
    v_payment_id UUID;
BEGIN
    SELECT * INTO v_wo FROM public.work_orders WHERE os_number = p_os_number;
    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'OS não encontrada.');
    END IF;

    -- Atualiza a tabela principal da OS
    UPDATE public.work_orders
    SET 
        asaas_payment_id = p_asaas_payment_id,
        asaas_customer_id = COALESCE(p_asaas_customer_id, asaas_customer_id),
        pix_copy_paste = p_pix_copy_paste,
        pix_qr_code_base64 = p_pix_qr_code_base64,
        payment_status = 'PENDING',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    -- Registra ou atualiza na tabela payments
    INSERT INTO public.payments (
        work_order_id,
        client_id,
        asaas_payment_id,
        asaas_customer_id,
        asaas_invoice_url,
        billing_type,
        payment_purpose,
        value,
        status,
        pix_copy_paste,
        pix_qr_code_base64,
        due_date
    ) VALUES (
        v_wo.id,
        v_wo.client_id,
        p_asaas_payment_id,
        p_asaas_customer_id,
        p_invoice_url,
        'PIX',
        p_purpose,
        p_value,
        'PENDING',
        p_pix_copy_paste,
        p_pix_qr_code_base64,
        CURRENT_DATE
    )
    ON CONFLICT (asaas_payment_id) DO UPDATE SET
        pix_copy_paste = EXCLUDED.pix_copy_paste,
        pix_qr_code_base64 = EXCLUDED.pix_qr_code_base64,
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_payment_id;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'os_number', v_wo.os_number,
        'payment_id', v_payment_id,
        'asaas_payment_id', p_asaas_payment_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_save_asaas_charge_details(INT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. RPC ATÔMICA: CONFIRMAÇÃO DE PAGAMENTO (WEBHOOK ASAAS OU SIMULAÇÃO)
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
    v_payment RECORD;
    v_wo RECORD;
    v_new_status os_status_enum;
    v_has_parts BOOLEAN := false;
BEGIN
    SELECT * INTO v_payment FROM public.payments WHERE asaas_payment_id = p_asaas_payment_id;
    
    -- Fallback se não encontrar pelo asaas_payment_id na tabela payments, busca direto na work_orders
    IF NOT FOUND THEN
        SELECT * INTO v_wo FROM public.work_orders WHERE asaas_payment_id = p_asaas_payment_id;
        IF NOT FOUND THEN
            RETURN JSONB_BUILD_OBJECT('success', false, 'error', 'Cobrança Asaas não localizada.');
        END IF;
    ELSE
        SELECT * INTO v_wo FROM public.work_orders WHERE id = v_payment.work_order_id;
    END IF;

    -- Verifica se tem peças
    v_has_parts := COALESCE(v_wo.total_parts, 0.00) > 0;

    -- Define o próximo status da máquina de estados
    IF v_has_parts THEN
        v_new_status := 'Peca_Encomendada';
    ELSE
        v_new_status := 'Aprovado_Fila_Bancada';
    END IF;

    -- 1. Atualiza a Work Order
    UPDATE public.work_orders
    SET 
        status = v_new_status,
        parts_deposit_paid = true,
        payment_status = 'CONFIRMED',
        paid_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wo.id;

    -- 2. Atualiza a Tabela de Pagamentos
    IF v_payment.id IS NOT NULL THEN
        UPDATE public.payments
        SET 
            status = 'CONFIRMED',
            paid_at = CURRENT_TIMESTAMP,
            confirmed_date = CURRENT_TIMESTAMP,
            raw_webhook_payload = p_webhook_payload,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_payment.id;
    END IF;

    -- 3. Alimenta o Livro Caixa (financial_ledger)
    INSERT INTO public.financial_ledger (
        type,
        category,
        description,
        amount,
        payment_method,
        competence_date,
        settlement_date
    ) VALUES (
        'Entrada',
        CASE WHEN v_has_parts THEN 'Bancada_Peca' ELSE 'Bancada_MaoDeObra' END,
        'Pagamento Confirmado Asaas - OS #' || v_wo.os_number || ' (' || COALESCE(v_payment.payment_purpose, 'Sinal') || ')',
        COALESCE(p_paid_value, v_payment.value, v_wo.parts_deposit_required, v_wo.total_parts, v_wo.total_amount),
        'Pix',
        CURRENT_DATE,
        CURRENT_TIMESTAMP
    );

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'os_number', v_wo.os_number,
        'new_status', v_new_status::TEXT,
        'has_parts', v_has_parts,
        'parts_deposit_paid', true,
        'paid_at', CURRENT_TIMESTAMP
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_confirm_asaas_payment(TEXT, DECIMAL, JSONB) TO anon, authenticated, service_role;
