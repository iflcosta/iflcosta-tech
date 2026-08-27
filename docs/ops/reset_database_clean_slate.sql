-- ==============================================================================
-- IF TECH — RESET TOTAL DE DADOS & BANCO LIMPO PARA TESTES (CLEAN SLATE)
-- Projeto: togrnwxazuweuihlaljo (iflcosta-tech)
-- Executar em: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. DESABILITAR TRIGGERS TEMPORARIAMENTE PARA LIMPEZA RÁPIDA
SET session_replication_role = 'replica';

-- 2. TRUNCATE EM TODAS AS TABELAS DE DADOS (COM CASCADE)
-- Limpeza de Hardware, Bancada & Itens
TRUNCATE TABLE work_order_items CASCADE;
TRUNCATE TABLE work_orders CASCADE;
TRUNCATE TABLE clients CASCADE;

-- Limpeza de Software & Timesheet
TRUNCATE TABLE software_timesheet CASCADE;
TRUNCATE TABLE software_milestones CASCADE;
TRUNCATE TABLE software_projects CASCADE;

-- Limpeza de MSP, Chamados & Dispositivos
TRUNCATE TABLE msp_tickets CASCADE;
TRUNCATE TABLE msp_devices CASCADE;
TRUNCATE TABLE msp_preventive_visits CASCADE;
TRUNCATE TABLE msp_contracts CASCADE;

-- Limpeza de PDV & Movimentações de Estoque
TRUNCATE TABLE pos_sale_items CASCADE;
TRUNCATE TABLE pos_sales CASCADE;
TRUNCATE TABLE inventory_movements CASCADE;

-- Limpeza de Financeiro & Livro Caixa
TRUNCATE TABLE financial_ledger CASCADE;
TRUNCATE TABLE commissions CASCADE;
TRUNCATE TABLE tracking_rate_limits CASCADE;
TRUNCATE TABLE nps_feedback CASCADE;

-- 3. REINICIAR SEQUÊNCIAS AUTO-INCREMENT (OS começa do #1001)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'work_orders_os_number_seq') THEN
        ALTER SEQUENCE work_orders_os_number_seq RESTART WITH 1001;
    END IF;
END $$;

-- 4. REABILITAR REPLICAÇÃO E TRIGGERS
SET session_replication_role = 'origin';

-- 5. VERIFICAÇÃO DE CONTADORES ZERADOS
SELECT 'clients' as tabela, count(*) as registros FROM clients
UNION ALL
SELECT 'work_orders', count(*) FROM work_orders
UNION ALL
SELECT 'software_projects', count(*) FROM software_projects
UNION ALL
SELECT 'msp_contracts', count(*) FROM msp_contracts
UNION ALL
SELECT 'pos_sales', count(*) FROM pos_sales
UNION ALL
SELECT 'financial_ledger', count(*) FROM financial_ledger;
