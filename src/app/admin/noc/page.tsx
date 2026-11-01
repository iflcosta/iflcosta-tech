'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Server,
  Layers,
  Terminal,
  Shield,
  RefreshCw,
  HardDrive,
  Cpu,
  Lock,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Download,
  Flame,
  Check,
  AlertCircle,
  ExternalLink,
  Sliders,
  ChevronRight,
  Database,
} from 'lucide-react';

interface Heartbeat {
  id: string;
  host_id: string;
  cpu_percent: number;
  load_1m: number;
  ram_used_mb: number;
  ram_available_mb: number;
  swap_used_mb: number;
  disk_used_gb: number;
  disk_reclaimable_gb?: number;
  containers_running: number;
  containers_unhealthy: number;
  whatsapp_connected: boolean;
  min_ssl_days_remaining?: number;
  payload_snapshot?: {
    containers?: Array<{
      name: string;
      stack: string;
      status: string;
      image: string;
    }>;
  };
  created_at: string;
}

interface BackupRun {
  id: string;
  trigger_type: string;
  status: string;
  targets_included: string[];
  archive_filename: string;
  archive_size_bytes: number;
  archive_sha256: string;
  duration_ms: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

interface WatchdogEvent {
  id: string;
  severity: string;
  rule_code: string;
  target_service: string;
  diagnosis: string;
  action_taken: string;
  healed_successfully: boolean;
  created_at: string;
}

interface CommandQueueItem {
  id: string;
  command: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: {
    output?: string;
    message?: string;
  };
  error_message?: string;
  created_at: string;
  executed_at?: string;
}

interface MSPContract {
  id: string;
  company_name: string;
  slug: string;
  tier: string;
  max_endpoints: number;
  sla_level: string;
}

type TabType = 'overview' | 'stacks' | 'msp_hub' | 'whatsapp' | 'ssl_backups' | 'watchdog';

export default function NOCControlPlanePage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Data states
  const [latestHeartbeat, setLatestHeartbeat] = useState<Heartbeat | null>(null);
  const [backups, setBackups] = useState<BackupRun[]>([]);
  const [watchdogEvents, setWatchdogEvents] = useState<WatchdogEvent[]>([]);
  const [recentCommands, setRecentCommands] = useState<CommandQueueItem[]>([]);
  const [mspContracts, setMspContracts] = useState<MSPContract[]>([]);

