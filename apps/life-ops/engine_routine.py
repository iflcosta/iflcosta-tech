"""
IF Tech Life & Business Ops - Routine & Time-Blocking Engine
Determina o Modo Atual Ativo com base no relógio do sistema e rastreia metas semanais.
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
            "next_block": "Amanhã 08:00 — Estudos de IA"
        }

    # Sábado à Noite (Pós-fábrica)
    if dia_semana == 5 and hora_min >= 19 * 60:
        return {
            "mode": "LAZER",
            "title": "💑 Sábado Livre: Noite com a Namorada",
            "subtitle": "Trabalho CLT concluído. Aproveite a noite sem culpa.",
            "color": "#EC407A",
            "next_block": "Amanhã — Domingo de Descanso"
        }

    # Período Noturno / Sono (23:30 às 07:30)
    if hora_min >= 23 * 60 + 30 or hora_min < 7 * 60 + 30:
        return {
            "mode": "REGENERACAO",
            "title": "💤 Modo Regeneração: Sono Sagrado (8h)",
            "subtitle": "Durma para consolidar a memória dos estudos e recuperar o corpo da fábrica.",
            "color": "#5C6BC0",
            "next_block": "08:00 — Estudos de IA (EAD)"
        }

    # 07:30 às 08:00 - Despertar
    if 7 * 60 + 30 <= hora_min < 8 * 60:
        return {
            "mode": "PREPARACAO",
            "title": "🌅 Despertar Biológico & Café",
            "subtitle": "Zero telas. Hidrate-se, tome café e prepare a mente para os estudos.",
            "color": "#FFA726",
            "next_block": "08:00 — Estudos de IA"
        }

    # 08:00 às 09:45 - Bloco 1: Estudos de IA
    if 8 * 60 <= hora_min < 9 * 60 + 45:
        return {
            "mode": "ESTUDOS",
            "title": "🧠 Bloco 1: Estudos de Inteligência Artificial",
            "subtitle": "Mente 100% descansada. Foco em Python, Tecnólogo EAD e Algoritmos.",
            "color": "#00E5FF",
            "next_block": "10:00 — IF Tech (Bancada & Projetos)"
        }

    # 09:45 às 10:00 - Pausa Cognitiva
    if 9 * 60 + 45 <= hora_min < 10 * 60:
        return {
            "mode": "PAUSA",
            "title": "☕ Pausa Cognitiva & Água",
            "subtitle": "Levante da cadeira, tome água e desconecte por 15 minutos.",
            "color": "#66BB6A",
            "next_block": "10:00 — IF Tech (Bancada)"
        }

    # 10:00 às 12:00 - Bloco 2: IF Tech (2h de Bancada & Foco)
    if 10 * 60 <= hora_min < 12 * 60:
        return {
            "mode": "IFTECH",
            "title": "💼 Bloco 2: IF Tech (Bancada & Projetos)",
            "subtitle": "2h de foco pleno: manutenções, orçamentos, montagens e desenvolvimento do lab.",
            "color": "#00E676",
            "next_block": "12:00 — Almoço Nutritivo & Banho"
        }

    # 12:00 às 13:00 - Almoço, Banho & Preparação
    if 12 * 60 <= hora_min < 13 * 60:
        return {
            "mode": "ALMOCO",
            "title": "🍽️ Almoço Nutritivo, Banho & Preparação",
            "subtitle": "Almoço tranquilo em casa, higiene e uniforme sem pressa.",
            "color": "#FFB74D",
            "next_block": "13:00 — Caminhada até a Fábrica (15 min)"
        }

    # 13:00 às 13:20 - Deslocamento a Pé (15 min andando)
    if 13 * 60 <= hora_min < 13 * 60 + 20:
        return {
            "mode": "CAMINHADA",
            "title": "🚶 Deslocamento a Pé até a Fábrica",
            "subtitle": "15 minutos de caminhada ativa até o trabalho. Chegue com 5 min de folga para o ponto.",
            "color": "#4DD0E1",
            "next_block": "13:20 — Bater Ponto na Fábrica CLT"
        }

    # Turno CLT Fábrica (13:20 às 22:00 seg-sex / às 19:00 sáb)
    hora_fim_clt = (19 * 60) if dia_semana == 5 else (22 * 60)
    if 13 * 60 + 20 <= hora_min < hora_fim_clt:
        return {
            "mode": "FABRICA",
            "title": "⚙️ Modo Chão de Fábrica (CLT)",
            "subtitle": "Execução limpa, ritmo constante e conservação de energia física.",
            "color": "#78909C",
            "next_block": f"{'19:00' if dia_semana == 5 else '22:00'} — Fim do Turno & Retorno a Pé"
        }

    # 22:00 às 22:20 - Caminhada de Volta para Casa
    if hora_fim_clt <= hora_min < hora_fim_clt + 20:
        return {
            "mode": "RETORNO",
            "title": "🚶 Retorno a Pé para Casa (15 min)",
            "subtitle": "Caminhada noturna de descompressão física. Respiração calma após o turno.",
            "color": "#81C784",
            "next_block": "22:20 — Ceia, Banho & Namorada"
        }

    # 22:20 às 23:30 - Desaceleração Noturna & Namorada
    return {
        "mode": "DESACELERACAO",
        "title": "🛋️ Desaceleração Noturna & Namorada",
        "subtitle": "Ceia leve, banho, conversa com a namorada e relaxamento para o sono sagrado.",
        "color": "#7E57C2",
        "next_block": "23:30 — Sono Sagrado (8h)"
    }

def get_daily_timeline():
    """Retorna os blocos cronológicos do dia para visualização em grade."""
    return [
        {"time": "07:30 - 08:00", "label": "Despertar Biológico & Café", "tag": "Rotina"},
        {"time": "08:00 - 09:45", "label": "Estudos de IA (Tecnólogo EAD)", "tag": "Estudos"},
        {"time": "09:45 - 10:00", "label": "Pausa Cognitiva (Água/Alongamento)", "tag": "Pausa"},
        {"time": "10:00 - 12:00", "label": "IF Tech (Bancada, Reparos & Projetos)", "tag": "IF Tech"},
        {"time": "12:00 - 13:00", "label": "Almoço Nutritivo, Banho & Higiene", "tag": "Almoço"},
        {"time": "13:00 - 13:20", "label": "Caminhada até a Fábrica (15 min a pé)", "tag": "Deslocamento"},
        {"time": "13:20 - 22:00", "label": "Turno Fábrica CLT (Sáb até 19h)", "tag": "Fábrica"},
        {"time": "22:00 - 22:20", "label": "Caminhada de Volta para Casa (15 min)", "tag": "Deslocamento"},
        {"time": "22:20 - 23:30", "label": "Ceia, Desaceleração & Namorada", "tag": "Pessoal"},
        {"time": "23:30 - 07:30", "label": "Sono Sagrado Reparador (8 Horas)", "tag": "Sono"}
    ]

def get_weekly_metrics():
    """Calcula o progresso das metas da semana."""
    summary = get_week_routine_summary()
    
    meta_ia_horas = float(get_config("meta_horas_ia_semana", "7.5"))
    meta_iftech_horas = float(get_config("meta_horas_iftech_semana", "12.0"))

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
