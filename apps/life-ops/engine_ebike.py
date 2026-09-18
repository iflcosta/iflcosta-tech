"""
IF Tech Life & Business Ops - E-Bike & Logistics Engine
Motor de cálculo logístico Leva-e-Traz, CPK decomposto e gestão financeira do projeto BBSHD 1000W.
"""

from datetime import datetime
from typing import Dict, Any, List
from database import (
    get_config, get_pots, update_pot_balance, add_transaction,
    get_ebike_procurement, get_ebike_trips, add_ebike_trip
)

# Constantes Técnicas do Powertrain e Custos de Rodagem (CPK)
CPK_ENERGY = 0.017          # Energia Elétrica CPFL (~15 Wh/km a R$ 1,00/kWh)
CPK_BATTERY = 0.082         # Amortização da Bateria (Pack 52V 20Ah R$ 2.800 / ~34.000 km)
CPK_TRANSMISSION = 0.075    # Desgaste de Transmissão (Corrente KMC e-bike + Cassete)
CPK_BRAKES_TIRES = 0.045    # Freios e Pneus (Pastilhas sinterizadas + pneus aro 29)
CPK_MAINTENANCE = 0.015     # Manutenção preventiva (graxas de engrenagem Bafang, ceras)
CPK_TOTAL = 0.234           # R$ 0,234 / km rodado

# Regras de Negócio e Precificação
DEFAULT_RATE_PER_KM = 0.89   # R$ 0,89 / km total rodado (ida e volta)
DEFAULT_MIN_FEE = 6.50       # Taxa mínima de saída (até ~7.3 km)
DEFAULT_UBER_COST = 23.00    # Custo de referência de Uber/motoboy por viagem

# Percentuais de Segregação da Taxa de Logística
PCT_MANUTENCAO = 0.26       # 26% (~R$ 0,23/km): Caixa Manutenção Imediata
PCT_BATERIA = 0.35          # 35% (~R$ 0,31/km): Fundo Reposição Bateria
PCT_AMORTIZACAO = 0.39      # 39% (~R$ 0,35/km): Amortização do CAPEX

# Metas de Aquisição (CAPEX)
TARGET_CAPEX = 11000.00
MONTHLY_SAVING = 1833.00

def calculate_route_fee(distance_km: float, custom_rate: float = None, custom_min: float = None) -> Dict[str, Any]:
    """
    Calcula a precificação e decomposição operacional para uma rota de Leva-e-Traz.
    """
    rate = float(get_config("ebike_tarifa_km", str(DEFAULT_RATE_PER_KM))) if custom_rate is None else float(custom_rate)
    min_fee = float(get_config("ebike_taxa_minima", str(DEFAULT_MIN_FEE))) if custom_min is None else float(custom_min)
    dist = max(0.0, float(distance_km))

    calculated_fee = dist * rate
    fee_charged = max(min_fee, calculated_fee) if dist > 0 else 0.0
    applied_min_fee = dist > 0 and fee_charged == min_fee and min_fee > calculated_fee

    # Custos operacionais reais (CPK)
    cost_energy = dist * CPK_ENERGY
    cost_battery = dist * CPK_BATTERY
    cost_trans = dist * CPK_TRANSMISSION
    cost_brakes = dist * CPK_BRAKES_TIRES
    cost_maint = dist * CPK_MAINTENANCE
    operational_cost = dist * CPK_TOTAL

    net_margin = fee_charged - operational_cost
    margin_pct = (net_margin / fee_charged * 100.0) if fee_charged > 0 else 0.0

    # Divisão das receitas da taxa de logística
    manutencao_share = round(fee_charged * PCT_MANUTENCAO, 2)
    bateria_share = round(fee_charged * PCT_BATERIA, 2)
    # Ajuste de centavos para garantir que a soma feche perfeitamente
    amortizacao_share = round(fee_charged - (manutencao_share + bateria_share), 2)

    # Economia indireta contra Uber / terceirizados
    uber_ref = float(get_config("ebike_custo_uber_referencia", str(DEFAULT_UBER_COST)))
    avoided_uber = uber_ref if dist > 0 else 0.0
    economy_generated = max(0.0, avoided_uber - operational_cost) if dist > 0 else 0.0

    return {
        "distance_km": dist,
        "fee_charged": fee_charged,
        "applied_min_fee": applied_min_fee,
        "rate_per_km": rate,
        "min_fee": min_fee,
        "operational_cost": operational_cost,
        "cost_breakdown": {
            "energy": cost_energy,
            "battery": cost_battery,
            "transmission": cost_trans,
            "brakes_tires": cost_brakes,
            "preventive": cost_maint
        },
        "net_margin": net_margin,
        "margin_pct": margin_pct,
        "segregation": {
            "manutencao": manutencao_share,
            "bateria": bateria_share,
            "amortizacao": amortizacao_share
        },
        "avoided_uber_cost": avoided_uber,
        "economy_generated": economy_generated
    }

