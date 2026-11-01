import { NextResponse } from 'next/server';
import { createCRMServerClient } from '@/app/admin/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createCRMServerClient();

    // 1. Obter último heartbeat da VPS
    const { data: latestHeartbeat, error: hbErr } = await supabase
      .from('noc_vps_heartbeats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (hbErr) {
      console.error('[NOC API] Erro ao buscar heartbeat:', hbErr);
    }

    // 2. Obter últimos 5 heartbeats para mini histórico
    const { data: heartbeatsHistory } = await supabase
      .from('noc_vps_heartbeats')
      .select('cpu_percent, ram_used_mb, disk_used_gb, containers_running, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Obter histórico de backups (Módulo 5)
    const { data: backups } = await supabase
      .from('noc_backup_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(8);

    // 4. Obter histórico do watchdog / autocura (Módulo 6)
    const { data: watchdogEvents } = await supabase
      .from('noc_watchdog_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // 5. Obter comandos recentes da fila
    const { data: recentCommands } = await supabase
      .from('noc_command_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    // 6. Obter contratos MSP para o gerador de instalador
    const { data: mspContracts } = await supabase
      .from('msp_contracts')
      .select('id, company_name, slug, tier, max_endpoints, sla_level')
      .order('company_name', { ascending: true })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        latestHeartbeat: latestHeartbeat || null,
        heartbeatsHistory: heartbeatsHistory || [],
        backups: backups || [],
        watchdogEvents: watchdogEvents || [],
        recentCommands: recentCommands || [],
        mspContracts: mspContracts || [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[NOC API] Erro geral ao processar telemetria:', err);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || 'Erro interno ao consultar telemetria do NOC',
      },
      { status: 500 }
    );
  }
}
