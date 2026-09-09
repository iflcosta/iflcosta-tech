-- ==============================================================================
-- MIGRATION: Estoque, PDV (Balcão) e Kardex no Supabase
-- Project: IF Tech (IFLCosta Tech)
-- ==============================================================================

-- 1. TABELA DE PRODUTOS / ESTOQUE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT DEFAULT 'Distribuidor',
    cost_price NUMERIC(10,2) DEFAULT 0.00,
    selling_price NUMERIC(10,2) DEFAULT 0.00,
    current_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 2,
    ean TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE VENDAS DO PDV (BALCÃO)
CREATE TABLE IF NOT EXISTS public.pos_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number TEXT UNIQUE NOT NULL,
    payment_method TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    discount NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    total_cost NUMERIC(10,2) DEFAULT 0.00,
    profit NUMERIC(10,2) DEFAULT 0.00,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE MOVIMENTAÇÕES DE KARDEX
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    movement_type TEXT NOT NULL, -- 'Entrada_Cadastro', 'Saida_PDV_Balcao', 'Saida_OS', 'Ajuste_Inventario'
    quantity INTEGER NOT NULL,
    total_cost NUMERIC(10,2) DEFAULT 0.00,
    doc_ref TEXT,
    operator TEXT DEFAULT 'Gestor IF Tech',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO (Leitura e Escrita para Anon e Authenticated)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public products read access" ON public.products;
    CREATE POLICY "Public products read access" ON public.products FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Public products insert access" ON public.products;
    CREATE POLICY "Public products insert access" ON public.products FOR INSERT WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public products update access" ON public.products;
    CREATE POLICY "Public products update access" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public products delete access" ON public.products;
    CREATE POLICY "Public products delete access" ON public.products FOR DELETE USING (true);

    DROP POLICY IF EXISTS "Public pos_sales read access" ON public.pos_sales;
    CREATE POLICY "Public pos_sales read access" ON public.pos_sales FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Public pos_sales insert access" ON public.pos_sales;
    CREATE POLICY "Public pos_sales insert access" ON public.pos_sales FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Public inventory_movements read access" ON public.inventory_movements;
    CREATE POLICY "Public inventory_movements read access" ON public.inventory_movements FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Public inventory_movements insert access" ON public.inventory_movements;
    CREATE POLICY "Public inventory_movements insert access" ON public.inventory_movements FOR INSERT WITH CHECK (true);
END $$;

-- 6. CARGA INICIAL (SEEDS) COM ITENS PROFISSIONAIS DE ALTA ROTAÇÃO
INSERT INTO public.products (sku, name, category, brand, cost_price, selling_price, current_stock, reserved_stock, min_stock, ean)
VALUES
    ('TER-MX4-4G', 'Pasta Térmica Arctic MX-4 (4g) Grau Industrial', 'termico', 'Arctic Cooling', 32.00, 75.00, 8, 0, 2, '872767009585'),
    ('TER-KRYO-1G', 'Pasta Térmica Thermal Grizzly Kryonaut (1g)', 'termico', 'Thermal Grizzly', 48.00, 110.00, 5, 0, 2, '753677507567'),
    ('PAD-MINUS-8', 'Thermal Pad Thermal Grizzly Minus Pad 8 (120x20x1.5mm)', 'termico', 'Thermal Grizzly', 55.00, 120.00, 4, 0, 1, '753677507727'),
    ('ALC-ISO-1L', 'Álcool Isopropílico 99.8% Puro (Frasco 1 Litro)', 'termico', 'Implastec', 18.00, 39.90, 6, 0, 2, '789823123001'),
    ('SSD-NV2-500G', 'SSD Kingston NV2 500GB M.2 2280 NVMe PCIe 4.0 (3500MB/s)', 'armazenamento', 'Kingston', 185.00, 319.90, 4, 0, 2, '740617329858'),
    ('SSD-NV2-1TB', 'SSD Kingston NV2 1TB M.2 2280 NVMe PCIe 4.0 (3500MB/s)', 'armazenamento', 'Kingston', 310.00, 499.00, 3, 0, 1, '740617329919'),
    ('MEM-FURY-16G', 'Memória Kingston Fury Beast 16GB DDR4 3200MHz CL16', 'memoria_ram', 'Kingston', 160.00, 280.00, 4, 0, 2, '740617319866'),
    ('FON-MSI-650W', 'Fonte MSI MAG A650BN 650W 80 Plus Bronze PFC Ativo', 'setups', 'MSI', 230.00, 389.00, 2, 0, 1, '4719072847661'),
    ('CAB-DP14-2M', 'Cabo DisplayPort 1.4 8K 60Hz / 4K 144Hz Blindado (2 Metros)', 'cabos', 'Ugreen', 35.00, 79.90, 6, 0, 2, '6957303848123'),
    ('CAB-HDMI21-2M', 'Cabo HDMI 2.1 Ultra High Speed 48Gbps 8K HDR (2 Metros)', 'cabos', 'Baseus', 32.00, 74.90, 5, 0, 2, '6953156228344'),
    ('CAR-GAN-65W', 'Carregador GaN 65W Turbo 3 Portas (2x USB-C + USB-A)', 'carregadores', 'Baseus', 85.00, 189.00, 4, 0, 1, '6953156230910')
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    cost_price = EXCLUDED.cost_price,
    selling_price = EXCLUDED.selling_price,
    ean = EXCLUDED.ean,
    updated_at = NOW();

-- 7. REGISTRO INICIAL NO KARDEX PARA A CARGA
INSERT INTO public.inventory_movements (product_sku, product_name, movement_type, quantity, total_cost, doc_ref, operator)
SELECT sku, name, 'Entrada_Cadastro', current_stock, (cost_price * current_stock), 'Carga Inicial do Catálogo', 'Setup Automático'
FROM public.products
ON CONFLICT DO NOTHING;
