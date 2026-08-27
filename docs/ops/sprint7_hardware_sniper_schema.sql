-- =====================================================================
-- IF TECH // TECH SOLUTIONS - SPRINT 7 SCHEMA
-- HARDWARE SNIPER ENGINE & RADAR DE OPORTUNIDADES B2C / B2B / BANCADA
-- =====================================================================

-- 1. TABELA DE OFERTAS & PROMOÇÕES MONITORADAS
CREATE TABLE IF NOT EXISTS public.hardware_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('SSD', 'RAM', 'GPU', 'CPU', 'Fonte', 'Placa_Mae', 'Cooler', 'Gabinete', 'Notebook', 'Smartphone', 'Periferico')),
    store_name TEXT NOT NULL CHECK (store_name IN ('Kabum', 'Terabyte', 'Pichau', 'Mercado Livre', 'Amazon', 'AliExpress', 'Distribuidor Oficial')),
    product_url TEXT NOT NULL,
    affiliate_url TEXT,
    image_url TEXT,
    current_price NUMERIC(10,2) NOT NULL,
    normal_price NUMERIC(10,2),
    discount_percentage INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN normal_price > current_price AND normal_price > 0 
            THEN ROUND(((normal_price - current_price) / normal_price) * 100) 
            ELSE 0 
        END
    ) STORED,
    payment_method_deal TEXT DEFAULT 'Pix / À Vista',
    suggested_resale_price NUMERIC(10,2) NOT NULL,
    estimated_profit NUMERIC(10,2) GENERATED ALWAYS AS (suggested_resale_price - current_price) STORED,
    target_opportunity TEXT DEFAULT 'Bancada_Estoque' CHECK (target_opportunity IN ('Bancada_Estoque', 'Setup_Gamer', 'Cliente_Final', 'Upgrade_Notebook')),
    badge_label TEXT DEFAULT '⚡ Oportunidade Bancada',
    is_active BOOLEAN DEFAULT TRUE,
    imported_to_inventory BOOLEAN DEFAULT FALSE,
    broadcast_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE REGRAS DO SNIPER (ALERTAS DE PREÇO-ALVO)
CREATE TABLE IF NOT EXISTS public.sniper_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    category TEXT NOT NULL,
    keyword_match TEXT,
    max_target_price NUMERIC(10,2) NOT NULL,
    min_discount_pct INTEGER DEFAULT 15,
    auto_notify_telegram BOOLEAN DEFAULT TRUE,
    auto_notify_whatsapp BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE CONFIGURAÇÕES DE DISPARO & AFILIADOS
CREATE TABLE IF NOT EXISTS public.sniper_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_bot_token TEXT,
    telegram_channel_id TEXT,
    whatsapp_webhook_url TEXT,
    amazon_tag TEXT DEFAULT 'iftech0b-20',
    mercadolivre_tag TEXT,
    kabum_tag TEXT,
    ali_tag TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_hardware_deals_category ON public.hardware_deals(category);
CREATE INDEX IF NOT EXISTS idx_hardware_deals_store ON public.hardware_deals(store_name);
CREATE INDEX IF NOT EXISTS idx_hardware_deals_active ON public.hardware_deals(is_active);

-- 5. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.hardware_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sniper_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sniper_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Public Read Active Deals" ON public.hardware_deals
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admin Full Access Deals" ON public.hardware_deals
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Admin Full Access Rules" ON public.sniper_rules
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Admin Full Access Settings" ON public.sniper_settings
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
