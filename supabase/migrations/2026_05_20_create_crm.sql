-- =============================================================================
-- Migration: create_crm
-- Feature:   005-admin-crm
-- Data:      2026-05-20
-- Propósito: Cria a tabela `customers` (clientes ativos), RLS restrita ao admin,
--            adiciona a coluna `customer_id` na tabela `leads` para link de conversão,
--            e configura triggers de atualização e auditoria.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela principal: customers
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nome        TEXT NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 100),
    telefone    TEXT NOT NULL UNIQUE,
    email       TEXT,
    cpf         TEXT UNIQUE,
    endereco    JSONB, -- { logradouro, numero, complemento, bairro, cidade, uf, cep }
    tags        TEXT[] DEFAULT '{}'::TEXT[],
    observacoes TEXT,
    origem_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    deleted_at  TIMESTAMP WITH TIME ZONE, -- Soft delete

    CONSTRAINT tel_format CHECK (telefone ~ '^\+?[0-9]{10,15}$')
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso: Apenas administradores autenticados e service_role podem ver, criar ou editar
CREATE POLICY "Acesso completo para admin autenticado" 
    ON public.customers 
    FOR ALL 
    TO authenticated 
    USING (deleted_at IS NULL)
    WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Acesso completo para service_role" 
    ON public.customers 
    FOR ALL 
    TO service_role 
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Alteração da tabela: leads
-- -----------------------------------------------------------------------------

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Habilitar políticas para admin autenticado na tabela leads
CREATE POLICY "Acesso completo para admin autenticado em leads"
    ON public.leads
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Índices para performance de busca no CRM
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS customers_nome_idx ON public.customers (nome);
CREATE INDEX IF NOT EXISTS customers_telefone_idx ON public.customers (telefone);
CREATE INDEX IF NOT EXISTS customers_deleted_at_idx ON public.customers (deleted_at) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Trigger: atualiza updated_at do cliente
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Trigger: auditoria de mutações na tabela customers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_customer_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  old_data JSONB := NULL;
  new_data JSONB := NULL;
  op TEXT := TG_OP;
  actor_id TEXT := NULL;
BEGIN
  -- Tentar obter o ID do usuário autenticado no Supabase
  BEGIN
    actor_id := auth.uid()::text;
  EXCEPTION WHEN OTHERS THEN
    actor_id := 'system';
  END;
  
  IF actor_id IS NULL THEN
    actor_id := 'system';
  END;

  IF (op = 'UPDATE' OR op = 'DELETE') THEN
    old_data := to_jsonb(OLD);
  END;
  IF (op = 'INSERT' OR op = 'UPDATE') THEN
    new_data := to_jsonb(NEW);
  END;

  INSERT INTO public.audit_log (actor, action, entity, entity_id, before, after)
  VALUES (
    actor_id,
    'customer_' || lower(op),
    'customers',
    CASE WHEN op = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    old_data,
    new_data
  );

  IF (op = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END;
END;
$$;

DROP TRIGGER IF EXISTS audit_customers_changes ON public.customers;
CREATE TRIGGER audit_customers_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.process_customer_audit();
