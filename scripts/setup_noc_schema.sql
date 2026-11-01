-- =========================================================================
-- IF TECH NOC & VPS CONTROL PLANE SCHEMA
-- Tabelas dedicadas a heartbeats, backups, watchdog e trilha de auditoria
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.noc_vps_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id VARCHAR(50) NOT NULL DEFAULT 'ovh-bhs-prod-01',
    cpu_percent NUMERIC(5,2) NOT NULL,
    load_1m NUMERIC(5,2) NOT NULL,
    ram_used_mb INT NOT NULL,
    ram_available_mb INT NOT NULL,
    swap_used_mb INT NOT NULL,
    disk_used_gb NUMERIC(5,2) NOT NULL,
    disk_reclaimable_gb NUMERIC(5,2) DEFAULT 0,
    containers_running INT NOT NULL,
    containers_unhealthy INT NOT NULL DEFAULT 0,
    whatsapp_connected BOOLEAN NOT NULL DEFAULT true,
    min_ssl_days_remaining INT,
    payload_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_noc_heartbeats_created ON public.noc_vps_heartbeats(created_at DESC);

CREATE TABLE IF NOT EXISTS public.noc_backup_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_type VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    status VARCHAR(20) NOT NULL,
    targets_included TEXT[] NOT NULL,
    archive_filename VARCHAR(200),
    archive_size_bytes BIGINT,
    archive_sha256 VARCHAR(64),
    offsite_destination VARCHAR(100),
    duration_ms INT,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_noc_backups_started ON public.noc_backup_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS public.noc_watchdog_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity VARCHAR(20) NOT NULL,
    rule_code VARCHAR(60) NOT NULL,
    target_service VARCHAR(80) NOT NULL,
    diagnosis TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    healed_successfully BOOLEAN NOT NULL DEFAULT true,
    included_in_morning_digest BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_noc_watchdog_created ON public.noc_watchdog_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.noc_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    actor_email VARCHAR(120) NOT NULL,
    actor_ip VARCHAR(45),
    action VARCHAR(80) NOT NULL,
    target VARCHAR(120) NOT NULL,
    request_meta JSONB DEFAULT '{}'::jsonb,
    response_status INT NOT NULL,
    latency_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_noc_audit_created ON public.noc_audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.msp_telemetry_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.msp_contracts(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.msp_managed_devices(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'WARN',
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    details TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_msp_alerts_device ON public.msp_telemetry_alerts(device_id);

-- RLS
ALTER TABLE public.noc_vps_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_backup_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_watchdog_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msp_telemetry_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_noc_heartbeats" ON public.noc_vps_heartbeats;
CREATE POLICY "allow_all_noc_heartbeats" ON public.noc_vps_heartbeats FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_noc_backups" ON public.noc_backup_runs;
CREATE POLICY "allow_all_noc_backups" ON public.noc_backup_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_noc_watchdog" ON public.noc_watchdog_events;
CREATE POLICY "allow_all_noc_watchdog" ON public.noc_watchdog_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_noc_audit" ON public.noc_audit_logs;
CREATE POLICY "allow_all_noc_audit" ON public.noc_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_msp_telemetry_alerts" ON public.msp_telemetry_alerts;
CREATE POLICY "allow_all_msp_telemetry_alerts" ON public.msp_telemetry_alerts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
