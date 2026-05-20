-- =============================================================================
-- Migration: create_os
-- Feature:   006-admin-os
-- Data:      2026-05-20
-- Propósito: Cria as tabelas `repairs` (ordens de serviço), `repair_photos`,
--            `repair_checklist_items`, `repair_parts` e `os_status_history`.
--            Define os triggers de transição de status, cálculo de garantia,
--            atualização de data de modificação e auditoria.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela principal: repairs (Ordens de Serviço)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repairs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    equipamento         JSONB NOT NULL, -- { tipo, marca, modelo, serial }
    problema_reportado   TEXT NOT NULL,
    laudo               TEXT,
    status              VARCHAR NOT NULL DEFAULT 'rascunho',
    prazo_prometido     TIMESTAMP WITH TIME ZONE,
    valor_cobrado       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    valor_custo_pecas   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    valor_lucro         NUMERIC(10,2) GENERATED ALWAYS AS (valor_cobrado - valor_custo_pecas) STORED,
    forma_pagamento     TEXT,
    garantia_dias       INTEGER NOT NULL DEFAULT 90,
    garantia_ate        TIMESTAMP WITH TIME ZONE,
    garantia_de         UUID REFERENCES public.repairs(id) ON DELETE SET NULL,
    tracking_token      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    entregue_at         TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Acesso completo para admin autenticado em repairs" 
    ON public.repairs 
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso completo para service_role em repairs" 
    ON public.repairs 
    FOR ALL 
    TO service_role 
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Tabela: repair_photos (Fotos de antes, durante e depois dos reparos)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repair_photos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id           UUID REFERENCES public.repairs(id) ON DELETE CASCADE NOT NULL,
    url                 TEXT NOT NULL,
    tipo                VARCHAR NOT NULL CHECK (tipo IN ('antes', 'durante', 'depois')),
    uploaded_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.repair_photos ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Acesso completo para admin autenticado em repair_photos" 
    ON public.repair_photos 
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso completo para service_role em repair_photos" 
    ON public.repair_photos 
    FOR ALL 
    TO service_role 
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Tabela: repair_checklist_items (Itens de teste específicos do reparo)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repair_checklist_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id           UUID REFERENCES public.repairs(id) ON DELETE CASCADE NOT NULL,
    label               TEXT NOT NULL,
    checked             BOOLEAN NOT NULL DEFAULT FALSE,
    order_index         INTEGER NOT NULL DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE public.repair_checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Acesso completo para admin autenticado em repair_checklist_items" 
    ON public.repair_checklist_items 
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso completo para service_role em repair_checklist_items" 
    ON public.repair_checklist_items 
    FOR ALL 
    TO service_role 
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Tabela: repair_parts (Vínculo de peças consumidas no reparo - Feature 007)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repair_parts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id           UUID REFERENCES public.repairs(id) ON DELETE CASCADE NOT NULL,
    product_id          UUID, -- Referenciará tabela de produtos futuramente
    qty                 INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
    custo_unitario      NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

-- Habilitar RLS
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Acesso completo para admin autenticado em repair_parts" 
    ON public.repair_parts 
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso completo para service_role em repair_parts" 
    ON public.repair_parts 
    FOR ALL 
    TO service_role 
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Tabela: os_status_history (Histórico de transições de status da OS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.os_status_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id               UUID REFERENCES public.repairs(id) ON DELETE CASCADE NOT NULL,
    status              VARCHAR NOT NULL,
    entered_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    exited_at           TIMESTAMP WITH TIME ZONE,
    duration_seconds    BIGINT,
    changed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes               TEXT
);

-- Habilitar RLS
ALTER TABLE public.os_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Acesso completo para admin autenticado em os_status_history" 
    ON public.os_status_history 
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso completo para service_role em os_status_history" 
    ON public.os_status_history 
    FOR ALL 
    TO service_role 
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Índices para Performance
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS repairs_customer_id_idx ON public.repairs (customer_id);
CREATE INDEX IF NOT EXISTS repairs_status_idx ON public.repairs (status);
CREATE INDEX IF NOT EXISTS repairs_tracking_token_idx ON public.repairs (tracking_token);
CREATE INDEX IF NOT EXISTS repairs_created_at_idx ON public.repairs (created_at DESC);
CREATE INDEX IF NOT EXISTS os_status_history_os_id_idx ON public.os_status_history (os_id);
CREATE INDEX IF NOT EXISTS os_status_history_status_idx ON public.os_status_history (status);

