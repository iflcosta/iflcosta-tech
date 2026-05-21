-- =============================================================================
-- Migration: create_inventory
-- Feature:   007-admin-inventory
-- Data:      2026-05-21
-- Propósito: Cria a infraestrutura de dados para Estoque (products),
--            Movimentações (inventory_movements) e Presets do Custom PC Builder
--            (pc_build_presets). Configura RLS, índices e dois triggers
--            PL/pgSQL: um que mantém qty_atual sincronizado com os movimentos
--            e outro que recalcula valor_custo_peças em repairs quando
--            um movimento de saída está associado a uma OS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela: products (Catálogo de produtos/peças/componentes)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku             VARCHAR(100) UNIQUE,
    nome            VARCHAR(250) NOT NULL,
    categoria       VARCHAR(50) NOT NULL CHECK (categoria IN ('peça', 'acessório', 'componente_pc')),
    subcategoria    VARCHAR(100),
    marca           VARCHAR(100),
    modelo          VARCHAR(100),
    custo_atual     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (custo_atual >= 0),
    preco_venda     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (preco_venda >= 0),
    qty_atual       INTEGER NOT NULL DEFAULT 0,
    qty_minima      INTEGER NOT NULL DEFAULT 0 CHECK (qty_minima >= 0),
    baixo_estoque   BOOLEAN GENERATED ALWAYS AS (qty_atual <= qty_minima) STORED,
    fornecedor      JSONB DEFAULT '{}'::jsonb,   -- { nome, telefone, cnpj }
    specs           JSONB DEFAULT '{}'::jsonb,   -- { socket, ram_type, form_factor, watts }
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at      TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Tabela: inventory_movements (Log imutável de movimentações de estoque)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saída', 'ajuste')),
    qty             INTEGER NOT NULL CHECK (qty > 0),
    custo_unitario  NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (custo_unitario >= 0),
    repair_id       UUID REFERENCES public.repairs(id) ON DELETE SET NULL,
    nf              VARCHAR(100),
    observacao      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    actor           UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Tabela: pc_build_presets (Modelos pré-definidos para o Custom PC Builder)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pc_build_presets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(150) NOT NULL UNIQUE,
    descricao       TEXT,
    faixa_preco_min NUMERIC(10,2),
    faixa_preco_max NUMERIC(10,2),
    components      JSONB NOT NULL,  -- Array de { category, sug_product_id, qty }
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pc_build_presets ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Políticas RLS
-- =============================================================================

-- products
CREATE POLICY "Admin: acesso completo a products"
    ON public.products FOR ALL TO authenticated
    USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Service role: acesso completo a products"
    ON public.products FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- inventory_movements (log imutável — sem DELETE para authenticated)
CREATE POLICY "Admin: leitura e inserção em inventory_movements"
    ON public.inventory_movements FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role: acesso completo a inventory_movements"
    ON public.inventory_movements FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- pc_build_presets
CREATE POLICY "Admin: acesso completo a pc_build_presets"
    ON public.pc_build_presets FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role: acesso completo a pc_build_presets"
    ON public.pc_build_presets FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =============================================================================
-- Índices
-- =============================================================================

CREATE INDEX IF NOT EXISTS products_categoria_idx    ON public.products (categoria);
CREATE INDEX IF NOT EXISTS products_is_active_idx    ON public.products (is_active);
CREATE INDEX IF NOT EXISTS products_deleted_at_idx   ON public.products (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS products_baixo_estoque_idx ON public.products (baixo_estoque) WHERE deleted_at IS NULL AND baixo_estoque = true;

CREATE INDEX IF NOT EXISTS inventory_movements_product_id_idx ON public.inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS inventory_movements_repair_id_idx  ON public.inventory_movements (repair_id);
CREATE INDEX IF NOT EXISTS inventory_movements_tipo_idx       ON public.inventory_movements (tipo);
CREATE INDEX IF NOT EXISTS inventory_movements_created_at_idx ON public.inventory_movements (created_at DESC);

-- =============================================================================
-- Triggers e Funções PL/pgSQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger: atualiza updated_at em products
--    (reutiliza função public.update_updated_at_column() criada em 006)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. Trigger: sincroniza qty_atual em products após qualquer movimento
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_inventory_movement_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    target_product_id UUID;
    new_qty INTEGER;
BEGIN
    target_product_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;

    SELECT COALESCE(SUM(
        CASE tipo
            WHEN 'entrada' THEN qty
            ELSE -qty  -- saída e ajuste decrementam
        END
    ), 0)
    INTO new_qty
    FROM public.inventory_movements
    WHERE product_id = target_product_id;

    UPDATE public.products
    SET qty_atual = new_qty, updated_at = NOW()
    WHERE id = target_product_id;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_inventory_movement_stock ON public.inventory_movements;
CREATE TRIGGER on_inventory_movement_stock
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_inventory_movement_stock();

-- -----------------------------------------------------------------------------
-- 3. Trigger: recalcula valor_custo_peças em repairs quando movimento tem repair_id
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_repair_parts_cost()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    target_repair_id UUID;
    total_cost NUMERIC(10,2);
BEGIN
    target_repair_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.repair_id ELSE NEW.repair_id END;

    IF target_repair_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(qty * custo_unitario), 0)
    INTO total_cost
    FROM public.inventory_movements
    WHERE repair_id = target_repair_id AND tipo = 'saída';

    UPDATE public.repairs
    SET valor_custo_peças = total_cost, updated_at = NOW()
    WHERE id = target_repair_id;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_inventory_movement_repair_cost ON public.inventory_movements;
CREATE TRIGGER on_inventory_movement_repair_cost
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_repair_parts_cost();
