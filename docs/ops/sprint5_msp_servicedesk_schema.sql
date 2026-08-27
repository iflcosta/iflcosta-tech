-- =========================================================================
-- SPRINT 5: PORTAL B2B MSP, GESTÃO DE CONTRATOS, ITAM & SERVICE DESK
-- IF TECH // LABORATÓRIO DE ENGENHARIA & OPERAÇÕES DE TI
-- =========================================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA: msp_contracts (Contratos de TI Gerenciada / Planos B2B)
CREATE TABLE IF NOT EXISTS public.msp_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_code VARCHAR(30) UNIQUE NOT NULL, -- Ex: MSP-2026-001
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    company_name VARCHAR(150) NOT NULL,
    company_cnpj VARCHAR(20),
    contact_name VARCHAR(100) NOT NULL,
    contact_whatsapp VARCHAR(30) NOT NULL,
    contact_email VARCHAR(100),
    plan_name VARCHAR(50) NOT NULL DEFAULT 'Pro', -- Essencial (R$ 490), Pro (R$ 890), Enterprise (R$ 1490), Custom
    monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 890.00,
    workstations_included INT NOT NULL DEFAULT 5,
    servers_included INT NOT NULL DEFAULT 1,
    onsite_visits_included INT NOT NULL DEFAULT 1,
    extra_workstation_fee NUMERIC(10,2) NOT NULL DEFAULT 109.90,
    extra_visit_fee NUMERIC(10,2) NOT NULL DEFAULT 180.00,
    sla_remote_hours NUMERIC(4,1) NOT NULL DEFAULT 2.0, -- SLA Remoto (ex: 2h)
    sla_onsite_hours NUMERIC(4,1) NOT NULL DEFAULT 4.0, -- SLA Presencial (ex: 4h)
    backup_321_enabled BOOLEAN NOT NULL DEFAULT true,
    antivirus_managed_enabled BOOLEAN NOT NULL DEFAULT true,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    renewal_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Ativo', -- Ativo, Suspenso, Cancelado, Em_Negociacao
    client_token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA: msp_managed_devices (ITAM - Inventário de Ativos Físicos e Lógicos)
CREATE TABLE IF NOT EXISTS public.msp_managed_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.msp_contracts(id) ON DELETE CASCADE,
    device_tag VARCHAR(50) NOT NULL, -- Ex: WS-FIN-01, SRV-DB-01, REC-01
    hostname VARCHAR(100),
    user_assigned VARCHAR(100), -- Nome do colaborador que usa a máquina
    department VARCHAR(50) DEFAULT 'Geral', -- Financeiro, Diretoria, Recepção, Vendas, TI
    device_type VARCHAR(50) NOT NULL DEFAULT 'Desktop', -- Desktop, Notebook, Servidor_Fisico, Servidor_VM, Firewall_Router, Switch_Gerenciavel
    os_version VARCHAR(100) DEFAULT 'Windows 11 Pro 64-bit',
    cpu_info VARCHAR(100),
    ram_gb INT DEFAULT 16,
    storage_info VARCHAR(150), -- Ex: SSD NVMe 512GB (Saúde 99%)
    ip_internal VARCHAR(45),
    mac_address VARCHAR(30),
    rustdesk_id VARCHAR(50), -- ID único do RustDesk para acesso remoto 1-clique
    tactical_agent_id VARCHAR(100), -- ID do agente Tactical RMM
    last_seen_at TIMESTAMPTZ,
    last_backup_at TIMESTAMPTZ,
    backup_status VARCHAR(30) DEFAULT 'Protegido', -- Protegido, Alerta, Falha, Nao_Configurado
    backup_snitch_token VARCHAR(64) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, device_tag)
);