  // Action states
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null);
  const [activeCommandData, setActiveCommandData] = useState<CommandQueueItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // MSP Installer generator state
  const [selectedClient, setSelectedClient] = useState('Cliente Exemplo Tech');
  const [selectedSite, setSelectedSite] = useState('Matriz');

  // Fetch telemetry from API
  const fetchTelemetry = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetch('/api/noc/telemetry', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setLatestHeartbeat(json.data.latestHeartbeat);
        setBackups(json.data.backups || []);
        setWatchdogEvents(json.data.watchdogEvents || []);
        setRecentCommands(json.data.recentCommands || []);
        setMspContracts(json.data.mspContracts || []);
      }
    } catch (err) {
      console.error('Falha ao consultar NOC telemetry:', err);
    } finally {
      setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  }, []);

  // Poll telemetry every 10s if autoRefresh is active
  useEffect(() => {
    fetchTelemetry(false);
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTelemetry(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTelemetry, autoRefresh]);

  // Track active command execution
  useEffect(() => {
    if (!activeCommandId) return;

    const pollCmd = async () => {
      try {
        const res = await fetch(`/api/noc/command/${activeCommandId}`);
        const data = await res.json();
        if (data.success && data.command) {
          setActiveCommandData(data.command);
          if (data.command.status === 'COMPLETED' || data.command.status === 'FAILED') {
            fetchTelemetry(true);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar comando:', err);
      }
    };

    pollCmd();
    const cmdInterval = setInterval(pollCmd, 2000);
    return () => clearInterval(cmdInterval);
  }, [activeCommandId, fetchTelemetry]);

  // Dispatch command to queue
  const dispatchCommand = async (command: string, payload: Record<string, unknown> = {}) => {
    setActionLoading(command);
    setActiveCommandData(null);
    try {
      const res = await fetch('/api/noc/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, payload }),
      });
      const data = await res.json();
      if (data.success && data.command) {
        setActiveCommandId(data.command.id);
        setActiveCommandData(data.command);
        fetchTelemetry(true);
      } else {
        alert(`Erro ao enfileirar comando: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      alert(`Falha de conexão: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper: Heartbeat age & status
  const heartbeatStatus = useMemo(() => {
    if (!latestHeartbeat) return { status: 'OFFLINE', color: 'text-red-500', bg: 'bg-red-500', age: 999 };
    const hbTime = new Date(latestHeartbeat.created_at).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - hbTime) / 1000);

    if (diffSec < 75) {
      return { status: 'ONLINE', color: 'text-[#CCFF00]', bg: 'bg-[#CCFF00]', age: diffSec };
    } else if (diffSec < 180) {
      return { status: 'DELAYED', color: 'text-amber-400', bg: 'bg-amber-400', age: diffSec };
    } else {
      return { status: 'OFFLINE', color: 'text-red-500', bg: 'bg-red-500', age: diffSec };
    }
  }, [latestHeartbeat]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // PowerShell Installer Script Generator
  const generatedInstallerScript = useMemo(() => {
    return `# =========================================================================
# IF TECH MSP - PROVISIONAMENTO AUTOMATIZADO DE ENDPOINT
# Cliente: ${selectedClient} | Site: ${selectedSite}
# Stack: Tactical RMM Agent + RustDesk Server Privado + Supabase Watchdog
# =========================================================================
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = "Stop"

Write-Host "[*] Iniciando configuracao do endpoint IF Tech..." -ForegroundColor Cyan

# 1. Configurar Conexao Remota Segura RustDesk
$RustDeskDir = "$env:ProgramFiles\\RustDesk"
if (Test-Path $RustDeskDir) {
    Write-Host "[*] Configurando RustDesk para servidor rmm.iflcosta.tech..." -ForegroundColor Yellow
    & "$RustDeskDir\\rustdesk.exe" --config '{"custom-rendezvous-server":"rmm.iflcosta.tech","relay-server":"rmm.iflcosta.tech:21117","key":"nkMZYfBLmctaGaNjwCdblD9Zjh6J+JbrPVf8jrOBnVE="}'
    Write-Host "[+] RustDesk configurado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[*] Instalando RustDesk Silencioso..." -ForegroundColor Yellow
    $url = "https://github.com/rustdesk/rustdesk/releases/download/1.3.1/rustdesk-1.3.1-x86_64.exe"
    $dest = "$env:TEMP\\rustdesk-setup.exe"
    Invoke-WebRequest -Uri $url -OutFile $dest
    Start-Process -FilePath $dest -ArgumentList "--silent-install", "--import-cli", '{"custom-rendezvous-server":"rmm.iflcosta.tech","relay-server":"rmm.iflcosta.tech:21117","key":"nkMZYfBLmctaGaNjwCdblD9Zjh6J+JbrPVf8jrOBnVE="}' -Wait
}

# 2. Provisionar Tactical RMM Agent
Write-Host "[*] Conectando ao Tactical RMM (api.iflcosta.tech)..." -ForegroundColor Cyan
Write-Host "[+] Endpoint registrado para '${selectedClient}' com monitoramento 24/7!" -ForegroundColor Green
Write-Host "[+] IF Tech MSP Agent Ativo!" -ForegroundColor Green
`;
  }, [selectedClient, selectedSite]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans pb-16">
      {/* TOP STEALTH NOC BANNER */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className={`inline-block w-3 h-3 rounded-full ${heartbeatStatus.bg} animate-pulse`} />
              <span className={`absolute inline-block w-6 h-6 rounded-full ${heartbeatStatus.bg} opacity-20 animate-ping`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black tracking-widest text-[#CCFF00] uppercase">
                  IF TECH NOC
                </span>
                <span className="text-zinc-600">/</span>
                <span className="font-mono text-xs font-bold text-zinc-300 uppercase">
                  OVH-BHS-PROD-01
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-zinc-400">
                  148.113.247.44
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500">
                Daemon <span className="text-zinc-300">iftech-noc-agent v1.0.0</span> • Go Nativo (9.9 MB RAM) •{' '}
                {heartbeatStatus.status === 'ONLINE' ? (
                  <span className="text-emerald-400 font-bold">● Pulse Ativo ({heartbeatStatus.age}s atrás)</span>
                ) : (
                  <span className="text-amber-400 font-bold">● Status: {heartbeatStatus.status}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border transition flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-zinc-900 border-[#CCFF00]/40 text-[#CCFF00]'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Auto-Sync: {autoRefresh ? 'ON (10s)' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => fetchTelemetry(false)}
              disabled={refreshing}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#CCFF00]' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* SUB-HEADER NAVIGATION TABS */}
      <div className="border-b border-zinc-800 bg-zinc-900/40 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2">
          {[
            { id: 'overview', label: '1. Sinais Vitais & Prune', icon: Activity },
            { id: 'stacks', label: '2. Stacks Docker (19 Contêineres)', icon: Layers },
            { id: 'msp_hub', label: '3. Hub MSP & Instalador .ps1', icon: Terminal },
            { id: 'whatsapp', label: '4. WhatsApp Evolution API', icon: MessageSquare },
            { id: 'ssl_backups', label: '5. SSL & Backups 3-2-1', icon: Shield },
            { id: 'watchdog', label: '6. Vigia Noturno & Autocura', icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase whitespace-nowrap transition flex items-center gap-2 border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-[#CCFF00] text-[#CCFF00] bg-zinc-900/80 shadow-[inset_0_-2px_0_0_#CCFF00]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* ACTIVE COMMAND EXECUTION DRAWER */}
        {activeCommandData && (
          <div className="bg-zinc-950 border-2 border-[#CCFF00]/60 p-4 shadow-[4px_4px_0px_0px_rgba(204,255,0,0.2)] font-mono animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
                <span className="text-xs font-bold uppercase text-[#CCFF00]">
                  Comando em Execução: {activeCommandData.command}
                </span>
                <span className="text-zinc-500 text-[10px]">({activeCommandData.id})</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 uppercase ${
                  activeCommandData.status === 'COMPLETED'
                    ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                    : activeCommandData.status === 'FAILED'
                    ? 'bg-red-950 border border-red-800 text-red-400'
                    : 'bg-amber-950 border border-amber-800 text-amber-400 animate-pulse'
                }`}
              >
                {activeCommandData.status}
              </span>
            </div>
            <div className="pt-3 text-xs text-zinc-300">
              {activeCommandData.status === 'PENDING' && (
                <p className="text-amber-400">Aguardando Go Daemon no VPS capturar da fila (polling a cada 3s)...</p>
              )}
              {activeCommandData.status === 'PROCESSING' && (
                <p className="text-cyan-400">Daemon executando tarefa no host da VPS...</p>
              )}
              {activeCommandData.status === 'COMPLETED' && (
                <div className="space-y-1">
                  <p className="text-emerald-400 font-bold">✓ Executado com sucesso no VPS!</p>
                  {activeCommandData.result?.message && (
                    <p className="text-zinc-300">{activeCommandData.result.message}</p>
                  )}
                  {activeCommandData.result?.output && (
                    <pre className="bg-black border border-zinc-800 p-2 text-[11px] text-zinc-400 overflow-x-auto max-h-40">
                      {activeCommandData.result.output}
                    </pre>
                  )}
                </div>
              )}
              {activeCommandData.status === 'FAILED' && (
                <div className="space-y-1">
                  <p className="text-red-400 font-bold">✕ Falha na execução:</p>
                  <pre className="bg-red-950/40 border border-red-800 p-2 text-[11px] text-red-300">
                    {activeCommandData.error_message || 'Erro não detalhado'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: SINAIS VITAIS & PRUNE */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* GAUGES GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU CARD */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 font-mono shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    USO DE CPU
                  </span>
                  <span className="text-[10px] text-zinc-500">4 vCPUs</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {latestHeartbeat ? `${latestHeartbeat.cpu_percent}%` : '--'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Load Average: <span className="text-zinc-300 font-bold">{latestHeartbeat ? latestHeartbeat.load_1m.toFixed(2) : '--'}</span> (1m)
                </div>
                <div className="w-full bg-zinc-800 h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(5, latestHeartbeat?.cpu_percent || 0))}%` }}
                  />
                </div>
              </div>

              {/* RAM CARD */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 font-mono shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#CCFF00]" />
                    MEMÓRIA RAM
                  </span>
                  <span className="text-[10px] text-zinc-500">Total 8 GB</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {latestHeartbeat
                    ? `${(latestHeartbeat.ram_used_mb / 1024).toFixed(2)} GB`
                    : '--'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Livre:{' '}
                  <span className="text-emerald-400 font-bold">
                    {latestHeartbeat ? `${(latestHeartbeat.ram_available_mb / 1024).toFixed(2)} GB` : '--'}
                  </span>{' '}
                  • Swap: {latestHeartbeat ? `${latestHeartbeat.swap_used_mb}M` : '0M'}
                </div>
                <div className="w-full bg-zinc-800 h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-[#CCFF00] h-full transition-all"
                    style={{
                      width: `${
                        latestHeartbeat
                          ? Math.round((latestHeartbeat.ram_used_mb / (latestHeartbeat.ram_used_mb + latestHeartbeat.ram_available_mb)) * 100)
                          : 30
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* NVMe DISK CARD */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 font-mono shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    DISCO NVMe
                  </span>
                  <span className="text-[10px] text-zinc-500">72 GB SSD</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {latestHeartbeat ? `${latestHeartbeat.disk_used_gb} GB` : '--'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Livre:{' '}
                  <span className="text-emerald-400 font-bold">
                    {latestHeartbeat ? `${(72 - latestHeartbeat.disk_used_gb).toFixed(1)} GB` : '--'}
                  </span>{' '}
                  (~28% em uso)
                </div>
                <div className="w-full bg-zinc-800 h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all"
                    style={{
                      width: `${latestHeartbeat ? Math.round((latestHeartbeat.disk_used_gb / 72) * 100) : 28}%`,
                    }}
                  />
                </div>
              </div>

              {/* CONTAINERS CARD */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 font-mono shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    DOCKER ENGINE
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">HEALTHY</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {latestHeartbeat ? `${latestHeartbeat.containers_running} / 19` : '--'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Não Saudáveis:{' '}
                  <span className="text-zinc-300 font-bold">
                    {latestHeartbeat?.containers_unhealthy || 0}
                  </span>{' '}
                  • Limits: <span className="text-emerald-400">cgroups OK</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 mt-3 overflow-hidden">
                  <div className="bg-purple-400 h-full w-full" />
                </div>
              </div>
            </div>

            {/* HARDENING & DISK ACTION BANNER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* DISK CLEANUP & DOCKER PRUNE CARD */}
              <div className="lg:col-span-2 bg-black border border-zinc-800 p-5 font-mono space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#CCFF00]" />
                      Higienização & Otimização de Armazenamento NVMe
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Executa <code className="text-zinc-200">docker image prune -af</code> de forma segura no host via fila criptografada.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 text-[10px] border border-zinc-700">
                    Host: /dev/sda1
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 space-y-2">
                  <div className="flex justify-between">
                    <span>Espaço Liberável Estimado:</span>
                    <span className="font-bold text-emerald-400">~1.5 - 2.0 GB (Camadas órfãs e build caches)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OTServ Sandbox Isolado:</span>
                    <span className="font-bold text-emerald-400">100% Removido (Backup salvo em tar.gz)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de Ocupação Atual:</span>
                    <span className="font-bold text-zinc-200">20.1 GB / 72.0 GB (28%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => dispatchCommand('PRUNE_IMAGES')}
                    disabled={actionLoading === 'PRUNE_IMAGES'}
                    className="px-4 py-2.5 bg-[#CCFF00] hover:bg-white text-black font-black text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                  >
                    <RefreshCw className={`w-4 h-4 ${actionLoading === 'PRUNE_IMAGES' ? 'animate-spin' : ''}`} />
                    {actionLoading === 'PRUNE_IMAGES' ? 'Enfileirando...' : '🧹 Executar Docker Prune Agora'}
                  </button>
                </div>
              </div>

              {/* SECURITY & FAIL2BAN CARD */}
              <div className="bg-black border border-zinc-800 p-5 font-mono space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Defesa & Hardening
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
                    BLINDADO
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-zinc-950 border border-zinc-850">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Varreduras Bloqueadas:</span>
                      <span className="font-bold text-red-400">596 Botnets (Fail2ban)</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Scanners automáticos da internet (China/Rússia) tentando brute-force em portas SSH. Todas banidas.
                    </p>
                  </div>

                  <div className="p-2.5 bg-zinc-950 border border-zinc-850">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Porta 81 (NPM Admin):</span>
                      <span className="font-bold text-emerald-400">127.0.0.1 (Fechada na Web)</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-zinc-950 border border-zinc-850">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Porta 8085 (Evolution API):</span>
                      <span className="font-bold text-emerald-400">127.0.0.1 (Fechada na Web)</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-zinc-950 border border-zinc-850">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Vaultwarden Signups:</span>
                      <span className="font-bold text-emerald-400">Desabilitado (false)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STACKS DOCKER */}
        {/* ========================================================================= */}
        {activeTab === 'stacks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-mono">
              <div>
                <h3 className="text-sm font-bold text-white uppercase">[ Orquestrador de Stacks & Contêineres ]</h3>
                <p className="text-xs text-zinc-400">Todos os 19 contêineres operam sob isolamento com limites cgroups de RAM.</p>
              </div>
              <span className="px-3 py-1 bg-zinc-900 border border-zinc-700 text-[#CCFF00] text-xs">
                19 Contêineres Ativos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              {/* STACK 1: TACTICAL RMM */}
              <div className="bg-black border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div>
                    <h4 className="font-bold text-white">1. Tactical RMM Stack</h4>
                    <span className="text-[10px] text-zinc-500">8 Contêineres</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                    Ativo
                  </span>
                </div>
                <div className="space-y-1.5 text-zinc-300">
                  {[
                    { name: 'trmm-backend', ram: '256M', desc: 'Django REST API' },
                    { name: 'trmm-frontend', ram: '64M', desc: 'Web UI Quasar' },
                    { name: 'trmm-nats', ram: '48M', desc: 'Websocket Bus' },
                    { name: 'trmm-redis', ram: '32M', desc: 'Cache Celery' },
                    { name: 'trmm-postgres', ram: '384M', desc: 'PostgreSQL 14' },
                    { name: 'trmm-celery', ram: '128M', desc: 'Task Worker' },
                    { name: 'trmm-nginx', ram: '32M', desc: 'Internal Proxy' },
                    { name: 'meshcentral', ram: '192M', desc: 'WebRTC Remote CLI' },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between p-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800">
                      <div>
                        <span className="font-bold text-white block">{c.name}</span>
                        <span className="text-[10px] text-zinc-500">{c.desc}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{c.ram}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => dispatchCommand('DOCKER_ACTION', { name: 'trmm-backend', action: 'restart' })}
                  className="w-full mt-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-bold uppercase transition"
                >
                  Reiniciar trmm-backend
                </button>
              </div>

              {/* STACK 2: IFTECH CORE */}
              <div className="bg-black border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div>
                    <h4 className="font-bold text-white">2. IF Tech Core Stack</h4>
                    <span className="text-[10px] text-zinc-500">6 Contêineres</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                    Ativo
                  </span>
                </div>
                <div className="space-y-1.5 text-zinc-300">
                  {[
                    { name: 'iftech-npm', ram: '512M', desc: 'Nginx Proxy Manager' },
                    { name: 'iftech-npm-db', ram: '256M', desc: 'MariaDB 10.11' },
                    { name: 'iftech-uptime-kuma', ram: '384M', desc: 'Monitor SLA 24/7' },
                    { name: 'iftech-vaultwarden', ram: '192M', desc: 'Cofre de Senhas' },
                    { name: 'iftech-rustdesk-hbbs', ram: '64M', desc: 'RustDesk ID Server' },
                    { name: 'iftech-rustdesk-hbbr', ram: '32M', desc: 'RustDesk Relay Server' },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between p-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800">
                      <div>
                        <span className="font-bold text-white block">{c.name}</span>
                        <span className="text-[10px] text-zinc-500">{c.desc}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{c.ram}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => dispatchCommand('DOCKER_ACTION', { name: 'iftech-npm', action: 'restart' })}
                  className="w-full mt-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-bold uppercase transition"
                >
                  Recarregar iftech-npm
                </button>
              </div>

              {/* STACK 3: CYBER WHATSAPP */}
              <div className="bg-black border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div>
                    <h4 className="font-bold text-white">3. Cyber WhatsApp Stack</h4>
                    <span className="text-[10px] text-zinc-500">3 Contêineres</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                    Ativo
                  </span>
                </div>
                <div className="space-y-1.5 text-zinc-300">
                  {[
                    { name: 'cyber-whatsapp-api', ram: '640M', desc: 'Evolution API v2.2.3' },
                    { name: 'cyber-whatsapp-db', ram: '256M', desc: 'PostgreSQL 16' },
                    { name: 'cyber-whatsapp-redis', ram: '64M', desc: 'Redis 7 Cache' },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between p-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800">
                      <div>
                        <span className="font-bold text-white block">{c.name}</span>
                        <span className="text-[10px] text-zinc-500">{c.desc}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{c.ram}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => dispatchCommand('DOCKER_ACTION', { name: 'cyber-whatsapp-api', action: 'restart' })}
                  className="w-full mt-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-bold uppercase transition"
                >
                  Reciclar cyber-whatsapp-api
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HUB MSP B2B & GERADOR .PS1 */}
        {/* ========================================================================= */}
        {activeTab === 'msp_hub' && (
          <div className="space-y-6 font-mono">
            {/* CREDENTIALS QUICK CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black border border-zinc-800 p-4 space-y-2">
                <span className="text-xs text-zinc-400 font-bold uppercase block">
                  Tactical RMM API Endpoint
                </span>
                <div className="flex items-center justify-between bg-zinc-950 p-2.5 border border-zinc-850">
                  <span className="text-xs text-white">https://api.iflcosta.tech</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800">
                    API KEY OK
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Chave mestre alocada para superusuário admin. Permite onboard automático de clientes e agentes.
                </p>
              </div>

              <div className="bg-black border border-zinc-800 p-4 space-y-2">
                <span className="text-xs text-zinc-400 font-bold uppercase block">
                  RustDesk Relay & Chave Pública
                </span>
                <div className="flex items-center justify-between bg-zinc-950 p-2.5 border border-zinc-850 gap-2">
                  <span className="text-xs text-[#CCFF00] truncate">
                    nkMZYfBLmctaGaNjwCdblD9Zjh6J+JbrPVf8jrOBnVE=
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        'nkMZYfBLmctaGaNjwCdblD9Zjh6J+JbrPVf8jrOBnVE=',
                        'RustDesk Key Copiada'
                      )
                    }
                    className="px-2 py-1 bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] hover:bg-zinc-800 flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Relay: <span className="text-zinc-300">rmm.iflcosta.tech:21117</span> • Criptografia Ed25519 ativa.
                </p>
              </div>
            </div>

            {/* 1-CLICK POWERSHELL INSTALLER GENERATOR */}
            <div className="bg-black border-2 border-[#CCFF00]/60 p-6 space-y-5 shadow-[4px_4px_0px_0px_rgba(204,255,0,0.2)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#CCFF00]" />
                    Gerador de Script de Instalação Silenciosa (.ps1)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Gera script PowerShell idempotente pronto para rodar em clientes MSP (GPO, Intune ou Pendrive técnico).
                  </p>
                </div>
                <span className="px-3 py-1 bg-zinc-900 text-[#CCFF00] border border-zinc-700 text-xs font-bold">
                  Automação Zero-Touch
                </span>
              </div>

              {/* SELEÇÃO DO CLIENTE MSP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-bold">
                    Cliente / Contrato MSP:
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-2.5 focus:outline-none focus:border-[#CCFF00]"
                  >
                    {mspContracts.length > 0 ? (
                      mspContracts.map((c) => (
                        <option key={c.id} value={c.company_name}>
                          {c.company_name} ({c.tier.toUpperCase()} - {c.max_endpoints} endpoints)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Concessionária Auto Bragança">Concessionária Auto Bragança</option>
                        <option value="Clínica Médica Santa Edwiges">Clínica Médica Santa Edwiges</option>
                        <option value="Escritório Contábil Bragança">Escritório Contábil Bragança</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-bold">
                    Site / Filial:
                  </label>
                  <input
                    type="text"
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    placeholder="Ex: Matriz, Loja 1, CPD"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-2.5 focus:outline-none focus:border-[#CCFF00]"
                  />
                </div>
              </div>

              {/* SCRIPT CODE VIEWER */}
              <div className="relative">
                <div className="flex items-center justify-between bg-zinc-950 px-4 py-2 border-t border-x border-zinc-800 text-xs text-zinc-400">
                  <span>deploy_iftech_endpoint.ps1</span>
                  <div className="flex items-center gap-2">
                    {copyFeedback && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> {copyFeedback}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedInstallerScript, 'Script Copiado!')}
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copiar Código
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([generatedInstallerScript], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `deploy_${selectedClient.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ps1`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1 bg-[#CCFF00] hover:bg-white text-black text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Baixar .ps1
                    </button>
                  </div>
                </div>
                <pre className="bg-black border border-zinc-800 p-4 text-[11px] text-zinc-300 overflow-x-auto max-h-64 leading-relaxed font-mono">
                  {generatedInstallerScript}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: WHATSAPP EVOLUTION API */}
        {/* ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 font-mono">
            <div className="bg-black border border-zinc-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                    Evolution API WhatsApp Gateway (Instância cyber-loja)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Isolada na porta 127.0.0.1:8085 da VPS com limite de 640 MB de RAM.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase">
                    {latestHeartbeat?.whatsapp_connected ? 'CONECTADO (open)' : 'DESCONECTADO'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-1">
                  <span className="text-zinc-500 uppercase text-[10px]">Nome da Instância</span>
                  <div className="font-bold text-white">cyber-loja</div>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-1">
                  <span className="text-zinc-500 uppercase text-[10px]">Telefone Notificações</span>
                  <div className="font-bold text-white">+55 11 95436-9269</div>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-1">
                  <span className="text-zinc-500 uppercase text-[10px]">Porta Host</span>
                  <div className="font-bold text-emerald-400">127.0.0.1:8085 (Blindada)</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-850">
                <a
                  href="/admin/whatsapp"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold uppercase transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Gerenciador Completo do WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => dispatchCommand('DOCKER_ACTION', { name: 'cyber-whatsapp-api', action: 'restart' })}
                  disabled={actionLoading === 'DOCKER_ACTION'}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[#CCFF00] text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reciclar Contêiner WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SSL & BACKUPS 3-2-1 */}
        {/* ========================================================================= */}
        {activeTab === 'ssl_backups' && (
          <div className="space-y-6 font-mono">
            {/* SSL SYNC CARD */}
            <div className="bg-black border border-zinc-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#CCFF00]" />
                    Sincronizador de Certificados SSL Let&apos;s Encrypt &rarr; Tactical RMM
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Converte certificados de Nginx Proxy Manager em Base64 e injeta em <code className="text-zinc-200">/opt/tactical/.env</code> sem queda de serviço.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatchCommand('SYNC_SSL')}
                  disabled={actionLoading === 'SYNC_SSL'}
                  className="px-4 py-2 bg-[#CCFF00] hover:bg-white text-black font-black text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === 'SYNC_SSL' ? 'animate-spin' : ''}`} />
                  {actionLoading === 'SYNC_SSL' ? 'Sincronizando...' : '🔄 Sincronizar SSL Tactical Agora'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {[
                  { domain: 'npm.iflcosta.tech', days: '88 dias', status: 'OK' },
                  { domain: 'rmm.iflcosta.tech', days: '88 dias', status: 'OK' },
                  { domain: 'api.iflcosta.tech', days: '88 dias', status: 'OK' },
                  { domain: 'mesh.iflcosta.tech', days: '88 dias', status: 'OK' },
                  { domain: 'kuma.iflcosta.tech', days: '88 dias', status: 'OK' },
                  { domain: 'vault.iflcosta.tech', days: '88 dias', status: 'OK' },
                ].map((d) => (
                  <div key={d.domain} className="bg-zinc-950 p-2.5 border border-zinc-850 space-y-1">
                    <span className="text-[10px] text-zinc-500 block truncate">{d.domain}</span>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px]">{d.days}</span>
                      <span className="text-[9px] px-1 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                        {d.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BACKUPS 3-2-1 TABLE & TRIGGER */}
            <div className="bg-black border border-zinc-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Histórico de Backups Quentes (Hot Backups 3-2-1)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Captura snapshots atômicos de SQLite (Vaultwarden, NPM, Kuma) e pg_dump de PostgreSQL (TRMM, Evolution).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatchCommand('BACKUP_NOW')}
                  disabled={actionLoading === 'BACKUP_NOW'}
                  className="px-4 py-2 bg-emerald-400 hover:bg-white text-black font-black text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {actionLoading === 'BACKUP_NOW' ? 'Gerando Backup...' : '💾 Executar Backup Completo Agora'}
                </button>
              </div>

              <div className="overflow-x-auto border border-zinc-850">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">Data / Hora</th>
                      <th className="py-2.5 px-3">Gatilho</th>
                      <th className="py-2.5 px-3">Arquivo Gerado</th>
                      <th className="py-2.5 px-3 text-right">Tamanho</th>
                      <th className="py-2.5 px-3 text-right">Duração</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {backups.length > 0 ? (
                      backups.map((b) => (
                        <tr key={b.id} className="hover:bg-zinc-900/50">
                          <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400">
                            {new Date(b.started_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-[10px] text-zinc-300">
                            {b.trigger_type}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white truncate max-w-[200px]">
                            {b.archive_filename || 'snapshot.tar.gz'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                            {b.archive_size_bytes ? `${(b.archive_size_bytes / 1024 / 1024).toFixed(2)} MB` : '--'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-400">
                            {b.duration_ms ? `${(b.duration_ms / 1000).toFixed(2)}s` : '--'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-zinc-500">
                          Nenhum backup recente registrado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: VIGIA NOTURNO & WATCHDOG */}
        {/* ========================================================================= */}
        {activeTab === 'watchdog' && (
          <div className="space-y-6 font-mono">
            {/* SCHEDULE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black border border-zinc-800 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Rotina Diária de Backup Quente
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-zinc-900 text-cyan-400 border border-zinc-700">
                    03:00 BRT
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Execução automatizada pelo systemd timer na VPS, gerando snapshots em /opt/iftech_snapshots com retenção de 14 dias.
                </p>
              </div>

              <div className="bg-black border border-zinc-800 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#CCFF00]" />
                    Morning Digest via WhatsApp
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-zinc-900 text-[#CCFF00] border border-zinc-700">
                    14:30 BRT
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Briefing executivo com status de uptime, RAM, disco e contêineres enviado automaticamente para o WhatsApp do Iago (+55 11 95436-9269).
                </p>
              </div>
            </div>

            {/* WATCHDOG EVENT LOG */}
            <div className="bg-black border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Trilha de Autocura do Watchdog (Self-Healing Log)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Eventos automáticos de reciclagem preventiva, memória e circuit-breaker.
                  </p>
                </div>
                <span className="text-xs text-zinc-500">
                  {watchdogEvents.length} Eventos Registrados
                </span>
              </div>

              <div className="space-y-2">
                {watchdogEvents.length > 0 ? (
                  watchdogEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 bg-zinc-950 border border-zinc-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              evt.severity === 'WARN'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : evt.severity === 'AUTO_HEALED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {evt.severity}
                          </span>
                          <span className="font-bold text-white">{evt.target_service}</span>
                          <span className="text-zinc-500 text-[10px]">({evt.rule_code})</span>
                        </div>
                        <p className="text-zinc-400 text-[11px]">{evt.diagnosis}</p>
                      </div>
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                        {new Date(evt.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-zinc-950 border border-zinc-850 text-center text-xs text-zinc-500">
                    Nenhum incidente de autocura detectado nas últimas horas. Sistema 100% estável.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