-- -----------------------------------------------------------------------------
-- Trigger: Atualização Automática de Datas e Garantia BEFORE INSERT/UPDATE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_repairs_before_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'entregue'
    IF (NEW.status = 'entregue' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'entregue')) THEN
        NEW.entregue_at := NOW();
        NEW.garantia_ate := NOW() + (COALESCE(NEW.garantia_dias, 90) || ' days')::INTERVAL;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS repairs_before_changes ON public.repairs;
CREATE TRIGGER repairs_before_changes
    BEFORE INSERT OR UPDATE ON public.repairs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_repairs_before_changes();

-- -----------------------------------------------------------------------------
-- Trigger: Controle de Transições de Status no Histórico (os_status_history)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_os_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    last_history_id UUID;
    entered_time TIMESTAMP WITH TIME ZONE;
    current_actor UUID;
BEGIN
    -- Obter o ID do usuário de autenticação (se houver)
    BEGIN
        current_actor := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_actor := NULL;
    END;

    -- 1. Se for uma atualização, fechar o status anterior
    IF (TG_OP = 'UPDATE') THEN
        -- Só executa se o status realmente mudou de valor
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            
            -- Busca o último histórico ativo desta OS (exited_at IS NULL)
            SELECT id, entered_at INTO last_history_id, entered_time
            FROM public.os_status_history
            WHERE os_id = NEW.id AND exited_at IS NULL
            ORDER BY entered_at DESC
            LIMIT 1;

            -- Se houver, calcula a duração e define data de saída
            IF last_history_id IS NOT NULL THEN
                UPDATE public.os_status_history
                SET 
                    exited_at = NOW(),
                    duration_seconds = EXTRACT(EPOCH FROM (NOW() - entered_time))::BIGINT
                WHERE id = last_history_id;
            END IF;

            -- Cria o novo registro correspondente ao novo status
            INSERT INTO public.os_status_history (os_id, status, entered_at, changed_by)
            VALUES (NEW.id, NEW.status, NOW(), current_actor);
            
        END IF;
    
    -- 2. Se for uma criação (INSERT), inicia o histórico de status inicial (ex: rascunho)
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.os_status_history (os_id, status, entered_at, changed_by)
        VALUES (NEW.id, NEW.status, NOW(), current_actor);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_os_status_change ON public.repairs;
CREATE TRIGGER on_os_status_change
    AFTER UPDATE OF status ON public.repairs
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_os_status_transition();

DROP TRIGGER IF EXISTS on_os_created ON public.repairs;
CREATE TRIGGER on_os_created
    AFTER INSERT ON public.repairs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_os_status_transition();

-- -----------------------------------------------------------------------------
-- Trigger: Auditoria de Mutações na Tabela repairs
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_repair_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  old_data JSONB := NULL;
  new_data JSONB := NULL;
  op TEXT := TG_OP;
  actor_id TEXT := 'system';
BEGIN
  -- Obter o ID do usuário autenticado no Supabase ou 'system'
  BEGIN
    actor_id := COALESCE(auth.uid()::text, 'system');
  EXCEPTION WHEN OTHERS THEN
    actor_id := 'system';
  END;

  IF (op = 'UPDATE' OR op = 'DELETE') THEN
    old_data := to_jsonb(OLD);
  END IF;
  IF (op = 'INSERT' OR op = 'UPDATE') THEN
    new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_log (actor, action, entity, entity_id, before, after)
  VALUES (
    actor_id,
    'repair_' || LOWER(op),
    'repairs',
    CASE WHEN op = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    old_data,
    new_data
  );

  IF (op = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_repairs_changes ON public.repairs;
CREATE TRIGGER audit_repairs_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.repairs
    FOR EACH ROW EXECUTE FUNCTION public.process_repair_audit();