def get_ebike_savings_metrics() -> Dict[str, Any]:
    """
    Rastreia o progresso do pote CAPEX (R$ 11.000,00) e cronograma de aportes (R$ 1.833/mês).
    """
    meta_capex = float(get_config("ebike_meta_capex", str(TARGET_CAPEX)))
    aporte_mensal = float(get_config("ebike_aporte_mensal", str(MONTHLY_SAVING)))

    pots = {p["name"]: p["balance"] for p in get_pots()}
    balance_capex = pots.get("ebike_capex", 0.0)
    balance_bateria = pots.get("ebike_bateria", 0.0)
    balance_manutencao = pots.get("ebike_manutencao", 0.0)

    pct_achieved = min(1.0, balance_capex / max(1.0, meta_capex))
    remaining = max(0.0, meta_capex - balance_capex)
    months_needed = remaining / aporte_mensal if aporte_mensal > 0 else 0.0

    # Cronograma Oficial de 6 Meses (Outubro/2026 a Março/2027)
    schedule = [
        {"month_idx": 1, "name": "Mês 1 (Out/26)", "target_cumulative": 1833.00, "phase": "Fase 1: Mecânica & CONTRAN"},
        {"month_idx": 2, "name": "Mês 2 (Nov/26)", "target_cumulative": 3666.00, "phase": "Fase 1: Black Friday / Peças"},
        {"month_idx": 3, "name": "Mês 3 (Dez/26)", "target_cumulative": 5499.00, "phase": "Fase 1: Ferramentas & Canote"},
        {"month_idx": 4, "name": "Mês 4 (Jan/27)", "target_cumulative": 7332.00, "phase": "Fase 1: Ajustes Finais"},
        {"month_idx": 5, "name": "Mês 5 (Fev/27)", "target_cumulative": 9165.00, "phase": "Fase 2: Reserva Powertrain"},
        {"month_idx": 6, "name": "Mês 6 (Mar/27)", "target_cumulative": 11000.00, "phase": "Fase 2: BBSHD + Bateria / Montagem"}
    ]

    return {
        "balance_capex": balance_capex,
        "balance_bateria": balance_bateria,
        "balance_manutencao": balance_manutencao,
        "meta_capex": meta_capex,
        "aporte_mensal": aporte_mensal,
        "pct_achieved": pct_achieved,
        "pct_display": pct_achieved * 100.0,
        "remaining": remaining,
        "months_needed": round(months_needed, 1),
        "schedule": schedule
    }

def get_ebike_procurement_summary() -> Dict[str, Any]:
    """
    Retorna os itens de compras agrupados por Fase (Fase 1 Mecânica vs Fase 2 Powertrain).
    """
    items = get_ebike_procurement()
    phase1 = [i for i in items if i["phase"] == 1]
    phase2 = [i for i in items if i["phase"] == 2]

    p1_est = sum(i["estimated_cost"] for i in phase1)
    p1_act = sum(i["actual_cost"] if i["status"] == "Comprado" else 0.0 for i in phase1)
    p1_bought = sum(1 for i in phase1 if i["status"] == "Comprado")

    p2_est = sum(i["estimated_cost"] for i in phase2)
    p2_act = sum(i["actual_cost"] if i["status"] == "Comprado" else 0.0 for i in phase2)
    p2_bought = sum(1 for i in phase2 if i["status"] == "Comprado")

    total_est = p1_est + p2_est
    total_act = p1_act + p2_act

    return {
        "items": items,
        "phase1": {
            "name": "Fase 1: Mecânica, Ferramentas e Segurança CONTRAN 996",
            "period": "Meses 1 a 4 (Outubro/2026 a Janeiro/2027)",
            "strategy": "Aproveitar promoções graduais e Black Friday. Não comprar powertrain ainda.",
            "items": phase1,
            "estimated": p1_est,
            "actual": p1_act,
            "bought_count": p1_bought,
            "total_count": len(phase1)
        },
        "phase2": {
            "name": "Fase 2: Powertrain BBSHD 1000W e Bateria Lítio Hailong",
            "period": "Meses 5 e 6 (Fevereiro a Março/2027)",
            "strategy": "Compra imediata apenas na semana da montagem para garantir frescor químico e garantia integral.",
            "items": phase2,
            "estimated": p2_est,
            "actual": p2_act,
            "bought_count": p2_bought,
            "total_count": len(phase2)
        },
        "total_estimated": total_est,
        "total_actual": total_act
    }

