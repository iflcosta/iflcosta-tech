-- ============================================================================
-- IF TECH - SUPABASE MIGRATION V1.0 (REESTRUTURAÇÃO COMPLETA)
-- Projeto: togrnwxazuweuihlaljo (iflcosta-tech)
-- Executar no Supabase SQL Editor: https://supabase.com/dashboard/project/togrnwxazuweuihlaljo/sql/new
-- ============================================================================

-- 1. LIMPEZA LIMPA DE TABELAS LEGADAS (SE EXISTIREM)
DROP TABLE IF EXISTS "Activity" CASCADE;
DROP TABLE IF EXISTS "Message" CASCADE;
DROP TABLE IF EXISTS "Analysis" CASCADE;
DROP TABLE IF EXISTS "Prospect" CASCADE;

DROP TABLE IF EXISTS financial_ledger CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS msp_telemetry_alerts CASCADE;
DROP TABLE IF EXISTS msp_managed_devices CASCADE;
DROP TABLE IF EXISTS msp_contracts CASCADE;
DROP TABLE IF EXISTS project_timesheet_entries CASCADE;
DROP TABLE IF EXISTS project_milestones CASCADE;
DROP TABLE IF EXISTS software_projects CASCADE;
DROP TABLE IF EXISTS work_order_items CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS technicians CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- 2. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. ENUMS
DO $$ BEGIN
    CREATE TYPE client_type_enum AS ENUM ('B2C', 'B2B');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE client_status_enum AS ENUM ('Lead', 'Ativo', 'Inadimplente', 'Inativo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE os_status_enum AS ENUM (
        'Triagem', 
        'Diagnostico_Concluido', 
        'Aguardando_Sinal_Peca', 
        'Peca_Encomendada', 
        'Na_Bancada', 
        'Teste_Estresse_QA', 
        'Pronto', 
        'Entregue', 
        'Cancelado'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE os_service_type_enum AS ENUM ('Hardware_Reparo', 'Hardware_Upgrade', 'Montagem_PC', 'Software_Bancada', 'MSP_Avulso');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE project_status_enum AS ENUM ('Briefing', 'Em_Desenvolvimento', 'Em_QA', 'Homologacao_Cliente', 'Concluido', 'Pausado', 'Cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE milestone_billing_type_enum AS ENUM ('Entrada_50', 'Entrega_50', 'Hora_Avulsa', 'Mensalidade_Suporte');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE msp_tier_enum AS ENUM ('Essential', 'Professional', 'Enterprise', 'Custom');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE device_type_enum AS ENUM ('Workstation', 'Notebook', 'Server_Local', 'Network_Firewall', 'Network_Switch', 'NAS_Storage');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE device_criticality_enum AS ENUM ('Standard', 'High_VIP_Financeiro', 'Mission_Critical_Server', 'Network_Core');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE backup_status_enum AS ENUM ('Sucesso', 'Alerta_Incompleto', 'Falha_Critica', 'Nunca_Executado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ledger_entry_type_enum AS ENUM ('Entrada', 'Saida');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_category_enum AS ENUM (
        'Bancada_Peca', 
        'Bancada_MaoDeObra', 
        'Software_Projeto', 
        'Software_Suporte', 
        'MSP_MRR', 
        'Taxa_LevaETraz', 
        'Custo_Fornecedor_Peca', 
        'Repasse_Tecnico_Comissao', 
        'Infra_Ferramentas_Cloud', 
        'Despesa_Operacional'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('Pix', 'Cartao_Credito', 'Cartao_Debito', 'Boleto', 'Transferencia_TED', 'Dinheiro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('Pendente', 'Pago', 'Parcialmente_Pago', 'Atrasado', 'Cancelado', 'Estornado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. TABELAS CENTRAIS

-- Clientes (CRM Único)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type client_type_enum NOT NULL DEFAULT 'B2C',
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(20) UNIQUE NOT NULL,
    state_registration VARCHAR(30),
    email VARCHAR(255),
    whatsapp VARCHAR(20) NOT NULL,
    phone_alt VARCHAR(20),
    contact_person VARCHAR(100),
    postal_code VARCHAR(10),
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20) NOT NULL,
    complement VARCHAR(100),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Bragança Paulista',
    state VARCHAR(2) NOT NULL DEFAULT 'SP',
    status client_status_enum NOT NULL DEFAULT 'Ativo',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_document ON clients(document);
CREATE INDEX idx_clients_whatsapp ON clients(whatsapp);

-- Técnicos & Comissionamento
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'Lead_Engineer', 'Senior_Tech', 'Junior_Tech'
    commission_rate_labor DECIMAL(5,2) NOT NULL DEFAULT 35.00,
    pix_key VARCHAR(100) NOT NULL,
    pix_key_type VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ordens de Serviço (Hardware / Bancada)
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number SERIAL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    
    device_brand VARCHAR(100) NOT NULL,
    device_model VARCHAR(150) NOT NULL,
    device_serial VARCHAR(100),
    device_password_hint VARCHAR(100),
    
    service_type os_service_type_enum NOT NULL DEFAULT 'Hardware_Reparo',
    reported_defect TEXT NOT NULL,
    visual_checklist_json JSONB DEFAULT '{}'::jsonb,
    entry_photos_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    exit_photos_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_pickup_delivery BOOLEAN NOT NULL DEFAULT FALSE,
    pickup_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    technical_diagnosis TEXT,
    stress_test_crystaldisk_health INT,
    stress_test_furmark_temp_max INT,
    stress_test_aida64_temp_max INT,
    stress_test_boot_time_seconds INT,
    stress_test_notes TEXT,
    
    status os_status_enum NOT NULL DEFAULT 'Triagem',
    
    total_parts DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_labor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_order DECIMAL(10,2) GENERATED ALWAYS AS (total_parts + total_labor + pickup_fee - total_discount) STORED,
    
    parts_deposit_required DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    parts_deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
    parts_deposit_paid_at TIMESTAMP WITH TIME ZONE,
    
    public_tracking_token UUID DEFAULT gen_random_uuid() UNIQUE,
    warranty_terms_cdc_days INT NOT NULL DEFAULT 90,
    warranty_certificate_pdf_url TEXT,
    warranty_valid_until DATE,
    
    technician_commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    technician_commission_settled BOOLEAN NOT NULL DEFAULT FALSE,
    
    entry_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ready_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_orders_client ON work_orders(client_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_token ON work_orders(public_tracking_token);

-- Itens da OS (Peças com margem e Mão de Obra)
CREATE TABLE work_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- 'Part' ou 'Labor'
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projetos de Software (Pilar 2)
CREATE TABLE software_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    lead_developer_id UUID REFERENCES technicians(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url VARCHAR(255),
    production_url VARCHAR(255),
    staging_url VARCHAR(255),
    status project_status_enum NOT NULL DEFAULT 'Briefing',
    total_contract_value DECIMAL(10,2) NOT NULL,
    monthly_support_value DECIMAL(10,2) DEFAULT 0.00,
    deadline_date DATE,
    lighthouse_score_performance INT,
    lighthouse_score_seo INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Milestones 50/50 do Software
CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    billing_type milestone_billing_type_enum NOT NULL DEFAULT 'Entrada_50',
    amount DECIMAL(10,2) NOT NULL,
    percentage_of_total DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    due_date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contratos MSP Recorrentes (Pilar 3)
CREATE TABLE msp_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    tier msp_tier_enum NOT NULL DEFAULT 'Essential',
    monthly_recurring_value DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Calculado da soma dos dispositivos
    billing_day_of_month INT NOT NULL DEFAULT 5,
    minimum_term_months INT NOT NULL DEFAULT 12,
    preventive_visits_per_month INT NOT NULL DEFAULT 1,
    sla_response_remote_hours INT NOT NULL DEFAULT 2,
    sla_response_onsite_hours INT NOT NULL DEFAULT 4,
    start_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dispositivos / Estações Gerenciadas (Precificação Modular: 69,90 / 109,90 / 189,90)
CREATE TABLE msp_managed_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES msp_contracts(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_type device_type_enum NOT NULL DEFAULT 'Workstation',
    criticality device_criticality_enum NOT NULL DEFAULT 'Standard',
    assigned_user VARCHAR(100),
    os_info VARCHAR(100),
    ip_local VARCHAR(45),
    rmm_agent_id VARCHAR(100),
    rmm_agent_online BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    backup_routine_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    backup_schedule_cron VARCHAR(50),
    last_backup_status backup_status_enum NOT NULL DEFAULT 'Nunca_Executado',
    last_backup_at TIMESTAMP WITH TIME ZONE,
    monthly_seat_price DECIMAL(10,2) NOT NULL DEFAULT 69.90, -- 69.90, 109.90 ou 189.90
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Faturas & Conciliação Financeira
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number SERIAL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    software_project_id UUID REFERENCES software_projects(id) ON DELETE SET NULL,
    msp_contract_id UUID REFERENCES msp_contracts(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    payment_method payment_method_enum NOT NULL DEFAULT 'Pix',
    pix_payload_copiaecola TEXT,
    pix_txid VARCHAR(100),
    status payment_status_enum NOT NULL DEFAULT 'Pendente',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Livro Caixa & DRE
CREATE TABLE financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type ledger_entry_type_enum NOT NULL,
    category transaction_category_enum NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DADOS INICIAIS / SEED

-- Técnico Líder IFL
INSERT INTO technicians (name, email, whatsapp, role, commission_rate_labor, pix_key, pix_key_type)
VALUES ('IF Tech - Lead Engineer', 'contato@iflcosta.tech', '5511919691542', 'Lead_Engineer', 100.00, '5511919691542', 'TELEFONE')
ON CONFLICT DO NOTHING;

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE msp_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE msp_managed_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
-- Service Role tem acesso total
CREATE POLICY "service_role_all_clients" ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_technicians" ON technicians FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_work_orders" ON work_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_work_order_items" ON work_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_software_projects" ON software_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_project_milestones" ON project_milestones FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_contracts" ON msp_contracts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_msp_managed_devices" ON msp_managed_devices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_invoices" ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_financial_ledger" ON financial_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Leitura Pública por Tracking Token (Para a página de acompanhamento do cliente /os/[id])
CREATE POLICY "public_tracking_work_orders" ON work_orders FOR SELECT TO anon USING (true);
CREATE POLICY "public_tracking_work_order_items" ON work_order_items FOR SELECT TO anon USING (true);

-- 7. CONCEDER PERMISSÕES DE SCHEMA E TABELAS (ESSENCIAL PARA A API SUPABASE)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

