"""
Suíte de Testes Automatizados: Projeto E-Bike DIY BBSHD 1000W & Logística Leva-e-Traz
Verifica modelos de dados SQLite, motor de rotas, segregação de receitas e meta de poupança CAPEX.
"""

import os
import sys
import unittest
import sqlite3

# Adiciona o diretório da aplicação ao sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import (
    init_db, get_connection, get_pots, get_config, set_config,
    get_ebike_procurement, update_ebike_procurement_item,
    get_ebike_trips, add_ebike_trip, delete_ebike_trip
)
from engine_ebike import (
    calculate_route_fee, get_ebike_savings_metrics,
    get_ebike_procurement_summary, record_logistics_trip_and_distribute,
    register_monthly_savings_deposit, CPK_TOTAL, DEFAULT_RATE_PER_KM,
    DEFAULT_MIN_FEE, PCT_MANUTENCAO, PCT_BATERIA, PCT_AMORTIZACAO
)
from engine_finance import get_financial_overview

class TestEBikeLogisticsEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_01_database_tables_and_seeds(self):
        """Verifica se tabelas, potes e sementes do projeto E-Bike existem."""
        conn = get_connection()
        
        # Tabelas existem
        tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        self.assertIn("ebike_procurement", tables)
        self.assertIn("ebike_trips", tables)
        
        # Potes do E-Bike existem
        pots = {p["name"]: p for p in get_pots()}
        self.assertIn("ebike_capex", pots)
        self.assertIn("ebike_bateria", pots)
        self.assertIn("ebike_manutencao", pots)
        self.assertEqual(pots["ebike_capex"]["target"], 11000.0)

        # Configurações padrão
        self.assertEqual(float(get_config("ebike_meta_capex")), 11000.0)
        self.assertEqual(float(get_config("ebike_aporte_mensal")), 1833.0)
        self.assertEqual(float(get_config("ebike_tarifa_km")), 0.89)
        self.assertEqual(float(get_config("ebike_taxa_minima")), 6.50)
        self.assertEqual(float(get_config("ebike_cpk_total")), 0.234)

        conn.close()

    def test_02_procurement_phases(self):
        """Verifica se os itens de compras estão divididos nas duas fases corretas."""
        summary = get_ebike_procurement_summary()
        p1 = summary["phase1"]
        p2 = summary["phase2"]

        # Fase 1: Mecânica, Ferramentas, Segurança (5 itens)
        self.assertGreaterEqual(p1["total_count"], 5)
        self.assertIn("Meses 1 a 4", p1["period"])
        p1_names = [i["item_name"] for i in p1["items"]]
        self.assertTrue(any("Corrente Reforçada" in n for n in p1_names))
        self.assertTrue(any("Pastilhas" in n for n in p1_names))
        self.assertTrue(any("CONTRAN 996" in n for n in p1_names))
        self.assertTrue(any("Ferramentas" in n for n in p1_names))
        self.assertTrue(any("Canote Retrátil" in n for n in p1_names))

        # Fase 2: Motor BBSHD e Bateria (2 itens)
        self.assertEqual(p2["total_count"], 2)
        self.assertIn("Meses 5 e 6", p2["period"])
        p2_names = [i["item_name"] for i in p2["items"]]
        self.assertTrue(any("Bafang BBSHD 1000W" in n for n in p2_names))
        self.assertTrue(any("Bateria Lítio" in n for n in p2_names))

    def test_03_route_fee_calculation_and_min_fee(self):
        """Testa o cálculo da taxa de rota com acionamento do piso mínimo de saída."""
        # 1. Trajeto curto (5 km) -> 5 * 0.89 = 4.45 -> Deve acionar piso de R$ 6.50
        route_short = calculate_route_fee(5.0)
        self.assertEqual(route_short["fee_charged"], 6.50)
        self.assertTrue(route_short["applied_min_fee"])
        self.assertAlmostEqual(route_short["operational_cost"], 5.0 * 0.234, places=3)
        self.assertGreater(route_short["net_margin"], 0)

        # 2. Trajeto padrão Leva-e-Traz (13 km ida e volta) -> 13 * 0.89 = 11.57
        route_std = calculate_route_fee(13.0)
        self.assertAlmostEqual(route_std["fee_charged"], 11.57, places=2)
        self.assertFalse(route_std["applied_min_fee"])
        self.assertAlmostEqual(route_std["operational_cost"], 13.0 * 0.234, places=3) # 3.042
        self.assertAlmostEqual(route_std["net_margin"], 11.57 - (13.0 * 0.234), places=2)

    def test_04_revenue_segregation_exactness(self):
        """Testa a decomposição de segregação (26% Manutenção, 35% Bateria, 39% Amortização)."""
        route = calculate_route_fee(13.0)
        fee = route["fee_charged"] # 11.57
        seg = route["segregation"]

        # A soma das parcelas segregadas deve fechar exatamente o valor cobrado
        total_segregated = seg["manutencao"] + seg["bateria"] + seg["amortizacao"]
        self.assertAlmostEqual(total_segregated, fee, places=2)

        # Proporções
        self.assertAlmostEqual(seg["manutencao"], round(fee * PCT_MANUTENCAO, 2), places=2)
        self.assertAlmostEqual(seg["bateria"], round(fee * PCT_BATERIA, 2), places=2)

    def test_05_savings_metrics_and_monthly_deposit(self):
        """Testa o rastreamento da meta de poupança CAPEX (R$ 11.000,00) e aporte mensal."""
        pots_before = {p["name"]: p["balance"] for p in get_pots()}
        bal_before = pots_before.get("ebike_capex", 0.0)

        metrics_initial = get_ebike_savings_metrics()
        self.assertEqual(metrics_initial["meta_capex"], 11000.00)
        self.assertEqual(metrics_initial["aporte_mensal"], 1833.00)
        self.assertEqual(len(metrics_initial["schedule"]), 6)

        # Realiza um aporte mensal de teste
        deposit_res = register_monthly_savings_deposit(1833.00)
        self.assertTrue(deposit_res["success"])

        metrics_after = get_ebike_savings_metrics()
        self.assertAlmostEqual(metrics_after["balance_capex"], bal_before + 1833.00, places=2)
        self.assertGreater(metrics_after["pct_achieved"], 0.0)

    def test_06_trip_recording_and_auto_distribution(self):
        """Testa o registro de corrida com alimentação automática dos potes de segregação."""
        pots_before = {p["name"]: p["balance"] for p in get_pots()}
        maint_before = pots_before.get("ebike_manutencao", 0.0)
        bat_before = pots_before.get("ebike_bateria", 0.0)
        capex_before = pots_before.get("ebike_capex", 0.0)

        # Registra trajeto de teste de 10 km
        res = record_logistics_trip_and_distribute(
            client_name="Cliente Teste OS-999",
            distance_km=10.0,
            work_order_id="OS-999",
            auto_distribute=True
        )

        self.assertIsNotNone(res["trip_id"])
        self.assertEqual(res["fee_charged"], 8.90) # 10 * 0.89

        # Verifica atualização dos potes
        pots_after = {p["name"]: p["balance"] for p in get_pots()}
        self.assertAlmostEqual(pots_after["ebike_manutencao"], maint_before + res["manutencao_share"], places=2)
        self.assertAlmostEqual(pots_after["ebike_bateria"], bat_before + res["bateria_share"], places=2)
        self.assertAlmostEqual(pots_after["ebike_capex"], capex_before + res["amortizacao_share"], places=2)

    def test_07_financial_overview_integration(self):
        """Verifica se os potes de E-Bike aparecem no get_financial_overview."""
        fin = get_financial_overview()
        self.assertIn("saldo_ebike_capex", fin)
        self.assertIn("saldo_ebike_bateria", fin)
        self.assertIn("saldo_ebike_manutencao", fin)
        self.assertGreaterEqual(fin["saldo_total"], fin["saldo_ebike_capex"])

if __name__ == "__main__":
    unittest.main()
