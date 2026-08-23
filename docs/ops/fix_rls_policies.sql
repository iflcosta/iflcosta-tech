-- ==============================================================================
-- IFL COSTA TECH — AJUSTE DE POLÍTICAS RLS PARA O COCKPIT ADMIN (ANON KEY)
-- Execute este script no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ==============================================================================

-- 1. Habilitar INSERT / SELECT / UPDATE em Clientes
DO $$ BEGIN
    DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
    DROP POLICY IF EXISTS "anon_select_clients" ON clients;
    DROP POLICY IF EXISTS "anon_update_clients" ON clients;
EXCEPTION WHEN OTHERS THEN null; END $$;

CREATE POLICY "anon_insert_clients" ON clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE TO anon USING (true);

-- 2. Habilitar INSERT / SELECT / UPDATE em Ordens de Serviço (work_orders)
DO $$ BEGIN
    DROP POLICY IF EXISTS "anon_insert_work_orders" ON work_orders;
    DROP POLICY IF EXISTS "anon_update_work_orders" ON work_orders;
EXCEPTION WHEN OTHERS THEN null; END $$;

CREATE POLICY "anon_insert_work_orders" ON work_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_work_orders" ON work_orders FOR UPDATE TO anon USING (true);

-- 3. Habilitar INSERT / SELECT / UPDATE em Itens da OS (work_order_items)
DO $$ BEGIN
    DROP POLICY IF EXISTS "anon_insert_work_order_items" ON work_order_items;
    DROP POLICY IF EXISTS "anon_update_work_order_items" ON work_order_items;
EXCEPTION WHEN OTHERS THEN null; END $$;

CREATE POLICY "anon_insert_work_order_items" ON work_order_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_work_order_items" ON work_order_items FOR UPDATE TO anon USING (true);

-- 4. Iniciar a Numeração das OSs em #1001 (Padrão Comercial da IFL Costa Tech)
ALTER SEQUENCE work_orders_os_number_seq RESTART WITH 1001;

-- 5. Conceder Permissões de Sequence
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
