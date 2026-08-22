# Modelagem de Dados & Schema do ERP / CRM Unificado
**Projeto:** IFLCosta Tech  
**Objetivo:** Estrutura relacional normalizada (PostgreSQL 15+) para gestão integrada de Clientes (B2C/B2B), Ordens de Serviço (Hardware/Bancada), Estoque/Almoxarifado e Compras, Fechamento de Comissões Quinzenais, Projetos de Software (Milestones 50/50), Contratos MSP com Cobrança Híbrida por Estação/Criticidade, Service Desk/Tickets com SLA 2h/4h, Visitas Preventivas Geolocalizadas, Telemetria RMM/Backup ("Dead Man's Snitch"), Autenticação Passwordless (Magic Link), Termos Legais/LGPD e Motor Financeiro com DRE.

---

## 1. DDL Unificado (Data Definition Language) - PostgreSQL 15+

```sql
-- ============================================================================
-- EXTENSÕES E ENUMS GLOBAIS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums do CRM e Clientes
CREATE TYPE client_type_enum AS ENUM ('B2C', 'B2B');
CREATE TYPE client_status_enum AS ENUM ('Lead', 'Ativo', 'Inadimplente', 'Inativo');

-- Enums de Hardware e Bancada
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
CREATE TYPE os_service_type_enum AS ENUM ('Hardware_Reparo', 'Hardware_Upgrade', 'Montagem_PC', 'Software_Bancada', 'MSP_Avulso');

-- Enums de Estoque e Compras
CREATE TYPE stock_movement_type_enum AS ENUM ('Entrada_Nota_Fiscal', 'Saida_Ordem_Servico', 'Ajuste_Perda', 'Devolucao_Fornecedor');
CREATE TYPE purchase_order_status_enum AS ENUM ('Cotacao', 'Aguardando_Sinal_Cliente', 'Comprado', 'Em_Transito', 'Recebido_Bancada', 'Cancelado');

-- Enums de Comissões Técnicas
CREATE TYPE commission_status_enum AS ENUM ('Aberta', 'Aprovada_Gestor', 'Paga');

-- Enums de Projetos de Software
CREATE TYPE project_status_enum AS ENUM ('Briefing', 'Em_Desenvolvimento', 'Em_QA', 'Homologacao_Cliente', 'Concluido', 'Pausado', 'Cancelado');
CREATE TYPE milestone_billing_type_enum AS ENUM ('Entrada_50', 'Entrega_50', 'Hora_Avulsa', 'Mensalidade_Suporte');

-- Enums de TI Gerenciada (MSP) & Service Desk
CREATE TYPE msp_tier_enum AS ENUM ('Essencial', 'Profissional', 'Corporativo_Enterprise', 'Custom');
CREATE TYPE device_type_enum AS ENUM ('Workstation', 'Notebook', 'Server_Local', 'Network_Firewall', 'Network_Switch', 'NAS_Storage');
CREATE TYPE device_criticality_enum AS ENUM ('Standard', 'High_VIP_Financeiro', 'Mission_Critical_Server', 'Network_Core');
CREATE TYPE backup_status_enum AS ENUM ('Sucesso', 'Alerta_Incompleto', 'Falha_Critica', 'Nunca_Executado');

CREATE TYPE ticket_priority_enum AS ENUM ('Baixa', 'Media', 'Alta', 'Critica_P1');
CREATE TYPE ticket_status_enum AS ENUM ('Aberto', 'Em_Atendimento', 'Aguardando_Cliente', 'Resolvido', 'Fechado');
CREATE TYPE ticket_origin_enum AS ENUM ('WhatsApp', 'Portal_Cliente', 'Alerta_RMM_Automatico', 'Visita_Preventiva', 'Telefone');

-- Enums Financeiros
CREATE TYPE ledger_entry_type_enum AS ENUM ('Entrada', 'Saida');
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
CREATE TYPE payment_method_enum AS ENUM ('Pix', 'Cartao_Credito', 'Cartao_Debito', 'Boleto', 'Transferencia_TED', 'Dinheiro');
CREATE TYPE payment_status_enum AS ENUM ('Pendente', 'Pago', 'Parcialmente_Pago', 'Atrasado', 'Cancelado', 'Estornado');

-- ============================================================================
-- 1. TABELA DE CLIENTES (CRM UNIFICADO)
-- ============================================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type client_type_enum NOT NULL DEFAULT 'B2C',
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255), -- Nome Fantasia para PJ
    document VARCHAR(20) UNIQUE NOT NULL, -- CPF ou CNPJ validado
    state_registration VARCHAR(30), -- Inscrição Estadual (PJ)
    email VARCHAR(255),
    whatsapp VARCHAR(20) NOT NULL,
    phone_alt VARCHAR(20),
    contact_person VARCHAR(100), -- Nome do responsável de TI / compras (PJ)
    
    -- Endereço Completo para Leva-e-Traz e Visitas MSP
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

-- ============================================================================
-- 2. CADASTRO DE TÉCNICOS & ENGENHEIROS (REPASSE & COMISSIONAMENTO)
-- ============================================================================
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    tier VARCHAR(20) CHECK (tier IN ('Junior', 'Pleno', 'Senior', 'Especialista_Parceiro')) NOT NULL,
    commission_rate_labor DECIMAL(5, 2) NOT NULL DEFAULT 35.00, -- 35% de padrão para Jr
    pix_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. FECHAMENTO DE COMISSÕES QUINZENAIS (DIAS 05 E 20)
-- ============================================================================
CREATE TABLE commission_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_code VARCHAR(50) UNIQUE NOT NULL, -- Ex: COM-2026-08-Q2
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    
    total_labor_amount DECIMAL(10, 2) NOT NULL,
    total_commission_amount DECIMAL(10, 2) NOT NULL,
    deductions_amount DECIMAL(10, 2) DEFAULT 0.00,
    net_payout_amount DECIMAL(10, 2) NOT NULL,
    
    status commission_status_enum NOT NULL DEFAULT 'Aberta',
    pix_receipt_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. ESTOQUE & ALMOXARIFADO DE PEÇAS DE GIRO RÁPIDO E COMPRAS
-- ============================================================================
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL, -- Ex: SSD-NVME-1TB-KNG
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'SSD', 'RAM', 'Pasta_Termica', 'Bateria', 'Cabo'
    unit_of_measure VARCHAR(10) DEFAULT 'UN',
    
    current_stock INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 2, -- Ponto de reposição automática
    
    average_cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    default_margin_pct DECIMAL(5, 2) NOT NULL DEFAULT 35.00, -- 35% a 40% markup padrão
    default_selling_price DECIMAL(10, 2) NOT NULL,
    
    location_shelf VARCHAR(50), -- Prateleira / Gaveta na Bancada
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. PILAR 1: HARDWARE, BANCADA & ORDENS DE SERVIÇO
-- ============================================================================
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number SERIAL UNIQUE, -- Número sequencial legível (ex: OS #1042)
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    parent_work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL, -- Vínculo para Retorno de Garantia (RMA)
    is_warranty_return BOOLEAN NOT NULL DEFAULT false,
    
    service_type os_service_type_enum NOT NULL DEFAULT 'Hardware_Reparo',
    status os_status_enum NOT NULL DEFAULT 'Triagem',
    
    -- Dados do Equipamento
    device_brand VARCHAR(100) NOT NULL,
    device_model VARCHAR(150) NOT NULL,
    serial_number VARCHAR(100),
    device_password VARCHAR(255), -- PIN/Senha cifrado
    
    -- Checklist de Entrada
    is_powering_on BOOLEAN NOT NULL DEFAULT true,
    charger_included BOOLEAN NOT NULL DEFAULT false,
    aesthetic_notes TEXT, -- Riscos, amassados, parafusos faltantes
    intake_photos_urls JSONB DEFAULT '[]'::jsonb, -- Array de URLs das fotos dos 4 ângulos
    
    -- Relato e Diagnóstico Técnico
    reported_issue TEXT NOT NULL,
    technical_diagnosis TEXT,
    
    -- Métricas e QA de Bancada
    crystaldisk_health_pct INT CHECK (crystaldisk_health_pct BETWEEN 0 AND 100),
    memtest_cycles_passed INT DEFAULT 0,
    stress_test_duration_minutes INT DEFAULT 15,
    cpu_stress_max_temp_celsius DECIMAL(4, 1),
    gpu_stress_max_temp_celsius DECIMAL(4, 1),
    boot_time_seconds INT,
    qa_approved BOOLEAN DEFAULT false,
    qa_notes TEXT,
    
    -- Logística de Leva-e-Traz
    requires_delivery BOOLEAN DEFAULT false,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    delivery_address TEXT,
    
    -- Garantia Legal CDC 90D
    warranty_terms_signed BOOLEAN DEFAULT false,
    warranty_valid_until DATE,
    warranty_hash VARCHAR(64), -- Código SHA-256 de autenticidade do laudo
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_orders_client ON work_orders(client_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);

-- Tabela de Itens de Mão de Obra e Peças da OS
CREATE TABLE work_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL, -- Se baixado de estoque local
    commission_settlement_id UUID REFERENCES commission_settlements(id) ON DELETE SET NULL, -- Vínculo de fechamento quinzenal
    
    service_catalog_code VARCHAR(20), -- Ex: HW-01, HW-02, HW-03
    description VARCHAR(255) NOT NULL,
    is_part BOOLEAN NOT NULL DEFAULT false, -- false = Mão de Obra, true = Peça/Hardware
    
    quantity INT NOT NULL DEFAULT 1,
    cost_price_unit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    margin_percentage DECIMAL(5, 2) DEFAULT 0.00,
    selling_price_unit DECIMAL(10, 2) NOT NULL,
    discount_unit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Status de Aquisição da Peça (Para travar fluxo de compra)
    part_supplier VARCHAR(100),
    part_tracking_code VARCHAR(100),
    part_is_ordered BOOLEAN DEFAULT false,
    part_is_arrived BOOLEAN DEFAULT false,
    
    -- Repasse Técnico Calculado
    technician_payout_amount DECIMAL(10, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Movimentações de Estoque
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    type stock_movement_type_enum NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos de Compra Sob Encomenda (Back-to-Back)
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number SERIAL UNIQUE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    supplier_name VARCHAR(150) NOT NULL,
    item_description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price_target DECIMAL(10, 2) NOT NULL,
    
    status purchase_order_status_enum NOT NULL DEFAULT 'Cotacao',
    tracking_code VARCHAR(100),
    supplier_invoice_number VARCHAR(100),
    estimated_arrival_date DATE,
    actual_arrival_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. PILAR 2: PROJETOS DE SOFTWARE & ENGENHARIA WEB
-- ============================================================================
CREATE TABLE software_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(50) UNIQUE NOT NULL, -- Ex: PRJ-2026-001
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    service_code VARCHAR(20) NOT NULL, -- SW-01 (Landing Page), SW-02 (WhatsApp), SW-03 (Painel Web)
    status project_status_enum NOT NULL DEFAULT 'Briefing',
    
    scope_description TEXT NOT NULL,
    repository_url VARCHAR(255),
    staging_url VARCHAR(255),
    production_url VARCHAR(255),
    
    -- Métricas de QA e Homologação
    lighthouse_performance_score INT CHECK (lighthouse_performance_score BETWEEN 0 AND 100),
    lighthouse_seo_score INT CHECK (lighthouse_seo_score BETWEEN 0 AND 100),
    lighthouse_best_practices_score INT CHECK (lighthouse_best_practices_score BETWEEN 0 AND 100),
    qa_homologated_at TIMESTAMP WITH TIME ZONE,
    
    -- Valores e Faturamento
    total_budget DECIMAL(10, 2) NOT NULL,
    recurrent_support_mrr DECIMAL(10, 2) DEFAULT 0.00, -- Ex: R$ 150/mês para SW-02
    
    start_date DATE,
    estimated_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Milestones e Entregáveis do Projeto (Regra 50% Entrada / 50% Homologação)
CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    billing_type milestone_billing_type_enum NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    percentage_of_total DECIMAL(5, 2) NOT NULL, -- 50.00 para entrada, 50.00 para entrega
    due_date DATE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_invoice_generated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Horas Técnicas Adicionais / Timesheet
CREATE TABLE project_timesheet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id),
    activity_description TEXT NOT NULL,
    hours_spent DECIMAL(5, 2) NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 130.00, -- Tarifa base SW-04
    is_billable BOOLEAN NOT NULL DEFAULT true,
    is_billed BOOLEAN NOT NULL DEFAULT false,
    worked_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. PILAR 3: TI GERENCIADA (MSP) & INVENTÁRIO HÍBRIDO DE DISPOSITIVOS
-- ============================================================================
CREATE TABLE msp_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(50) UNIQUE NOT NULL, -- Ex: MSP-2026-004
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    plan_tier msp_tier_enum NOT NULL DEFAULT 'Essencial',
    
    -- Valores Base e Recorrência
    base_mrr_value DECIMAL(10, 2) NOT NULL, -- Valor base do plano (ex: R$ 490, R$ 890, R$ 1490)
    extra_devices_mrr DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Soma dos dispositivos adicionais
    total_mrr DECIMAL(10, 2) NOT NULL, -- base_mrr_value + extra_devices_mrr
    
    due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    contract_start_date DATE NOT NULL,
    contract_renewal_date DATE NOT NULL,
    
    -- Acordos de Nível de Serviço (SLA) & Visitas
    sla_response_remote_hours INT NOT NULL DEFAULT 2, -- SLA horas para suporte remoto
    sla_emergency_onsite_hours INT DEFAULT 4, -- SLA horas para visita emergencial física em Bragança
    included_monthly_visits INT NOT NULL DEFAULT 1, -- 1 visita para Essencial, 2 para Pro
    used_visits_current_month INT NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Suspenso', 'Cancelado')),
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventário de Dispositivos e Estações Gerenciadas (Cobrança Híbrida Modular)
CREATE TABLE msp_managed_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES msp_contracts(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    hostname VARCHAR(100) NOT NULL,
    assigned_user VARCHAR(100), -- Nome do colaborador que usa a estação
    department VARCHAR(100), -- ex: Financeiro, RH, Recepção, Diretoria
    
    device_type device_type_enum NOT NULL DEFAULT 'Workstation',
    criticality device_criticality_enum NOT NULL DEFAULT 'Standard',
    
    -- Precificação Modular Individual da Estação
    monthly_rate DECIMAL(10, 2) NOT NULL DEFAULT 75.00, -- R$ 75 std, R$ 120 VIP, R$ 280 Server
    is_billable BOOLEAN NOT NULL DEFAULT true,
    
    -- Identificadores Técnicos & Agente RMM
    os_version VARCHAR(100),
    cpu_model VARCHAR(100),
    ram_gb INT,
    storage_info VARCHAR(255),
    mac_address VARCHAR(20),
    ipv4_local VARCHAR(20),
    rmm_agent_id VARCHAR(100) UNIQUE,
    rmm_is_online BOOLEAN DEFAULT true,
    rmm_last_seen TIMESTAMP WITH TIME ZONE,
    
    -- Status de Proteção & Antivírus
    antivirus_installed BOOLEAN DEFAULT true,
    antivirus_status VARCHAR(50) DEFAULT 'Protegido',
    
    -- Política de Backup Redundante 3-2-1
    backup_enabled BOOLEAN DEFAULT false,
    backup_tool VARCHAR(50), -- Rclone, Duplicati, Synology Cloud Sync, VEEAM
    backup_storage_target VARCHAR(100), -- S3 AWS, Backblaze B2, NAS Local
    backup_last_run TIMESTAMP WITH TIME ZONE,
    backup_last_status backup_status_enum DEFAULT 'Nunca_Executado',
    backup_size_gb DECIMAL(8, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_msp_devices_contract ON msp_managed_devices(contract_id);
CREATE INDEX idx_msp_devices_rmm ON msp_managed_devices(rmm_agent_id);

-- Tabela de Logs de Telemetria e Alertas RMM / Backup
CREATE TABLE msp_telemetry_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES msp_managed_devices(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES msp_contracts(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(50) NOT NULL, -- 'Backup_Failed', 'Disk_Full_85', 'SMART_Error', 'Agent_Offline', 'Thermal_Throttling'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Baixa', 'Media', 'Alta', 'Critica')),
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. SERVICE DESK & TICKETS MSP (SLA 2H / 4H)
-- ============================================================================
CREATE TABLE msp_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number SERIAL UNIQUE, -- Ex: Ticket #301
    contract_id UUID NOT NULL REFERENCES msp_contracts(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    device_id UUID REFERENCES msp_managed_devices(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    origin ticket_origin_enum NOT NULL DEFAULT 'Portal_Cliente',
    priority ticket_priority_enum NOT NULL DEFAULT 'Media',
    status ticket_status_enum NOT NULL DEFAULT 'Aberto',
    
    -- Gestão de SLA
    sla_response_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    sla_resolution_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    sla_breached BOOLEAN DEFAULT false,
    
    resolution_summary TEXT,
    time_spent_minutes INT DEFAULT 0,
    client_satisfaction_rating INT CHECK (client_satisfaction_rating BETWEEN 1 AND 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE msp_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES msp_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('Client', 'Technician', 'System_Bot')),
    sender_name VARCHAR(100) NOT NULL,
    message_body TEXT NOT NULL,
    attachment_urls JSONB DEFAULT '[]'::jsonb,
    is_internal_note BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. VISITAS PREVENTIVAS MSP & CHECK-IN GEOLOCALIZADO
-- ============================================================================
CREATE TABLE msp_onsite_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES msp_contracts(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
    
    scheduled_date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    
    preventive_checklist JSONB NOT NULL DEFAULT '{
        "antivirus_updated": false,
        "backups_verified": false,
        "physical_cleaning_done": false,
        "ups_battery_checked": false,
        "server_thermal_ok": false,
        "disk_smart_reviewed": false
    }'::jsonb,
    
    visit_notes TEXT,
    client_rep_name VARCHAR(100),
    client_rep_signature_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. MÓDULO FINANCEIRO, FATURAMENTO, LIVRO CAIXA (DRE) E IDEMPOTÊNCIA
-- ============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Ex: FAT-2026-0891
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    
    -- Relações de Origem (Exclusivas ou Mistas)
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    software_project_id UUID REFERENCES software_projects(id) ON DELETE SET NULL,
    project_milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
    msp_contract_id UUID REFERENCES msp_contracts(id) ON DELETE SET NULL,
    
    description VARCHAR(255) NOT NULL,
    category transaction_category_enum NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(10, 2) NOT NULL,
    
    payment_method payment_method_enum NOT NULL DEFAULT 'Pix',
    status payment_status_enum NOT NULL DEFAULT 'Pendente',
    
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Integração Gateway Asaas (Online)
    asaas_customer_id VARCHAR(100),
    asaas_payment_id VARCHAR(100),
    asaas_invoice_url TEXT, -- Link de pagamento Asaas (Pix / Cartão 12x)
    asaas_subscription_id VARCHAR(100), -- ID da assinatura recorrente MSP
    
    -- Dados de Liquidação Pix / QR Code
    pix_copy_paste TEXT,
    pix_qr_code_url TEXT,
    gateway_transaction_id VARCHAR(100),
    
    -- Conciliação de Pagamento Presencial (Maquininha de Cartão POS)
    is_pos_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    pos_terminal_fee DECIMAL(10, 2) DEFAULT 0.00, -- Taxa da maquininha descontada
    pos_card_brand VARCHAR(50), -- 'Mastercard', 'Visa', 'Elo', 'Hipercard'
    pos_installments INT DEFAULT 1, -- Parcelas da maquininha
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Livro Caixa & Fluxo Realizado (DRE / Extrato de Contas)
CREATE TABLE financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    type ledger_entry_type_enum NOT NULL,
    category transaction_category_enum NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    
    payment_method payment_method_enum NOT NULL,
    competence_date DATE NOT NULL DEFAULT CURRENT_DATE,
    settlement_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Relacionamentos Opcionais para DRE de Linha de Negócio
    work_order_id UUID REFERENCES work_orders(id),
    software_project_id UUID REFERENCES software_projects(id),
    msp_contract_id UUID REFERENCES msp_contracts(id),
    technician_id UUID REFERENCES technicians(id),
    commission_settlement_id UUID REFERENCES commission_settlements(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_ledger_date ON financial_ledger(competence_date);
CREATE INDEX idx_financial_ledger_category ON financial_ledger(category);

-- Tabela de Idempotência para Webhooks de Gateway de Pagamento
CREATE TABLE payment_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway VARCHAR(50) NOT NULL DEFAULT 'Gerencianet_Efí_Pix',
    event_id VARCHAR(100) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. PORTAL DO CLIENTE (AUTENTICAÇÃO PASSWORDLESS / TOKENS)
-- ============================================================================
CREATE TABLE client_portal_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256
    resource_type VARCHAR(30) NOT NULL, -- 'work_order', 'software_project', 'msp_contract', 'all_access'
    resource_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_client_portal_tokens_hash ON client_portal_tokens(token_hash);

-- ============================================================================
-- 12. TERMOS LEGAIS, LGPD E ASSINATURAS DIGITAIS
-- ============================================================================
CREATE TABLE legal_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'LevaETraz_Checkin', 'LevaETraz_Checkout', 'Garantia_90D', 'Homologacao_Software', 'Consentimento_LGPD'
    resource_id UUID NOT NULL,
    
    signer_name VARCHAR(255) NOT NULL,
    signer_document VARCHAR(20) NOT NULL,
    signer_ip_address VARCHAR(45),
    signature_channel VARCHAR(20) NOT NULL DEFAULT 'WhatsApp_OTP',
    
    integrity_hash VARCHAR(64) NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 13. REGISTRO DE DISPAROS DE MENSAGENS E TEMPLATES (AUDIT LOG)
-- ============================================================================
CREATE TABLE communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_name VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    rendered_content TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'WhatsApp',
    sent_status VARCHAR(20) NOT NULL DEFAULT 'Sent',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Documentação Complementar de Arquitetura

Para detalhes aprofundados sobre regras de negócio, jornadas do usuário, diagramas funcionais e especificações de telas do Gestor e Portal do Cliente, consulte os documentos:  
👉 [ERP_ARCHITECTURE_SPECIFICATION.md](file:///c:/tech-solutions-ifl/docs/ops/ERP_ARCHITECTURE_SPECIFICATION.md)  
👉 [ERP_ARCHITECTURE_AUDIT_REVIEW.md](file:///c:/tech-solutions-ifl/docs/ops/ERP_ARCHITECTURE_AUDIT_REVIEW.md)
