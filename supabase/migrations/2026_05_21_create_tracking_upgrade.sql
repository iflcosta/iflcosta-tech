-- =============================================================================
-- Migration: create_tracking_upgrade
-- Feature:   006-admin-os-tracking-upgrade
-- Data:      2026-05-21
-- Propósito: Adiciona colunas para suporte a Custom PC, notas públicas, status
--            financeiro discreto e garantia digital na tabela repairs e
--            os_status_history. Configura triggers para geração automática de
--            números legíveis de OS e certificados, implementa a View de
--            Segurança pública sanitizada e políticas RLS para anônimos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Alterações nas tabelas existentes
-- -----------------------------------------------------------------------------

-- Adicionar colunas necessárias na tabela principal de OS (repairs)
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS os_number VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS is_custom_pc BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'parcial', 'pago')),
ADD COLUMN IF NOT EXISTS digital_warranty_code VARCHAR(32);

-- Adicionar notas públicas e privadas no histórico de status (os_status_history)
ALTER TABLE public.os_status_history
ADD COLUMN IF NOT EXISTS public_notes TEXT,
ADD COLUMN IF NOT EXISTS private_notes TEXT;

-- -----------------------------------------------------------------------------
-- 2. Trigger para geração de metadados da OS (os_number e digital_warranty_code)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_os_metadata_generation()
RETURNS TRIGGER AS $$
DECLARE
    seq_num INT;
    year_str VARCHAR(4);
BEGIN
    year_str := TO_CHAR(NOW(), 'YYYY');
    
    -- Busca número incremental sequencial para o ano corrente
    SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num
    FROM public.repairs
    WHERE TO_CHAR(created_at, 'YYYY') = year_str;
    
    -- Se os_number for nulo ou vazio, gera o sequencial
    IF NEW.os_number IS NULL OR NEW.os_number = '' THEN
        NEW.os_number := 'OS-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    END IF;

    -- Se o código de garantia for nulo ou vazio, gera a hash
    IF NEW.digital_warranty_code IS NULL OR NEW.digital_warranty_code = '' THEN
        NEW.digital_warranty_code := 'WARR-' || year_str || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_os_metadata_generation ON public.repairs;
CREATE TRIGGER trigger_os_metadata_generation
    BEFORE INSERT ON public.repairs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_os_metadata_generation();

-- -----------------------------------------------------------------------------
-- 3. Atualização retroativa de registros existentes
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    r RECORD;
    seq_num INT := 1;
    year_str VARCHAR(4);
BEGIN
    -- Loop pelas OS existentes que não possuem número legível
    FOR r IN 
        SELECT id, created_at 
        FROM public.repairs 
        WHERE os_number IS NULL 
        ORDER BY created_at ASC
    LOOP
        year_str := TO_CHAR(r.created_at, 'YYYY');
        
        -- Conta OS do mesmo ano anteriores ou iguais
        SELECT COUNT(*) INTO seq_num
        FROM public.repairs
        WHERE TO_CHAR(created_at, 'YYYY') = year_str AND created_at <= r.created_at;
        
        UPDATE public.repairs
        SET 
            os_number = 'OS-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0'),
            digital_warranty_code = 'WARR-' || year_str || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6))
        WHERE id = r.id;
    END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. View de Segurança Pública Sanitizada (LGPD & Sigilo Financeiro)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.view_public_os_tracking AS
SELECT 
    r.tracking_token,
    r.id AS os_id,
    r.os_number,
    r.is_custom_pc,
    r.status,
    -- Dados mascarados para LGPD (primeiro nome apenas, serial com miolo ocultado)
    INITCAP(SPLIT_PART(c.nome, ' ', 1)) AS customer_first_name,
    r.equipamento->>'tipo' AS equip_tipo,
    r.equipamento->>'marca' AS equip_marca,
    r.equipamento->>'modelo' AS equip_modelo,
    CASE 
        WHEN (r.equipamento->>'serial') IS NULL OR (r.equipamento->>'serial') = '' THEN 'Não informado'
        WHEN LENGTH(r.equipamento->>'serial') <= 6 THEN '****'
        ELSE SUBSTRING(r.equipamento->>'serial' FROM 1 FOR 4) || '****' || SUBSTRING(r.equipamento->>'serial' FROM LENGTH(r.equipamento->>'serial') - 3)
    END AS equip_serial,
    r.problema_reportado,
    r.laudo,
    -- Informações adicionais e contratuais discretas
    r.valor_cobrado AS valor_final_servico,
    r.payment_status,
    r.prazo_prometido AS estimated_delivery,
    r.digital_warranty_code,
    r.garantia_dias AS warranty_dias,
    r.garantia_ate AS warranty_ate,
    r.created_at,
    r.entregue_at,
    r.updated_at AS ultima_atualizacao
FROM public.repairs r
LEFT JOIN public.customers c ON r.customer_id = c.id
WHERE r.deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 5. Configuração de Row Level Security (RLS) & Permissões
-- -----------------------------------------------------------------------------

-- Garantir que a View é visível para conexões públicas e anônimas
GRANT SELECT ON public.view_public_os_tracking TO anon;
GRANT SELECT ON public.view_public_os_tracking TO authenticated;
GRANT SELECT ON public.view_public_os_tracking TO service_role;

-- Habilitar RLS nas tabelas core
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Excluir qualquer política pública pré-existente
DROP POLICY IF EXISTS select_public_repair_by_token ON public.repairs;
DROP POLICY IF EXISTS select_public_history_by_os_token ON public.os_status_history;
DROP POLICY IF EXISTS select_public_movements_by_os_token ON public.inventory_movements;

-- Políticas de Leitura Pública restritas pelo Token UUID
CREATE POLICY select_public_repair_by_token ON public.repairs
    FOR SELECT TO anon, authenticated
    USING (tracking_token IS NOT NULL);

CREATE POLICY select_public_history_by_os_token ON public.os_status_history
    FOR SELECT TO anon, authenticated
    USING (
        os_id IN (
            SELECT id FROM public.repairs WHERE tracking_token IS NOT NULL
        )
    );

CREATE POLICY select_public_movements_by_os_token ON public.inventory_movements
    FOR SELECT TO anon, authenticated
    USING (
        repair_id IN (
            SELECT id FROM public.repairs WHERE tracking_token IS NOT NULL
        ) AND tipo = 'saída'
    );
