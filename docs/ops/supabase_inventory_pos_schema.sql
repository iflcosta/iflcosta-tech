-- ==============================================================================
-- IF TECH — SPRINT 3: MOTOR DE ESTOQUE, PDV CAIXA RÁPIDO & RASTREAMENTO SERIAL (RMA)
-- Arquivo: docs/ops/supabase_inventory_pos_schema.sql
-- Projeto: togrnwxazuweuihlaljo (iflcosta-tech)
-- Compatível com: Supabase PostgreSQL 15+, RLS CISO Defense, Protocolo ESC/POS Térmico
-- ==============================================================================

-- 1. ENUMS CANÔNICOS DE ESTOQUE E PDV
DO $$ BEGIN
    CREATE TYPE pos_payment_method_enum AS ENUM (
        'Pix',
        'Cartao_Credito',
        'Cartao_Debito',
        'Dinheiro',
        'Boleto_Faturado'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE serial_status_enum AS ENUM (
        'In_Stock',
        'Reserved_OS',
        'Sold_OS',
        'Sold_POS',
        'RMA_Supplier',
        'Defective_Scrap'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE kardex_movement_type_enum AS ENUM (
        'Entrada_Nota_Fiscal',
        'Entrada_Cadastro_Produto',
        'Entrada_Ajuste_Inventario',
        'Saida_PDV_Balcao',
        'Saida_Ordem_Servico',
        'Saida_Ajuste_Inventario',
        'Estorno_Cancelamento',
        'Retorno_RMA_Fornecedor'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABELA CENTRAL DE PRODUTOS & MERCADORIAS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(60) NOT NULL UNIQUE,
    ean VARCHAR(30),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Geral',
    brand VARCHAR(100) NOT NULL DEFAULT 'Distribuidor',
    description TEXT,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock INT NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    min_stock INT NOT NULL DEFAULT 2 CHECK (min_stock >= 0),
    reorder_point INT NOT NULL DEFAULT 4 CHECK (reorder_point >= min_stock),
    location_shelf VARCHAR(50) DEFAULT 'Gaveta 01',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_ean ON public.products(ean);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- 3. TABELA DE RASTREAMENTO SERIAL UNITÁRIO (GARANTIA / RMA REVERSA)
CREATE TABLE IF NOT EXISTS public.inventory_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_name VARCHAR(150) NOT NULL DEFAULT 'Distribuidor Nacional',
    invoice_number VARCHAR(100),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    warranty_months INT NOT NULL DEFAULT 12 CHECK (warranty_months >= 0),
    status serial_status_enum NOT NULL DEFAULT 'In_Stock',
    
    -- Vínculos de Saída
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    pos_sale_id UUID,
    client_name VARCHAR(150),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_serials_sn ON public.inventory_serials(serial_number);
CREATE INDEX IF NOT EXISTS idx_serials_status ON public.inventory_serials(status);
CREATE INDEX IF NOT EXISTS idx_serials_wo ON public.inventory_serials(work_order_id);
CREATE INDEX IF NOT EXISTS idx_serials_product ON public.inventory_serials(product_id);

-- 4. TABELA DE VENDAS DO PDV (CUPONS DE BALCÃO)
CREATE TABLE IF NOT EXISTS public.pos_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number VARCHAR(50) NOT NULL UNIQUE,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    profit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_method pos_payment_method_enum NOT NULL DEFAULT 'Pix',
    cash_received DECIMAL(10, 2) DEFAULT 0.00,
    cash_change DECIMAL(10, 2) DEFAULT 0.00,
    client_name VARCHAR(150) DEFAULT 'CONSUMIDOR FINAL',
    client_document VARCHAR(30),
    operator_name VARCHAR(100) DEFAULT 'Balcão Loja',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_number ON public.pos_sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created ON public.pos_sales(created_at);

-- 5. TABELA DE ITENS DA VENDA DO PDV
CREATE TABLE IF NOT EXISTS public.pos_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pos_sale_id UUID NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku VARCHAR(60) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    serial_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pos_items_sale ON public.pos_sale_items(pos_sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_items_product ON public.pos_sale_items(product_id);

-- 6. LIVRO KARDEX DE MOVIMENTAÇÕES CONTÁBEIS AUDITÁVEIS
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku VARCHAR(60) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    movement_type kardex_movement_type_enum NOT NULL,
    quantity INT NOT NULL, -- Positivo para entradas, negativo para saídas
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    doc_reference VARCHAR(150) NOT NULL, -- Ex: 'NF-e #49102', 'OS #1050', 'Cupom PDV-2026-1042'
    operator_name VARCHAR(100) NOT NULL DEFAULT 'Gestor IF Tech',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kardex_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_kardex_sku ON public.inventory_movements(sku);
CREATE INDEX IF NOT EXISTS idx_kardex_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_kardex_created ON public.inventory_movements(created_at);

-- 7. RPC 1: PROCESSAMENTO ATÔMICO DE VENDA DO PDV CAIXA RÁPIDO
CREATE OR REPLACE FUNCTION public.rpc_process_pos_sale(
    p_sale_number TEXT,
    p_subtotal DECIMAL,
    p_discount DECIMAL,
    p_total DECIMAL,
    p_payment_method TEXT,
    p_cash_received DECIMAL,
    p_cash_change DECIMAL,
    p_client_name TEXT,
    p_operator TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
    v_prod_id UUID;
    v_curr_stock INT;
    v_cost_price DECIMAL(10, 2);
    v_total_cost_calc DECIMAL(10, 2) := 0.00;
    v_profit_calc DECIMAL(10, 2);
BEGIN
    -- 1. Validações preliminares
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'O carrinho de venda está vazio.';
    END IF;

    -- 2. Inserção do Cabeçalho da Venda no PDV
    INSERT INTO public.pos_sales (
        sale_number,
        subtotal,
        discount,
        total_amount,
        total_cost,
        profit,
        payment_method,
        cash_received,
        cash_change,
        client_name,
        operator_name
    ) VALUES (
        p_sale_number,
        p_subtotal,
        p_discount,
        p_total,
        0.00,
        0.00,
        p_payment_method::pos_payment_method_enum,
        p_cash_received,
        p_cash_change,
        COALESCE(p_client_name, 'CONSUMIDOR FINAL'),
        COALESCE(p_operator, 'Balcão Loja')
    )
    RETURNING id INTO v_sale_id;

    -- 3. Iteração e Baixa Atômica dos Itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
        id UUID,
        sku TEXT,
        name TEXT,
        qty INT,
        price DECIMAL,
        cost DECIMAL,
        serial_number TEXT
    ) LOOP
        -- Busca produto e trava linha para controle de concorrência
        SELECT p.id, p.current_stock, p.cost_price 
        INTO v_prod_id, v_curr_stock, v_cost_price
        FROM public.products p
        WHERE p.sku = v_item.sku OR p.id = v_item.id
        FOR UPDATE;

        IF v_prod_id IS NOT NULL THEN
            IF v_curr_stock < v_item.qty THEN
                RAISE EXCEPTION 'Saldo insuficiente para o produto % (SKU: %). Saldo atual: %, Solicitado: %', 
                    v_item.name, v_item.sku, v_curr_stock, v_item.qty;
            END IF;

            -- Baixa física no estoque
            UPDATE public.products 
            SET current_stock = current_stock - v_item.qty,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_prod_id;

            -- Kardex de Saída
            INSERT INTO public.inventory_movements (
                product_id,
                sku,
                product_name,
                movement_type,
                quantity,
                unit_cost,
                total_cost,
                doc_reference,
                operator_name
            ) VALUES (
                v_prod_id,
                v_item.sku,
                v_item.name,
                'Saida_PDV_Balcao',
                -v_item.qty,
                v_cost_price,
                v_cost_price * v_item.qty,
                'Cupom ' || p_sale_number,
                COALESCE(p_operator, 'Balcão Loja')
            );

            v_total_cost_calc := v_total_cost_calc + (v_cost_price * v_item.qty);

            -- Se houver Número de Série vinculado, atualiza status
            IF v_item.serial_number IS NOT NULL AND TRIM(v_item.serial_number) <> '' THEN
                UPDATE public.inventory_serials
                SET status = 'Sold_POS',
                    pos_sale_id = v_sale_id,
                    client_name = COALESCE(p_client_name, 'CONSUMIDOR FINAL'),
                    updated_at = CURRENT_TIMESTAMP
                WHERE serial_number = v_item.serial_number;
            END IF;
        END IF;

        -- Inserção do Item na Venda
        INSERT INTO public.pos_sale_items (
            pos_sale_id,
            product_id,
            sku,
            product_name,
            quantity,
            cost_price,
            unit_price,
            total_price,
            serial_number
        ) VALUES (
            v_sale_id,
            v_prod_id,
            v_item.sku,
            v_item.name,
            v_item.qty,
            COALESCE(v_cost_price, v_item.cost),
            v_item.price,
            v_item.price * v_item.qty,
            v_item.serial_number
        );
    END LOOP;

    -- 4. Atualiza custo e lucro da venda
    v_profit_calc := p_total - v_total_cost_calc;
    UPDATE public.pos_sales
    SET total_cost = v_total_cost_calc,
        profit = v_profit_calc
    WHERE id = v_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'pos_sale_id', v_sale_id,
        'sale_number', p_sale_number,
        'total_amount', p_total,
        'total_cost', v_total_cost_calc,
        'profit', v_profit_calc,
        'message', 'Venda finalizada com sucesso e estoque baixado atomicamente.'
    );
END;
$$;

-- 8. RPC 2: CONSULTA REVERSA DE GARANTIA & RMA POR SERIAL NUMBER
CREATE OR REPLACE FUNCTION public.rpc_rma_serial_lookup(p_serial_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_serial RECORD;
    v_warranty_expiry DATE;
    v_is_warranty_active BOOLEAN;
BEGIN
    SELECT s.*, p.name as product_name, p.sku as product_sku, p.category as product_category
    INTO v_serial
    FROM public.inventory_serials s
    JOIN public.products p ON s.product_id = p.id
    WHERE LOWER(s.serial_number) = LOWER(TRIM(p_serial_number));

    IF v_serial IS NULL THEN
        RETURN jsonb_build_object(
            'found', false,
            'message', 'Número de Série não localizado na base canônica.'
        );
    END IF;

    v_warranty_expiry := v_serial.purchase_date + (v_serial.warranty_months || ' months')::INTERVAL;
    v_is_warranty_active := CURRENT_DATE <= v_warranty_expiry;

    RETURN jsonb_build_object(
        'found', true,
        'serial_number', v_serial.serial_number,
        'product_name', v_serial.product_name,
        'product_sku', v_serial.product_sku,
        'product_category', v_serial.product_category,
        'supplier_name', v_serial.supplier_name,
        'invoice_number', v_serial.invoice_number,
        'purchase_date', v_serial.purchase_date,
        'warranty_months', v_serial.warranty_months,
        'warranty_expiry', v_warranty_expiry,
        'is_warranty_active', v_is_warranty_active,
        'status', v_serial.status,
        'client_name', v_serial.client_name,
        'work_order_id', v_serial.work_order_id,
        'pos_sale_id', v_serial.pos_sale_id,
        'notes', v_serial.notes
    );
END;
$$;

-- 9. RPC 3: RESERVA E CONSUMO DE PEÇAS NA BANCADA (DUAL DECREMENT BANCADA)
CREATE OR REPLACE FUNCTION public.rpc_reserve_os_inventory(
    p_os_number INT,
    p_sku TEXT,
    p_qty INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prod RECORD;
    v_available INT;
BEGIN
    SELECT * INTO v_prod FROM public.products WHERE sku = p_sku FOR UPDATE;
    IF v_prod IS NULL THEN
        RAISE EXCEPTION 'Produto com SKU % não localizado.', p_sku;
    END IF;

    v_available := v_prod.current_stock - v_prod.reserved_stock;
    IF v_available < p_qty THEN
        RAISE EXCEPTION 'Saldo disponível insuficiente para reserva (Disponível: %, Solicitado: %).', v_available, p_qty;
    END IF;

    UPDATE public.products 
    SET reserved_stock = reserved_stock + p_qty,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_prod.id;

    RETURN jsonb_build_object(
        'success', true,
        'sku', p_sku,
        'reserved_qty', p_qty,
        'remaining_available', v_available - p_qty
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_consume_os_inventory(
    p_os_number INT,
    p_sku TEXT,
    p_qty INT,
    p_serial_number TEXT DEFAULT NULL,
    p_operator TEXT DEFAULT 'Bancada Lab'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prod RECORD;
    v_wo_id UUID;
    v_client_name TEXT;
BEGIN
    SELECT id, client_name INTO v_wo_id, v_client_name FROM public.work_orders WHERE os_number = p_os_number;
    IF v_wo_id IS NULL THEN
        RAISE EXCEPTION 'OS #% não encontrada.', p_os_number;
    END IF;

    SELECT * INTO v_prod FROM public.products WHERE sku = p_sku FOR UPDATE;
    IF v_prod IS NULL THEN
        RAISE EXCEPTION 'Produto com SKU % não encontrado.', p_sku;
    END IF;

    -- Baixa física e liberação da reserva
    UPDATE public.products
    SET current_stock = GREATEST(0, current_stock - p_qty),
        reserved_stock = GREATEST(0, reserved_stock - p_qty),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_prod.id;

    -- Registro no Kardex
    INSERT INTO public.inventory_movements (
        product_id,
        sku,
        product_name,
        movement_type,
        quantity,
        unit_cost,
        total_cost,
        doc_reference,
        operator_name
    ) VALUES (
        v_prod.id,
        v_prod.sku,
        v_prod.name,
        'Saida_Ordem_Servico',
        -p_qty,
        v_prod.cost_price,
        v_prod.cost_price * p_qty,
        'OS #' || p_os_number,
        p_operator
    );

    -- Vínculo de Serial Unitário se fornecido
    IF p_serial_number IS NOT NULL AND TRIM(p_serial_number) <> '' THEN
        UPDATE public.inventory_serials
        SET status = 'Sold_OS',
            work_order_id = v_wo_id,
            client_name = v_client_name,
            updated_at = CURRENT_TIMESTAMP
        WHERE serial_number = p_serial_number;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'os_number', p_os_number,
        'sku', p_sku,
        'consumed_qty', p_qty,
        'serial_number', p_serial_number
    );
END;
$$;

-- 10. SEGURANÇA CISO DEFENSE & ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anon read products" ON public.products;
    CREATE POLICY "Anon read products" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true);
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access products" ON public.products;
    CREATE POLICY "Service role full access products" ON public.products FOR ALL TO service_role USING (true);
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access serials" ON public.inventory_serials;
    CREATE POLICY "Service role full access serials" ON public.inventory_serials FOR ALL TO service_role USING (true);
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access pos_sales" ON public.pos_sales;
    CREATE POLICY "Service role full access pos_sales" ON public.pos_sales FOR ALL TO service_role USING (true);
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access pos_sale_items" ON public.pos_sale_items;
    CREATE POLICY "Service role full access pos_sale_items" ON public.pos_sale_items FOR ALL TO service_role USING (true);
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access kardex" ON public.inventory_movements;
    CREATE POLICY "Service role full access kardex" ON public.inventory_movements FOR ALL TO service_role USING (true);
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 11. GRANT PERMISSIONS PARA RPCs
GRANT EXECUTE ON FUNCTION public.rpc_process_pos_sale TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_rma_serial_lookup TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_reserve_os_inventory TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_consume_os_inventory TO anon, authenticated, service_role;
