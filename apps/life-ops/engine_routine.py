"""
IF Tech Life & Business Ops - Routine & Time-Blocking Engine
Determina o Modo Atual Ativo com base no relógio do sistema e rastreia metas semanais.
Atualizado: Modo Full-Time Founder (Fundador em Tempo Integral da IF Tech).
"""

from datetime import datetime
from database import get_config, get_week_routine_summary

def get_current_mode():
    """Retorna o bloco e o modo de operação do momento atual."""
    agora = datetime.now()
    dia_semana = agora.weekday() # 0 = Segunda, 5 = Sábado, 6 = Domingo
    hora_min = agora.hour * 60 + agora.minute

    # Domingo (Dia Sagrado de Descanso)
    if dia_semana == 6:
        return {
            "mode": "DESCOMPRESSAO",
            "title": "🏖️ Domingo Sagrado: Descompressão & Namoro",
            "subtitle": "Zero obrigações pesadas. Recarregue a bateria mental e desfrute com quem você ama.",
            "color": "#AB47BC",
            "next_block": "Amanhã 08:00 — Estudos de IA & Software"
        }

    # Sábado à Tarde / Noite (Fim de semana livre)
    if dia_semana == 5 and hora_min >= 13 * 60:
        return {
            "mode": "LAZER",
            "title": "💑 Sábado Livre: Descompressão & Namorada",
            "subtitle": "Semana de alta produção concluída. Aproveite o fim de semana sem peso na consciência.",
            "color": "#EC407A",
            "next_block": "Amanhã — Domingo de Descanso"
        }

    # Sábado de Manhã (08:30 às 12:30) - Manutenção / Entregas Finais
    if dia_semana == 5 and 8 * 60 + 30 <= hora_min < 12 * 60 + 30:
        return {
            "mode": "IFTECH",
            "title": "💼 Sábado Operacional: Bancada & Entregas Finais",
            "subtitle": "Finalização de reparos da semana, entregas aos clientes e organização do laboratório.",
            "color": "#00E676",
            "next_block": "12:30 — Início do Fim de Semana Livre"
        }

    # Período Noturno / Sono (23:30 às 07:30)
    if hora_min >= 23 * 60 + 30 or hora_min < 7 * 60 + 30:
        return {
            "mode": "REGENERACAO",
            "title": "💤 Modo Regeneração: Sono Sagrado (8h)",
            "subtitle": "Durma para consolidar a memória dos estudos e recuperar a capacidade cognitiva.",
            "color": "#5C6BC0",
            "next_block": "08:00 — Estudos de IA & Software"
        }

    # 07:30 às 08:00 - Despertar & Organização do Ambiente
    if 7 * 60 + 30 <= hora_min < 8 * 60:
        return {
            "mode": "PREPARACAO",
            "title": "🌅 Despertar Biológico, Arrumar Quarto & Café",
            "subtitle": "Cama arrumada, ambiente limpo, roupa de trabalho (sem pijama) e mente pronta.",
            "color": "#FFA726",
            "next_block": "08:00 — Estudos de IA & Software"
        }

    # 08:00 às 09:30 - Bloco 1: Estudos de IA & Software
    if 8 * 60 <= hora_min < 9 * 60 + 30:
        return {
            "mode": "ESTUDOS",
            "title": "🧠 Bloco 1: Estudos de IA & Engenharia de Software",
            "subtitle": "Mente 100% descansada. Foco em Python, Tecnólogo EAD, Algoritmos e Arquitetura.",
            "color": "#00E5FF",
            "next_block": "09:30 — IF Tech (Bancada ou Prospecção Ativa)"
        }

    # 09:30 às 12:00 - Bloco 2: IF Tech (Bancada Técnica / Prospecção Matinal)
    if 9 * 60 + 30 <= hora_min < 12 * 60:
        return {
            "mode": "IFTECH",
            "title": "🔬 Bloco 2: Bancada Técnica & Produção",
            "subtitle": "Máquinas em atendimento, montagens e testes periciais. Se bancada zerada: Prospecção Ativa!",
            "color": "#00E676",
            "next_block": "12:00 — Almoço & Parceria (Cyber Informática)"
        }

    # 12:00 às 13:30 - Almoço, Parceria Cyber Informática & Descompressão
    if 12 * 60 <= hora_min < 13 * 60 + 30:
        return {
            "mode": "ALMOCO",
            "title": "🍽️ Almoço & Networking (Cyber Informática)",
            "subtitle": "Almoço nutritivo, fortalecimento da parceria na Cyber Informática e descanso mental.",
            "color": "#FFB74D",
            "next_block": "13:30 — Geração de Demanda & Vendas (Caçador)"
        }

    # 13:30 às 15:30 - Bloco 3: Geração de Demanda & Vendas (Caçador)
    if 13 * 60 + 30 <= hora_min < 15 * 60 + 30:
        return {
            "mode": "PROSPECCAO",
            "title": "🎯 Bloco 3: Geração de Demanda & Vendas (Caçador)",
            "subtitle": "Prospecção B2B (contabilidades/clínicas), postagens no Instagram, Google Meu Negócio e Marketplaces.",
            "color": "#FF7043",
            "next_block": "15:30 — Concierge Leva-e-Traz & Operações Externas"
        }

    # 15:30 às 17:30 - Bloco 4: Concierge Leva-e-Traz & Operações Externas
    if 15 * 60 + 30 <= hora_min < 17 * 60 + 30:
        return {
            "mode": "CONCIERGE",
            "title": "🚲 Bloco 4: Concierge Leva-e-Traz (E-Bike BBSHD)",
            "subtitle": "Coleta e entrega de máquinas com termo formal, balcão na Cyber Informática e logística ágil de e-bike.",
            "color": "#26A69A",
            "next_block": "17:30 — Cockpit ERP, Orçamentos & DRE"
        }

    # 17:30 às 18:30 - Bloco 5: Cockpit Gestão, Orçamentos & DRE
    if 17 * 60 + 30 <= hora_min < 18 * 60 + 30:
        return {
            "mode": "GESTAO",
            "title": "📊 Bloco 5: Cockpit ERP, Orçamentos & Fechamento DRE",
            "subtitle": "Registro de serviços, envio de laudos e links Pix Asaas via WhatsApp, conciliação e plano de amanhã.",
            "color": "#7E57C2",
            "next_block": "18:30 — Vida Pessoal, Treino & Namorada"
        }

    # 18:30 às 22:30 - Vida Pessoal, Treino & Namorada
    if 18 * 60 + 30 <= hora_min < 22 * 60 + 30:
        return {
            "mode": "PESSOAL",
            "title": "🛋️ Vida Pessoal, Atividade Física & Namorada",
            "subtitle": "Desconexão do trabalho, caminhada/treino, jantar e tempo de qualidade com quem você ama.",
            "color": "#EC407A",
            "next_block": "22:30 — Desaceleração Noturna"
        }

    # 22:30 às 23:30 - Desaceleração Noturna
    return {
        "mode": "DESACELERACAO",
        "title": "🛋️ Desaceleração Noturna & Higiene do Sono",
        "subtitle": "Desconectar telas, banho relaxante, leitura leve e preparação para o sono reparador.",
        "color": "#5C6BC0",
        "next_block": "23:30 — Sono Sagrado (8h)"
    }

