-- =============================================================================
-- Migration: create_service_orders
-- Feature:   006-admin-os
-- Data:      2026-05-20
-- Propósito: Cria a infraestrutura de dados para Ordens de Serviço (repairs),
--            histórico de status (os_status_history), itens do checklist
--            (repair_checklist_items) e fotos do conserto (repair_photos).
--            Configura políticas de Row Level Security (RLS) restritas,
--            triggers PL/pgSQL para controle de transição de status e cálculo
--            de garantias, além do log de auditoria.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela principal: repairs (Ordens de Serviço)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repairs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    equipamento         JSONB NOT NULL, -- { tipo, marca, modelo, serial }
    problema_reportado  TEXT,
    laudo               TEXT,
    status              VARCHAR NOT NULL DEFAULT 'rascunho',
    prazo_prometido     TIMESTAMP WITH TIME ZONE,
    valor_cobrado       NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (valor_cobrado >= 0),
    valor_custo_peças   NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (valor_custo_peças >= 0),
    valor_lucro         NUMERIC(10,2) GENERATED ALWAYS AS (valor_cobrado - valor_custo_peças) STORED,
    forma_pagamento     VARCHAR CHECK (forma_pagamento IN ('PIX', 'dinheiro', 'cartão', 'transferência') OR forma_pagamento IS NULL),
    garantia_dias       INTEGER DEFAULT 90 NOT NULL CHECK (garantia_dias >= 0),
    garantia_ate        DATE, -- Computada automaticamente por trigger no pre-save
    garantia_de         UUID REFERENCES public.repairs(id) ON DELETE SET NULL, -- Self-referencing para retrabalhos em garantia
    tracking_token      UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    entregue_at         TIMESTAMP WITH TIME ZONE,
    deleted_at          TIMESTAMP WITH TIME ZONE, -- Soft delete

    CONSTRAINT status_enum CHECK (status IN (
        'rascunho', 
        'diagnóstico', 
        'aguardando_aprovação', 
        'aprovado', 
        'aguardando_peça', 
        'em_conserto', 
        'pronto', 
        'entregue', 
        'cancelado', 
        'cliente_desistiu'
    ))
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Tabela: os_status_history (Histórico de transições de status)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.os_status_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id               UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
    status              VARCHAR NOT NULL,
    entered_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    exited_at           TIMESTAMP WITH TIME ZONE,
    duration_seconds    BIGINT,
    changed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes               TEXT
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.os_status_history ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Tabela: repair_checklist_items (Checklist de testes e verificações)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repair_checklist_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id   UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
    label       VARCHAR(250) NOT NULL,
    checked     BOOLEAN DEFAULT FALSE NOT NULL,
    "order"     INTEGER DEFAULT 0 NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.repair_checklist_items ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Tabela: repair_photos (Galeria de imagens do conserto - antes/durante/depois)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repair_photos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id   UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    tipo        VARCHAR NOT NULL CHECK (tipo IN ('antes', 'durante', 'depois')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.repair_photos ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Políticas de Segurança Row Level Security (RLS)
-- =============================================================================

-- 1. Políticas para a tabela principal: repairs
CREATE POLICY "Acesso completo para admin autenticado em repairs"
    ON public.repairs
    FOR ALL
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Acesso completo para service_role em repairs"
    ON public.repairs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Leitura publica por tracking_token em repairs"
    ON public.repairs
    FOR SELECT
    TO anon
    USING (deleted_at IS NULL);

-- 2. Políticas para a tabela: os_status_history
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

CREATE POLICY "Leitura publica por tracking_token em os_status_history"
    ON public.os_status_history
    FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.repairs r
            WHERE r.id = os_status_history.os_id AND r.deleted_at IS NULL
        )
    );

-- 3. Políticas para a tabela: repair_checklist_items
CREATE POLICY "Acesso completo para admin autenticado em checklist"
    ON public.repair_checklist_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso completo para service_role em checklist"
    ON public.repair_checklist_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Políticas para a tabela: repair_photos
CREATE POLICY "Acesso completo para admin autenticado em fotos"
    ON public.repair_photos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso completo para service_role em fotos"
    ON public.repair_photos
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Leitura publica por tracking_token em fotos"
    ON public.repair_photos
    FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.repairs r
            WHERE r.id = repair_photos.repair_id AND r.deleted_at IS NULL
        )
    );

-- =============================================================================
-- Índices para Performance e Otimização
-- =============================================================================