-- 3. TABELA: msp_tickets (Service Desk / Gestão de Incidentes e Requisições ITIL)
CREATE TABLE IF NOT EXISTS public.msp_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(30) UNIQUE NOT NULL, -- Ex: TCK-2026-0001
    contract_id UUID NOT NULL REFERENCES public.msp_contracts(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.msp_managed_devices(id) ON DELETE SET NULL,
    opened_by_name VARCHAR(100) NOT NULL,
    opened_by_whatsapp VARCHAR(30) NOT NULL,
    opened_by_email VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Suporte_Estacao', -- Suporte_Estacao, Servidor_Banco, Rede_Internet, Backup_321, Ciberseguranca, Impressora_Fiscal, Solicitacao_Acesso
    severity VARCHAR(20) NOT NULL DEFAULT 'P3_Media', -- P1_Critica (SLA 30m), P2_Alta (SLA 1h), P3_Media (SLA 2h), P4_Baixa (SLA 4h)
    status VARCHAR(30) NOT NULL DEFAULT 'Aberto', -- Aberto, Em_Atendimento, Aguardando_Cliente, Encaminhado_Bancada, Resolvido, Fechado, Cancelado
    sla_due_at TIMESTAMPTZ NOT NULL,
    assigned_to VARCHAR(100) DEFAULT 'Engenharia de Redes & Suporte // IF Tech',
    resolution_notes TEXT,
    converted_work_order_number INT, -- Se foi convertido em OS física de bancada
    client_csat INT, -- Avaliação de 1 a 5 estrelas
    csat_feedback TEXT,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA: msp_ticket_messages (Mensagens e Linha do Tempo do Chamado)
CREATE TABLE IF NOT EXISTS public.msp_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.msp_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'Client', 'Technician', 'System'
    sender_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    is_internal_note BOOLEAN NOT NULL DEFAULT false, -- Notas internas visíveis apenas para o técnico
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABELA: msp_onsite_visits (Visitas Técnicas Presenciais / Georreferenciamento)
CREATE TABLE IF NOT EXISTS public.msp_onsite_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_code VARCHAR(30) UNIQUE NOT NULL, -- Ex: VIS-2026-0001
    contract_id UUID NOT NULL REFERENCES public.msp_contracts(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES public.msp_tickets(id) ON DELETE SET NULL,
    visit_type VARCHAR(50) NOT NULL DEFAULT 'Preventiva_Mensal', -- Preventiva_Mensal, Corretiva_Emergencial, Instalacao_Infra, Auditoria_Ciberseguranca
    scheduled_date DATE NOT NULL,
    scheduled_period VARCHAR(20) DEFAULT 'Manha', -- Manha, Tarde, Integral
    technician_name VARCHAR(100) NOT NULL DEFAULT 'Responsável Técnico // IF Tech',
    status VARCHAR(30) NOT NULL DEFAULT 'Agendada', -- Agendada, Em_Deslocamento, Em_Execucao, Concluida, Cancelada
    checked_in_at TIMESTAMPTZ,
    checked_in_lat NUMERIC(10,7),
    checked_in_lng NUMERIC(10,7),
    checked_out_at TIMESTAMPTZ,
    checked_out_lat NUMERIC(10,7),
    checked_out_lng NUMERIC(10,7),
    checklist_data JSONB DEFAULT '{"rack_limpo": true, "temperatura_ok": true, "nobreak_testado": true, "backups_validados": true, "antivirus_atualizado": true}',
    technician_notes TEXT,
    client_rep_name VARCHAR(100),
    signature_data_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABELA: msp_telemetry_alerts (Alertas de Dead Man's Snitch, RMM e Uptime)
CREATE TABLE IF NOT EXISTS public.msp_telemetry_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.msp_contracts(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.msp_managed_devices(id) ON DELETE SET NULL,
    alert_source VARCHAR(50) NOT NULL, -- 'DeadManSnitch_Backup', 'TacticalRMM_Disk', 'UptimeKuma_Link', 'Antivirus_Threat'
    severity VARCHAR(20) NOT NULL DEFAULT 'P1_Critica',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    auto_ticket_id UUID REFERENCES public.msp_tickets(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- RPCS ATÔMICAS // MOTORES DO SERVICE DESK & MSP B2B
-- =========================================================================

-- RPC 1: Criar Contrato MSP Atômico
CREATE OR REPLACE FUNCTION public.rpc_create_msp_contract_atomic(
    p_company_name VARCHAR,
    p_company_cnpj VARCHAR,
    p_contact_name VARCHAR,
    p_contact_whatsapp VARCHAR,
    p_contact_email VARCHAR,
    p_plan_name VARCHAR,
    p_monthly_fee NUMERIC,
    p_workstations INT,
    p_servers INT,
    p_visits INT,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_contract_id UUID;
    v_contract_code VARCHAR(30);
    v_token VARCHAR(64);
    v_seq INT;
BEGIN
    SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq FROM public.msp_contracts;
    v_contract_code := 'MSP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_seq::TEXT, 3, '0');
    v_token := 'msp-tok-' || encode(gen_random_bytes(12), 'hex');

    INSERT INTO public.msp_contracts (
        contract_code,
        company_name,
        company_cnpj,
        contact_name,
        contact_whatsapp,
        contact_email,
        plan_name,
        monthly_fee,
        workstations_included,
        servers_included,
        onsite_visits_included,
        client_token,
        notes
    ) VALUES (
        v_contract_code,
        p_company_name,
        p_company_cnpj,
        p_contact_name,
        p_contact_whatsapp,
        p_contact_email,
        COALESCE(p_plan_name, 'Pro'),
        COALESCE(p_monthly_fee, 890.00),
        COALESCE(p_workstations, 5),
        COALESCE(p_servers, 1),
        COALESCE(p_visits, 1),
        v_token,
        p_notes
    ) RETURNING id INTO v_contract_id;

    RETURN jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_code', v_contract_code,
        'client_token', v_token
    );
END;
$$;

-- RPC 2: Criar Ativo de Hardware (ITAM)
CREATE OR REPLACE FUNCTION public.rpc_create_msp_device_atomic(
    p_contract_id UUID,
    p_device_tag VARCHAR,
    p_hostname VARCHAR,
    p_user_assigned VARCHAR,
    p_department VARCHAR,
    p_device_type VARCHAR,
    p_os_version VARCHAR,
    p_cpu_info VARCHAR,
    p_ram_gb INT,
    p_storage_info VARCHAR,
    p_rustdesk_id VARCHAR,
    p_ip_internal VARCHAR,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dev_id UUID;
    v_snitch_token VARCHAR(64);
BEGIN
    v_snitch_token := 'snitch-' || encode(gen_random_bytes(16), 'hex');

    INSERT INTO public.msp_managed_devices (
        contract_id,
        device_tag,
        hostname,
        user_assigned,
        department,
        device_type,
        os_version,
        cpu_info,
        ram_gb,
        storage_info,
        rustdesk_id,
        ip_internal,
        backup_snitch_token,
        notes
    ) VALUES (
        p_contract_id,
        UPPER(p_device_tag),
        p_hostname,
        p_user_assigned,
        COALESCE(p_department, 'Geral'),
        COALESCE(p_device_type, 'Desktop'),
        COALESCE(p_os_version, 'Windows 11 Pro'),
        p_cpu_info,
        COALESCE(p_ram_gb, 16),
        p_storage_info,
        p_rustdesk_id,
        p_ip_internal,
        v_snitch_token,
        p_notes
    ) RETURNING id INTO v_dev_id;

    RETURN jsonb_build_object(
        'success', true,
        'device_id', v_dev_id,
        'snitch_token', v_snitch_token
    );
END;
$$;

-- RPC 3: Abertura de Ticket no Service Desk
CREATE OR REPLACE FUNCTION public.rpc_create_msp_ticket_atomic(
    p_contract_id UUID,
    p_device_id UUID,
    p_opened_by_name VARCHAR,
    p_opened_by_whatsapp VARCHAR,
    p_title VARCHAR,
    p_description TEXT,
    p_category VARCHAR,
    p_severity VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ticket_id UUID;
    v_ticket_number VARCHAR(30);
    v_seq INT;
    v_sla_hours NUMERIC(4,1);
    v_due_at TIMESTAMPTZ;
BEGIN
    SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq FROM public.msp_tickets;
    v_ticket_number := 'TCK-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_seq::TEXT, 4, '0');

    -- Cálculo dinâmico de SLA
    IF p_severity = 'P1_Critica' THEN
        v_sla_hours := 0.5; -- 30 minutos
    ELSIF p_severity = 'P2_Alta' THEN
        v_sla_hours := 1.0; -- 1 hora
    ELSIF p_severity = 'P3_Media' THEN
        v_sla_hours := 2.0; -- 2 horas
    ELSE
        v_sla_hours := 4.0; -- 4 horas
    END IF;

    v_due_at := NOW() + (v_sla_hours || ' hours')::INTERVAL;

    INSERT INTO public.msp_tickets (
        ticket_number,
        contract_id,
        device_id,
        opened_by_name,
        opened_by_whatsapp,
        title,
        description,
        category,
        severity,
        status,
        sla_due_at
    ) VALUES (
        v_ticket_number,
        p_contract_id,
        p_device_id,
        p_opened_by_name,
        p_opened_by_whatsapp,
        p_title,
        p_description,
        COALESCE(p_category, 'Suporte_Estacao'),
        COALESCE(p_severity, 'P3_Media'),
        'Aberto',
        v_due_at
    ) RETURNING id INTO v_ticket_id;

    -- Inserir primeira mensagem do chamado
    INSERT INTO public.msp_ticket_messages (
        ticket_id,
        sender_type,
        sender_name,
        message
    ) VALUES (
        v_ticket_id,
        'Client',
        p_opened_by_name,
        p_description
    );

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', v_ticket_id,
        'ticket_number', v_ticket_number,
        'sla_due_at', v_due_at
    );
END;
$$;

-- RPC 4: Ping do Dead Man's Snitch (Telemetria de Backup 3-2-1)
CREATE OR REPLACE FUNCTION public.rpc_ping_backup_snitch(
    p_snitch_token VARCHAR,
    p_status VARCHAR,
    p_bytes_transferred BIGINT,
    p_log_summary TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_device RECORD;
    v_auto_ticket_id UUID;
BEGIN
    SELECT * INTO v_device FROM public.msp_managed_devices WHERE backup_snitch_token = p_snitch_token AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de snitch inválido ou inativo.');
    END IF;

    IF p_status = 'SUCCESS' THEN
        UPDATE public.msp_managed_devices
        SET last_backup_at = NOW(),
            last_seen_at = NOW(),
            backup_status = 'Protegido',
            updated_at = NOW()
        WHERE id = v_device.id;

        RETURN jsonb_build_object('success', true, 'status', 'Protegido', 'device_tag', v_device.device_tag);
    ELSE
        -- Falha no backup: Atualiza dispositivo e gera Alerta Crítico
        UPDATE public.msp_managed_devices
        SET backup_status = 'Falha',
            updated_at = NOW()
        WHERE id = v_device.id;

        INSERT INTO public.msp_telemetry_alerts (
            contract_id,
            device_id,
            alert_source,
            severity,
            title,
            message
        ) VALUES (
            v_device.contract_id,
            v_device.id,
            'DeadManSnitch_Backup',
            'P1_Critica',
            'FALHA DE BACKUP 3-2-1: ' || v_device.device_tag,
            COALESCE(p_log_summary, 'O agente UrBackup/Script reportou falha na rotina de backup.')
        );

        RETURN jsonb_build_object('success', true, 'status', 'Falha_Registrada', 'alert_created', true);
    END IF;
END;
$$;

-- RPC 5: Converter Ticket em Ordem de Serviço de Bancada (1-Clique)
CREATE OR REPLACE FUNCTION public.rpc_convert_ticket_to_work_order(
    p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tck RECORD;
    v_contract RECORD;
    v_dev RECORD;
    v_wo_res JSONB;
    v_os_number INT;
BEGIN
    SELECT * INTO v_tck FROM public.msp_tickets WHERE id = p_ticket_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Ticket não encontrado.'); END IF;

    SELECT * INTO v_contract FROM public.msp_contracts WHERE id = v_tck.contract_id;
    SELECT * INTO v_dev FROM public.msp_managed_devices WHERE id = v_tck.device_id;

    -- Cria a OS via rpc_create_work_order_atomic
    SELECT public.rpc_create_work_order_atomic(
        p_client_name => v_contract.company_name || ' (' || v_tck.opened_by_name || ')',
        p_client_whatsapp => v_tck.opened_by_whatsapp,
        p_service_type => 'Hardware_Reparo',
        p_device_brand => COALESCE(v_dev.device_type, 'Estacao Corporativa'),
        p_device_model => COALESCE(v_dev.device_tag || ' - ' || v_dev.hostname, 'Máquina B2B'),
        p_reported_defect => '[Origem Ticket ' || v_tck.ticket_number || '] ' || v_tck.description,
        p_pickup_fee => 0.00,
        p_items => '[]'::JSONB
    ) INTO v_wo_res;

    IF v_wo_res->>'success' = 'true' THEN
        v_os_number := (v_wo_res->>'os_number')::INT;
        
        -- Atualiza o ticket para Encaminhado_Bancada
        UPDATE public.msp_tickets
        SET status = 'Encaminhado_Bancada',
            converted_work_order_number = v_os_number,
            updated_at = NOW()
        WHERE id = p_ticket_id;

        -- Registra mensagem no chamado
        INSERT INTO public.msp_ticket_messages (
            ticket_id,
            sender_type,
            sender_name,
            message
        ) VALUES (
            p_ticket_id,
            'System',
            'IF Tech Core Engine',
            'Equipamento transferido para reparo eletrônico em bancada especializada. Ordem de Serviço #' || v_os_number || ' gerada com sucesso.'
        );

        RETURN jsonb_build_object(
            'success', true,
            'os_number', v_os_number,
            'public_tracking_token', v_wo_res->>'public_tracking_token'
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Falha ao criar OS na bancada.');
    END IF;
END;
$$;

-- Permissões
GRANT ALL ON TABLE public.msp_contracts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.msp_managed_devices TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.msp_tickets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.msp_ticket_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.msp_onsite_visits TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.msp_telemetry_alerts TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.rpc_create_msp_contract_atomic TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_create_msp_device_atomic TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_create_msp_ticket_atomic TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_ping_backup_snitch TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_convert_ticket_to_work_order TO anon, authenticated, service_role;
