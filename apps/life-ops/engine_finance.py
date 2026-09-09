"""
IF Tech Life & Business Ops - Financial Engine
Motor de cálculo de fluxo de caixa preditivo quinzenal e simulador de compras.
"""

from datetime import datetime, timedelta
import calendar
from database import get_config, get_pots

def get_financial_overview():
    """Retorna os indicadores principais de caixa e cota diária."""
    salario_liquido = float(get_config("salario_liquido", "2164.0"))
    pct_adiantamento = float(get_config("pct_adiantamento", "40.0")) / 100.0
    val_adiantamento = salario_liquido * pct_adiantamento
    val_saldo_salario = salario_liquido * (1.0 - pct_adiantamento)

    pots = {p["name"]: p["balance"] for p in get_pots()}
    saldo_giro = pots.get("giro", 0.0)
    saldo_familia = pots.get("familia", 0.0)
    saldo_quarto_lab = pots.get("quarto_lab", 0.0)
    saldo_hardware_flip = pots.get("hardware_flip", 0.0)

    # Cálculo da Cota Diária Segura
    hoje = datetime.now()
    dia_atual = hoje.day

    # Próxima entrada salarial
    primeiro_vale_cfg = get_config("primeiro_vale_custom", "")
    primeiro_saldo_cfg = get_config("primeiro_saldo_custom", "")

    if dia_atual < 5:
        proximo_dia_paga = 5
        dias_restantes = 5 - dia_atual
        proximo_tipo = "Saldo Salário (60%)"
        proximo_valor = float(primeiro_saldo_cfg) if primeiro_saldo_cfg and float(primeiro_saldo_cfg) > 0 else val_saldo_salario
    elif dia_atual < 20:
        proximo_dia_paga = 20
        dias_restantes = 20 - dia_atual
        proximo_tipo = "Vale / Adiantamento (40%)"
        proximo_valor = float(primeiro_vale_cfg) if primeiro_vale_cfg and float(primeiro_vale_cfg) > 0 else val_adiantamento
    else:
        # Passou do dia 20, próxima entrada é dia 05 do mês que vem
        ultimo_dia_mes = calendar.monthrange(hoje.year, hoje.month)[1]
        dias_restantes = (ultimo_dia_mes - dia_atual) + 5
        proximo_dia_paga = 5
        proximo_tipo = "Saldo Salário (60%)"
        proximo_valor = float(primeiro_saldo_cfg) if primeiro_saldo_cfg and float(primeiro_saldo_cfg) > 0 else val_saldo_salario

    dias_divisor = max(1, dias_restantes)
    cota_diaria = max(0.0, saldo_giro / dias_divisor)

    return {
        "saldo_giro": saldo_giro,
        "saldo_familia": saldo_familia,
        "saldo_quarto_lab": saldo_quarto_lab,
        "saldo_hardware_flip": saldo_hardware_flip,
        "saldo_total": saldo_giro + saldo_familia + saldo_quarto_lab + saldo_hardware_flip,
        "cota_diaria": cota_diaria,
        "dias_restantes": dias_restantes,
        "proximo_dia_paga": proximo_dia_paga,
        "proximo_tipo": proximo_tipo,
        "proximo_valor": proximo_valor,
        "val_adiantamento": val_adiantamento,
        "val_saldo_salario": val_saldo_salario
    }

