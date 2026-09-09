"""
IF Tech Life & Business Ops - Hardware Flip Engine & Supabase Cloud Telemetry
Calcula ROI/Markup de projetos de montagem de PCs e conecta à nuvem do Cockpit IF Tech.
"""

import os
import json
import urllib.request
import webbrowser
from typing import Dict, Any

# Configurações padrão do Supabase IF Tech (lidas do .env.local se disponível)
DEFAULT_SUPABASE_URL = "https://togrnwxazuweuihlaljo.supabase.co"
DEFAULT_SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZ3Jud3hhenV3ZXVpaGxhbGpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI0NjExMywiZXhwIjoyMDk0ODIyMTEzfQ."
    "WASGQ06U3FJvi5VbyN1pKhaJHT33xG-rqhV0NXtCH8M"
)

def get_supabase_creds():
    url = DEFAULT_SUPABASE_URL
    key = DEFAULT_SERVICE_KEY
    
    # Procura .env.local na raiz do projeto
    env_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local"),
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
    ]
    for p in env_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if "=" in line and not line.startswith("#"):
                            k, v = line.split("=", 1)
                            if k.strip() == "SUPABASE_URL":
                                url = v.strip()
                            elif k.strip() == "SUPABASE_SERVICE_ROLE_KEY":
                                key = v.strip()
            except Exception:
                pass
            break
            
    return url, key

def calculate_flip_metrics(cpu: float, mobo: float, ram: float, gpu: float, 
                           storage: float, psu: float, case_fans: float, other: float, 
                           sale_price: float) -> Dict[str, Any]:
    """
    Calcula custo total, lucro bruto, markup e ROI de um projeto de montagem de PC.
    """
    cost_total = float(cpu + mobo + ram + gpu + storage + psu + case_fans + other)
    sale = float(sale_price)
    profit = sale - cost_total
    
    markup_pct = (profit / cost_total * 100.0) if cost_total > 0 else 0.0
    roi_pct = markup_pct # Em revenda à vista de hardware, ROI sobre capital empatado
    margin_pct = (profit / sale * 100.0) if sale > 0 else 0.0
    
    return {
        "cost_total": cost_total,
        "sale_price": sale,
        "profit": profit,
        "markup_pct": markup_pct,
        "roi_pct": roi_pct,
        "margin_pct": margin_pct,
        "is_profitable": profit > 0
    }

def fetch_supabase_telemetry() -> Dict[str, Any]:
    """
    Consulta o Supabase da IF Tech via REST API em modo read-only ultra-rápido (timeout=2.5s).
    Retorna métricas ao vivo das Ordens de Serviço sem travar a interface.
    """
    url, key = get_supabase_creds()
    endpoint = f"{url}/rest/v1/work_orders?select=id,os_number,status"
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "User-Agent": "IFTech-LifeOps-Desktop/2.1"
    }
    
    try:
        req = urllib.request.Request(endpoint, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                
                # Filtra OSs ativas (não finalizadas nem canceladas)
                final_statuses = ["Entregue", "Cancelado", "Recusado_Devolucao"]
                active_orders = [o for o in data if o.get("status") not in final_statuses]
                
                bancada = sum(1 for o in active_orders if "bancada" in str(o.get("status", "")).lower())
                orcamento = sum(1 for o in active_orders if "orcamento" in str(o.get("status", "")).lower() or "triagem" in str(o.get("status", "")).lower())
                
                return {
                    "online": True,
                    "total_active": len(active_orders),
                    "bancada": bancada,
                    "orcamento": orcamento,
                    "summary": f"{len(active_orders)} OS(s) Ativa(s) | {bancada} na Bancada"
                }
    except Exception as e:
        # Silencioso: falha de rede ou offline não interrompe a operação do Life Ops
        pass
        
    return {
        "online": False,
        "total_active": 0,
        "bancada": 0,
        "orcamento": 0,
        "summary": "Nuvem Offline"
    }

def open_cockpit_in_browser():
    """
    Abre o Cockpit Web da IF Tech no navegador padrão do usuário.
    Tenta abrir o admin.html local se existir, ou a URL de produção na Vercel.
    """
    local_admin = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "admin.html")
    if os.path.exists(local_admin):
        # Abre o arquivo admin.html localmente
        webbrowser.open(f"file:///{os.path.abspath(local_admin).replace(os.sep, '/')}")
    else:
        # Fallback para a URL pública institucional
        webbrowser.open("https://iflcosta.tech/app")
