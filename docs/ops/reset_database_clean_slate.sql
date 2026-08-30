-- ==============================================================================
-- IF TECH — RESET TOTAL DE DADOS & BANCO LIMPO PARA TESTES (CLEAN SLATE)
-- Projeto: togrnwxazuweuihlaljo (iflcosta-tech)
-- ==============================================================================

SET session_replication_role = 'replica';

DO $$
DECLARE
    t text;
    target_tables text[] := ARRAY[
        'work_order_items', 'work_orders', 'clients',
        'software_timesheet', 'software_milestones', 'software_projects',
        'msp_tickets', 'msp_devices', 'msp_preventive_visits', 'msp_contracts',
        'pos_sale_items', 'pos_sales', 'inventory_movements',
        'financial_ledger', 'commissions', 'tracking_rate_limits', 'nps_feedback'
    ];
BEGIN
    FOREACH t IN ARRAY target_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE', t);
            RAISE NOTICE 'Tabela % limpa com sucesso.', t;
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'work_orders_os_number_seq') THEN
        ALTER SEQUENCE work_orders_os_number_seq RESTART WITH 1001;
        RAISE NOTICE 'Sequencia de OS reiniciada para 1001.';
    END IF;
END $$;

SET session_replication_role = 'origin';

-- Verificação final de tabelas públicas
SELECT table_name, 
       (xpath('/row/cnt/text()', xml_count))[1]::text::int as total_registros
FROM (
  SELECT table_name, 
         query_to_xml(format('select count(*) as cnt from public.%I', table_name), false, true, '') as xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) s;