CREATE INDEX IF NOT EXISTS repairs_customer_id_idx ON public.repairs (customer_id);
CREATE INDEX IF NOT EXISTS repairs_status_idx ON public.repairs (status);
CREATE INDEX IF NOT EXISTS repairs_tracking_token_idx ON public.repairs (tracking_token);
CREATE INDEX IF NOT EXISTS repairs_deleted_at_idx ON public.repairs (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS os_status_history_os_id_idx ON public.os_status_history (os_id);
CREATE INDEX IF NOT EXISTS os_status_history_active_idx ON public.os_status_history (os_id) WHERE exited_at IS NULL;

CREATE INDEX IF NOT EXISTS repair_checklist_items_repair_id_idx ON public.repair_checklist_items (repair_id);
CREATE INDEX IF NOT EXISTS repair_checklist_items_order_idx ON public.repair_checklist_items (repair_id, "order");

CREATE INDEX IF NOT EXISTS repair_photos_repair_id_idx ON public.repair_photos (repair_id);

-- =============================================================================
-- Triggers e Funções PL/pgSQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger: Atualização automática de updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_repairs_updated_at ON public.repairs;
CREATE TRIGGER update_repairs_updated_at
    BEFORE UPDATE ON public.repairs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. Trigger: Pré-salvamento da OS (cálculo de data de entrega e garantia)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_os_pre_save()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'entregue' e entregue_at ainda não foi setado, define automático
    IF NEW.status = 'entregue' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'entregue') AND NEW.entregue_at IS NULL THEN
        NEW.entregue_at := NOW();
    END IF;

    -- Se entregue_at estiver preenchido, calcula dinamicamente a data de vencimento da garantia
    IF NEW.entregue_at IS NOT NULL THEN
        NEW.garantia_ate := (NEW.entregue_at + (NEW.garantia_dias || ' days')::INTERVAL)::DATE;
    ELSE
        NEW.garantia_ate := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_os_pre_save ON public.repairs;
CREATE TRIGGER on_os_pre_save
    BEFORE INSERT OR UPDATE ON public.repairs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_os_pre_save();

-- -----------------------------------------------------------------------------
-- 3. Trigger: Gerenciador de transições de status (Histórico e tempos ativos)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_os_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    last_history_id UUID;
    entered_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Se for uma atualização, fecha o status ativo anterior
    IF (TG_OP = 'UPDATE') THEN
        -- Só executa se o status realmente mudou de valor
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            
            -- Busca o último histórico ativo desta OS (exited_at IS NULL)
            SELECT id, entered_at INTO last_history_id, entered_time
            FROM public.os_status_history
            WHERE os_id = NEW.id AND exited_at IS NULL
            ORDER BY entered_at DESC
            LIMIT 1;

            -- Se houver status ativo anterior, fecha com NOW() e calcula a duração exata
            IF last_history_id IS NOT NULL THEN
                UPDATE public.os_status_history
                SET 
                    exited_at = NOW(),
                    duration_seconds = EXTRACT(EPOCH FROM (NOW() - entered_time))::BIGINT
                WHERE id = last_history_id;
            END IF;

            -- Cria o novo registro correspondente ao novo status
            INSERT INTO public.os_status_history (os_id, status, entered_at, changed_by)
            VALUES (NEW.id, NEW.status, NOW(), auth.uid());
            
        END IF;
    
    -- 2. Se for uma criação (INSERT), inicia o histórico com o status inicial definido
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.os_status_history (os_id, status, entered_at, changed_by)
        VALUES (NEW.id, NEW.status, NOW(), auth.uid());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger executado após INSERT em repairs
DROP TRIGGER IF EXISTS on_os_created ON public.repairs;
CREATE TRIGGER on_os_created
    AFTER INSERT ON public.repairs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_os_status_transition();

-- Trigger executado após UPDATE do status em repairs
DROP TRIGGER IF EXISTS on_os_status_change ON public.repairs;
CREATE TRIGGER on_os_status_change
    AFTER UPDATE OF status ON public.repairs
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_os_status_transition();

-- -----------------------------------------------------------------------------
-- 4. Trigger: Log de auditoria da tabela repairs
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_repair_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  old_data JSONB := NULL;
  new_data JSONB := NULL;
  op TEXT := TG_OP;
  actor_id TEXT := 'system';
BEGIN
  -- Identifica o autor da mutação
  BEGIN
    actor_id := coalesce(auth.uid()::text, 'system');
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
    'repair_' || lower(op),
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

-- =============================================================================
-- Supabase Storage: Bucket 'os-photos' e Políticas RLS
-- =============================================================================

-- 1. Criação do bucket 'os-photos'
INSERT INTO storage.buckets (id, name, public)
VALUES ('os-photos', 'os-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas RLS do bucket de fotos (tabela storage.objects)

DROP POLICY IF EXISTS "Fotos de OS sao acessiveis publicamente" ON storage.objects;
CREATE POLICY "Fotos de OS sao acessiveis publicamente"
    ON storage.objects 
    FOR SELECT
    TO public
    USING (bucket_id = 'os-photos');

DROP POLICY IF EXISTS "Admin pode fazer upload de fotos de OS" ON storage.objects;
CREATE POLICY "Admin pode fazer upload de fotos de OS"
    ON storage.objects 
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'os-photos');

DROP POLICY IF EXISTS "Admin pode atualizar fotos de OS" ON storage.objects;
CREATE POLICY "Admin pode atualizar fotos de OS"
    ON storage.objects 
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'os-photos')
    WITH CHECK (bucket_id = 'os-photos');

DROP POLICY IF EXISTS "Admin pode deletar fotos de OS" ON storage.objects;
CREATE POLICY "Admin pode deletar fotos de OS"
    ON storage.objects 
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'os-photos');