def get_daily_timeline():
    """Retorna os blocos cronológicos do dia para visualização em grade."""
    return [
        {"time": "07:30 - 08:00", "label": "Despertar, Arrumar Quarto & Café", "tag": "Rotina"},
        {"time": "08:00 - 09:30", "label": "Estudos de IA & Software (EAD)", "tag": "Estudos"},
        {"time": "09:30 - 12:00", "label": "Bancada Técnica (ou Prospecção Ativa)", "tag": "Bancada"},
        {"time": "12:00 - 13:30", "label": "Almoço & Parceria (Cyber Informática)", "tag": "Networking"},
        {"time": "13:30 - 15:30", "label": "Geração de Demanda & Vendas (B2B/B2C)", "tag": "Vendas"},
        {"time": "15:30 - 17:30", "label": "Concierge Leva-e-Traz & Balcão", "tag": "Logística"},
        {"time": "17:30 - 18:30", "label": "Cockpit ERP, Orçamentos & DRE", "tag": "Gestão"},
        {"time": "18:30 - 22:30", "label": "Vida Pessoal, Treino & Namorada", "tag": "Pessoal"},
        {"time": "22:30 - 23:30", "label": "Desaceleração Noturna & Leitura", "tag": "Descanso"},
        {"time": "23:30 - 07:30", "label": "Sono Sagrado Reparador (8 Horas)", "tag": "Sono"}
    ]

def get_weekly_metrics():
    """Calcula o progresso das metas da semana."""
    summary = get_week_routine_summary()
    
    meta_ia_horas = float(get_config("meta_horas_ia_semana", "7.5"))
    meta_iftech_horas = float(get_config("meta_horas_iftech_semana", "25.0"))

    horas_ia_feitas = (summary.get("ia_estudos", 0) or 0) / 60.0
    horas_iftech_feitas = (summary.get("iftech_lab", 0) or 0) / 60.0

    return {
        "ia": {
            "feitas": round(horas_ia_feitas, 1),
            "meta": meta_ia_horas,
            "pct": min(1.0, horas_ia_feitas / max(0.1, meta_ia_horas))
        },
        "iftech": {
            "feitas": round(horas_iftech_feitas, 1),
            "meta": meta_iftech_horas,
            "pct": min(1.0, horas_iftech_feitas / max(0.1, meta_iftech_horas))
        }
    }