def record_logistics_trip_and_distribute(client_name: str, distance_km: float, 
                                        fee_charged: float = None, work_order_id: str = "", 
                                        notes: str = "", auto_distribute: bool = True) -> Dict[str, Any]:
    """
    Registra a corrida de Leva-e-Traz e opcionalmente segrega as receitas nos potes correspondentes:
    - 26% Pote ebike_manutencao
    - 35% Pote ebike_bateria
    - 39% Pote ebike_capex (amortização do investimento)
    """
    route = calculate_route_fee(distance_km)
    final_fee = float(fee_charged) if fee_charged is not None else route["fee_charged"]
    
    # Recalcula as fatias caso haja tarifa customizada
    manut_share = round(final_fee * PCT_MANUTENCAO, 2)
    bat_share = round(final_fee * PCT_BATERIA, 2)
    amort_share = round(final_fee - (manut_share + bat_share), 2)
    op_cost = route["operational_cost"]
    net_margin = final_fee - op_cost
    avoided_uber = route["avoided_uber_cost"]

    trip_id = add_ebike_trip(
        client_name=client_name or "Cliente Geral Leva-e-Traz",
        distance_km=route["distance_km"],
        fee_charged=final_fee,
        operational_cost=op_cost,
        net_margin=net_margin,
        manutencao_share=manut_share,
        bateria_share=bat_share,
        amortizacao_share=amort_share,
        work_order_id=work_order_id,
        avoided_uber_cost=avoided_uber,
        notes=notes
    )

    if auto_distribute and final_fee > 0:
        # Registra transações no extrato financeiro e atualiza os potes correspondentes
        desc_base = f"Leva-e-Traz ({client_name or 'Cliente'} - {route['distance_km']:.1f}km)"
        add_transaction("entrada", manut_share, "Logística: Manutenção", f"{desc_base} [Fatia 26%]", pot="ebike_manutencao")
        add_transaction("entrada", bat_share, "Logística: Bateria", f"{desc_base} [Fatia 35%]", pot="ebike_bateria")
        add_transaction("entrada", amort_share, "Logística: Amortização", f"{desc_base} [Fatia 39%]", pot="ebike_capex")

    return {
        "trip_id": trip_id,
        "distance_km": route["distance_km"],
        "fee_charged": final_fee,
        "operational_cost": op_cost,
        "net_margin": net_margin,
        "manutencao_share": manut_share,
        "bateria_share": bat_share,
        "amortizacao_share": amort_share,
        "avoided_uber_cost": avoided_uber,
        "auto_distributed": auto_distribute
    }

def register_monthly_savings_deposit(amount: float = None) -> Dict[str, Any]:
    """
    Registra um aporte mensal de poupança para a meta da E-Bike no pote ebike_capex.
    """
    val = float(get_config("ebike_aporte_mensal", str(MONTHLY_SAVING))) if amount is None else float(amount)
    if val <= 0:
        return {"success": False, "message": "Valor do aporte deve ser positivo."}

    add_transaction("entrada", val, "Aporte E-Bike CAPEX", "Aporte Mensal Projeto BBSHD 1000W", pot="ebike_capex")
    return {
        "success": True,
        "amount": val,
        "message": f"Aporte de R$ {val:.2f} registrado com sucesso no pote do Projeto E-Bike!"
    }
