-- ==============================================================================
-- MIGRATION: Tabela msp_tickets no Supabase
-- Project: IF Tech (IFLCosta Tech)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.msp_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE,
    contract_id UUID REFERENCES public.msp_contracts(id) ON DELETE SET NULL,
    company_name TEXT,
    device_id UUID REFERENCES public.msp_managed_devices(id) ON DELETE SET NULL,
    device_tag TEXT,
    opened_by_name TEXT,
    opened_by_whatsapp TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Suporte_Estacao',
    severity TEXT DEFAULT 'Media',
    priority TEXT DEFAULT 'Alta',
    status TEXT DEFAULT 'Aberto',
    origin TEXT DEFAULT 'Admin_Cockpit',
    sla_due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR RLS
ALTER TABLE public.msp_tickets ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO PÚBLICO
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public msp_tickets read access" ON public.msp_tickets;
    CREATE POLICY "Public msp_tickets read access" ON public.msp_tickets FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Public msp_tickets insert access" ON public.msp_tickets;
    CREATE POLICY "Public msp_tickets insert access" ON public.msp_tickets FOR INSERT WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public msp_tickets update access" ON public.msp_tickets;
    CREATE POLICY "Public msp_tickets update access" ON public.msp_tickets FOR UPDATE USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public msp_tickets delete access" ON public.msp_tickets;
    CREATE POLICY "Public msp_tickets delete access" ON public.msp_tickets FOR DELETE USING (true);
END $$;