def simulate_purchase(item_name: str, cost: float, installments: int = 1):
    """
    Simula o impacto de uma compra pretendida.
    Retorna o veredito (GREEN, YELLOW, RED) com justificativa precisa.
    """
    overview = get_financial_overview()
    saldo_giro = overview["saldo_giro"]
    dias_restantes = overview["dias_restantes"]
    
    parcela = cost / max(1, installments)
    
    # Impacto imediato na quinzena atual
    saldo_pos_compra = saldo_giro - parcela

    if saldo_pos_compra < 0:
        return {
            "verdict": "RED",
            "badge": "🔴 NÃO COMPRAR AGORA",
            "message": f"Essa compra deixará seu caixa negativo em R$ {abs(saldo_pos_compra):.2f} antes do próximo pagamento (dia {overview['proximo_dia_paga']}).",
            "recommendation": f"Aguarde o recebimento do dia {overview['proximo_dia_paga']} ou aumente o parcelamento para caber no caixa."
        }
    
    # Nova cota diária pós-compra
    nova_cota = saldo_pos_compra / max(1, dias_restantes)
    
    if nova_cota < 15.0:
        return {
            "verdict": "YELLOW",
            "badge": "🟡 COMPRA APERTADA",
            "message": f"Você terá saldo (sobrará R$ {saldo_pos_compra:.2f}), mas sua cota diária cairá para R$ {nova_cota:.2f}/dia pelos próximos {dias_restantes} dias.",
            "recommendation": f"Se comprar agora, terá que restringir saídas de fim de semana até o dia {overview['proximo_dia_paga']}."
        }
    
    return {
        "verdict": "GREEN",
        "badge": "🟢 SINAL VERDE",
        "message": f"Compra 100% segura! Seu saldo restante será de R$ {saldo_pos_compra:.2f}, mantendo uma cota confortável de R$ {nova_cota:.2f}/dia.",
        "recommendation": "Pode prosseguir com a compra sem riscos de aperto financeiro."
    }

def project_30_days_timeline():
    """Gera a projeção dia a dia para os próximos 32 dias de forma discreta e realista (sem cigarro)."""
    salario_liquido = float(get_config("salario_liquido", "2164.0"))
    pct_adiantamento = float(get_config("pct_adiantamento", "40.0")) / 100.0
    val_adiantamento = salario_liquido * pct_adiantamento
    val_saldo_salario = salario_liquido * (1.0 - pct_adiantamento)
    gasto_familia = float(get_config("gasto_familia", "500.0"))
    gasto_fds = float(get_config("gasto_fds", "100.0"))

    # Checagem de valores customizados para o primeiro pagamento
    primeiro_vale_cfg = get_config("primeiro_vale_custom", "")
    primeiro_saldo_cfg = get_config("primeiro_saldo_custom", "")
    val_primeiro_vale = float(primeiro_vale_cfg) if primeiro_vale_cfg and float(primeiro_vale_cfg) > 0 else val_adiantamento
    val_primeiro_saldo = float(primeiro_saldo_cfg) if primeiro_saldo_cfg and float(primeiro_saldo_cfg) > 0 else val_saldo_salario

    overview = get_financial_overview()
    corrente = overview["saldo_giro"]

    timeline = []
    hoje = datetime.now()

    primeiro_vale_aplicado = False
    primeiro_saldo_aplicado = False

    for i in range(32):
        dia_futuro = hoje + timedelta(days=i)
        dia_num = dia_futuro.day
        eventos = []

        if i == 0:
            # Hoje (dia atual): saldo real de partida
            eventos.append("Saldo Real Atual")
        else:
            # 1. Fim de semana (Sábado): Saída / lazer com a namorada
            if dia_futuro.weekday() == 5: # Sábado
                corrente -= gasto_fds
                eventos.append(f"-R$ {gasto_fds:.0f} (Namorada/Fds)")

            # 2. Evento Dia 20 (Adiantamento CLT / Vale)
            if dia_num == 20:
                v_vale = val_primeiro_vale if not primeiro_vale_aplicado else val_adiantamento
                primeiro_vale_aplicado = True
                corrente += v_vale
                eventos.append(f"+R$ {v_vale:.0f} (Vale 40%)")

            # 3. Evento Dia 05 (Saldo CLT - Família)
            elif dia_num == 5:
                v_saldo = val_primeiro_saldo if not primeiro_saldo_aplicado else val_saldo_salario
                primeiro_saldo_aplicado = True
                corrente += v_saldo
                corrente -= gasto_familia
                eventos.append(f"+R$ {v_saldo:.0f} (CLT) - R$ {gasto_familia:.0f} (Família)")

        timeline.append({
            "date": dia_futuro.strftime("%d/%m"),
            "weekday": dia_futuro.strftime("%a"),
            "projected_balance": round(corrente, 2),
            "events": ", ".join(eventos) if eventos else ""
        })

    return timeline
