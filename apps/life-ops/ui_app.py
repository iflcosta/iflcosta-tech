"""
IF Tech Life & Business Ops - Interface Gráfica Desktop
Construída em CustomTkinter (Dark Mode Nativo com Design Moderno)
"""

import customtkinter as ctk
from tkinter import messagebox
from datetime import datetime

from database import (
    get_config, set_config, get_pots, add_transaction,
    get_recent_transactions, log_routine,
    get_quick_buttons, update_quick_button, add_quick_button, delete_quick_button,
    reset_all_transactions_and_balances, set_pot_balance, set_pot_target,
    get_flip_projects, add_flip_project, update_flip_project_status, delete_flip_project,
    log_morning_checkin, get_morning_checkin_status, create_database_backup
)
from engine_finance import (
    get_financial_overview, simulate_purchase, project_30_days_timeline
)
from engine_routine import (
    get_current_mode, get_daily_timeline, get_weekly_metrics
)
from engine_hardware import (
    calculate_flip_metrics, fetch_supabase_telemetry, open_cockpit_in_browser
)

# Configuração global de aparência
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class LifeOpsApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("IF Tech // Life & Business Ops")
        self.geometry("1100x740")
        self.minsize(980, 660)

        # Container Principal
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # 1. Header com Status Dinâmico
        self.create_header()

        # 2. Barra de Atalhos de 1 Toque (Quick Pocket Expense)
        self.create_quick_bar()

        # 3. Abas Principais (Tabview)
        self.create_tabview()

        # Atualização periódica do relógio e status
        self.refresh_all_data()

    def create_header(self):
        self.header_frame = ctk.CTkFrame(self, corner_radius=12, fg_color="#18181B")
        self.header_frame.grid(row=0, column=0, padx=16, pady=(14, 8), sticky="nsew")
        self.header_frame.grid_columnconfigure(1, weight=1)

        # Logo / Marca
        brand_frame = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        brand_frame.grid(row=0, column=0, padx=16, pady=10, sticky="w")
        
        lbl_brand = ctk.CTkLabel(
            brand_frame, text="⚡ IF TECH", 
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"),
            text_color="#00E676"
        )
        lbl_brand.pack(anchor="w")

        lbl_sub = ctk.CTkLabel(
            brand_frame, text="LIFE & BUSINESS OPERATIONS", 
            font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
            text_color="#71717A"
        )
        lbl_sub.pack(anchor="w")

        # Badge do Modo Atual
        self.mode_badge = ctk.CTkLabel(
            self.header_frame, text="MODO ATUAL",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            fg_color="#27272A", text_color="#FFFFFF",
            corner_radius=8, padx=12, pady=6
        )
        self.mode_badge.grid(row=0, column=1, padx=8, pady=10, sticky="w")

        # Telemetria IF Tech Cloud (Supabase Read-Only)
        cloud_frame = ctk.CTkFrame(self.header_frame, fg_color="#202024", corner_radius=8)
        cloud_frame.grid(row=0, column=2, padx=10, pady=10, sticky="e")

        self.lbl_cloud_telemetry = ctk.CTkLabel(
            cloud_frame, text="🌐 IF TECH CLOUD: Conectando...",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#00E5FF"
        )
        self.lbl_cloud_telemetry.pack(side="left", padx=(10, 8), pady=4)

        btn_cockpit = ctk.CTkButton(
            cloud_frame, text="↗ Abrir Cockpit ERP",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            fg_color="#27272A", hover_color="#3F3F46", text_color="#00E676",
            height=26, corner_radius=6,
            command=open_cockpit_in_browser
        )
        btn_cockpit.pack(side="left", padx=(0, 6), pady=4)

        # Métricas Rápidas do Header
        metrics_frame = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        metrics_frame.grid(row=0, column=3, padx=16, pady=8, sticky="e")

        self.lbl_cota_header = ctk.CTkLabel(
            metrics_frame, text="COTA HOJE: R$ --/dia",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#00E5FF"
        )
        self.lbl_cota_header.pack(anchor="e")

        self.lbl_proximo_salario = ctk.CTkLabel(
            metrics_frame, text="Próximo pagamento em -- dias",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color="#A1A1AA"
        )
        self.lbl_proximo_salario.pack(anchor="e")

    def create_quick_bar(self):
        """Barra de 1 clique para despesas rápidas de bolso."""
        self.quick_frame = ctk.CTkFrame(self, corner_radius=10, fg_color="#202024")
        self.quick_frame.grid(row=1, column=0, padx=16, pady=(0, 10), sticky="ew")
        self.render_quick_buttons()

    def render_quick_buttons(self):
        for w in self.quick_frame.winfo_children():
            w.destroy()

        lbl_quick = ctk.CTkLabel(
            self.quick_frame, text="ATALHOS (1 TOQUE):",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#A1A1AA"
        )
        lbl_quick.pack(side="left", padx=(14, 10), pady=8)

        buttons = get_quick_buttons()
        for b in buttons:
            icon = b.get("icon", "⚡") or "⚡"
            amt_str = f"R$ {b['amount']:.2f}".replace(".00", "")
            btn_text = f"{icon} {b['label']} ({amt_str})"
            btn = ctk.CTkButton(
                self.quick_frame, text=btn_text,
                font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
                fg_color="#27272A", hover_color="#3F3F46", text_color="#F4F4F5",
                height=28, corner_radius=6,
                command=lambda a=b['amount'], c=b['category'], d=b['description']: self.quick_spend(a, c, d)
            )
            btn.pack(side="left", padx=4, pady=8)

    def create_tabview(self):
        self.tabs = ctk.CTkTabview(self, corner_radius=12, fg_color="#18181B")
        self.tabs.grid(row=2, column=0, padx=16, pady=(0, 16), sticky="nsew")

        self.tab_fluxo = self.tabs.add("💰 Fluxo de Caixa")
        self.tab_simulador = self.tabs.add("🎯 Simulador de Compras")
        self.tab_flip = self.tabs.add("💻 Hardware Flip")
        self.tab_rotina = self.tabs.add("⏰ Rotina & Foco")
        self.tab_config = self.tabs.add("⚙️ Configurações")

        self.build_tab_fluxo()
        self.build_tab_simulador()
        self.build_tab_flip()
        self.build_tab_rotina()
        self.build_tab_config()

    # ==========================================
    # ABA 1: FLUXO DE CAIXA
    # ==========================================
    def build_tab_fluxo(self):
        self.tab_fluxo.grid_columnconfigure((0, 1), weight=1)
        self.tab_fluxo.grid_rowconfigure(1, weight=1)

        # 4 Potes (Cards)
        self.pots_container = ctk.CTkFrame(self.tab_fluxo, fg_color="transparent")
        self.pots_container.grid(row=0, column=0, columnspan=2, padx=12, pady=(10, 12), sticky="ew")
        self.pots_container.grid_columnconfigure((0, 1, 2, 3), weight=1)

        self.card_giro = self.create_pot_card(self.pots_container, 0, "Caixa de Giro", "#00E676")
        self.card_familia = self.create_pot_card(self.pots_container, 1, "Provisão Família", "#FFB300")
        self.card_quarto = self.create_pot_card(self.pots_container, 2, "Quarto & Bancada", "#00E5FF")
        self.card_flip = self.create_pot_card(self.pots_container, 3, "Giro Hardware (Flip)", "#E040FB")

        # Painel Esquerdo: Lançamento Manual + Extrato Recente
        left_panel = ctk.CTkFrame(self.tab_fluxo, fg_color="#202024", corner_radius=10)
        left_panel.grid(row=1, column=0, padx=(12, 6), pady=(0, 10), sticky="nsew")
        left_panel.grid_rowconfigure(2, weight=1)
        left_panel.grid_columnconfigure(0, weight=1)

        # Lançamento Manual (Retirada / Entrada / Ajuste)
        manual_box = ctk.CTkFrame(left_panel, fg_color="#27272A", corner_radius=8)
        manual_box.grid(row=0, column=0, padx=10, pady=(10, 8), sticky="ew")

        ctk.CTkLabel(
            manual_box, text="NOVA MOVIMENTAÇÃO (RETIRADA / ENTRADA):",
            font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
            text_color="#A1A1AA"
        ).pack(anchor="w", padx=10, pady=(8, 4))

        self.seg_trans_type = ctk.CTkSegmentedButton(
            manual_box, values=["🔻 Saída / Retirada", "🔺 Entrada / Depósito"]
        )
        self.seg_trans_type.set("🔻 Saída / Retirada")
        self.seg_trans_type.pack(fill="x", padx=10, pady=(0, 6))

        row1 = ctk.CTkFrame(manual_box, fg_color="transparent")
        row1.pack(fill="x", padx=10, pady=2)
        self.entry_m_val = ctk.CTkEntry(row1, placeholder_text="Valor R$ (ex: 50.00)", width=130)
        self.entry_m_val.pack(side="left", padx=(0, 6))
        self.combo_m_pot = ctk.CTkComboBox(
            row1, values=["giro (Caixa de Giro)", "familia (Família)", "quarto_lab (Projeto Quarto/Bancada)", "hardware_flip (Giro Hardware/Flip)"],
            width=210
        )
        self.combo_m_pot.set("giro (Caixa de Giro)")
        self.combo_m_pot.pack(side="left", fill="x", expand=True)

        row2 = ctk.CTkFrame(manual_box, fg_color="transparent")
        row2.pack(fill="x", padx=10, pady=(4, 8))
        self.entry_m_desc = ctk.CTkEntry(row2, placeholder_text="Descrição (ex: Saque, Pix recebido, Bico, Compra)", width=200)
        self.entry_m_desc.pack(side="left", padx=(0, 6), fill="x", expand=True)

        btn_lancar = ctk.CTkButton(
            row2, text="➕ REGISTRAR",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color="#00E676", hover_color="#00C853", text_color="#000000",
            width=100, command=self.submit_manual_transaction
        )
        btn_lancar.pack(side="right")

        ctk.CTkLabel(
            left_panel, text="EXTRATO RECENTE",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color="#A1A1AA"
        ).grid(row=1, column=0, padx=12, pady=(8, 4), sticky="w")

        self.scroll_trans = ctk.CTkScrollableFrame(left_panel, fg_color="transparent")
        self.scroll_trans.grid(row=2, column=0, padx=8, pady=(0, 8), sticky="nsew")

        # Painel Direito: Projeção Diária 30 Dias
        right_panel = ctk.CTkFrame(self.tab_fluxo, fg_color="#202024", corner_radius=10)
        right_panel.grid(row=1, column=1, padx=(6, 12), pady=(0, 10), sticky="nsew")
        right_panel.grid_rowconfigure(1, weight=1)
        right_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            right_panel, text="PROJEÇÃO DE SALDO (PRÓXIMOS 30 DIAS)",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color="#A1A1AA"
        ).grid(row=0, column=0, padx=12, pady=10, sticky="w")

        self.scroll_timeline = ctk.CTkScrollableFrame(right_panel, fg_color="transparent")
        self.scroll_timeline.grid(row=1, column=0, padx=8, pady=(0, 8), sticky="nsew")

    def create_pot_card(self, parent, col, title, accent_color):
        card = ctk.CTkFrame(parent, fg_color="#202024", corner_radius=10)
        card.grid(row=0, column=col, padx=6, pady=4, sticky="nsew")

        ctk.CTkLabel(
            card, text=title.upper(),
            font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
            text_color="#A1A1AA"
        ).pack(anchor="w", padx=12, pady=(10, 2))

        val_label = ctk.CTkLabel(
            card, text="R$ 0,00",
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color=accent_color
        )
        val_label.pack(anchor="w", padx=12, pady=(0, 10))

        return val_label

    # ==========================================
    # ABA 2: SIMULADOR DE COMPRAS
    # ==========================================
    def build_tab_simulador(self):
        self.tab_simulador.grid_columnconfigure((0, 1), weight=1)
        self.tab_simulador.grid_rowconfigure(0, weight=1)

        # Lado Esquerdo: Formulário & Presets
        form_frame = ctk.CTkFrame(self.tab_simulador, fg_color="#202024", corner_radius=10)
        form_frame.grid(row=0, column=0, padx=(14, 7), pady=14, sticky="nsew")

        ctk.CTkLabel(
            form_frame, text="TESTAR COMPRA FUTURA",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#F4F4F5"
        ).pack(anchor="w", padx=16, pady=(16, 6))

        ctk.CTkLabel(
            form_frame, text="Nome do Item ou Serviço:",
            font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#A1A1AA"
        ).pack(anchor="w", padx=16, pady=(10, 2))
        
        self.entry_sim_item = ctk.CTkEntry(form_frame, placeholder_text="Ex: Mesa 190cm, Cama Nova, etc.")
        self.entry_sim_item.pack(fill="x", padx=16, pady=(0, 8))

        ctk.CTkLabel(
            form_frame, text="Valor Total (R$):",
            font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#A1A1AA"
        ).pack(anchor="w", padx=16, pady=(6, 2))

        self.entry_sim_valor = ctk.CTkEntry(form_frame, placeholder_text="Ex: 350.00")
        self.entry_sim_valor.pack(fill="x", padx=16, pady=(0, 8))

        ctk.CTkLabel(
            form_frame, text="Número de Parcelas:",
            font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#A1A1AA"
        ).pack(anchor="w", padx=16, pady=(6, 2))

        self.combo_sim_parcelas = ctk.CTkComboBox(
            form_frame, values=["1x (À vista)", "2x", "3x", "4x", "6x", "10x", "12x"]
        )
        self.combo_sim_parcelas.set("1x (À vista)")
        self.combo_sim_parcelas.pack(fill="x", padx=16, pady=(0, 16))

        btn_simular = ctk.CTkButton(
            form_frame, text="🔍 SIMULAR IMPACTO NO CAIXA",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            fg_color="#00E676", hover_color="#00C853", text_color="#000000",
            height=36, corner_radius=8,
            command=self.run_simulation
        )
        btn_simular.pack(fill="x", padx=16, pady=(0, 20))

        # Atalhos Rápidos para Itens do Laboratório
        ctk.CTkLabel(
            form_frame, text="ATALHOS DO HOME LAB:",
            font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
            text_color="#71717A"
        ).pack(anchor="w", padx=16, pady=(10, 4))

        presets_frame = ctk.CTkFrame(form_frame, fg_color="transparent")
        presets_frame.pack(fill="x", padx=16)

        ctk.CTkButton(
            presets_frame, text="🖥️ Mesa Compace 190cm (R$ 350)",
            fg_color="#27272A", hover_color="#3F3F46", text_color="#F4F4F5",
            height=28, command=lambda: self.set_sim_preset("Mesa Compace Yon 190x70", "350.00")
        ).pack(fill="x", pady=2)

        ctk.CTkButton(
            presets_frame, text="🛏️ Cama Viúva Líquida (R$ 450)",
            fg_color="#27272A", hover_color="#3F3F46", text_color="#F4F4F5",
            height=28, command=lambda: self.set_sim_preset("Cama Viúva 1.20m (Troca Líquida)", "450.00")
        ).pack(fill="x", pady=2)

        ctk.CTkButton(
            presets_frame, text="🧰 Kit Ferramentas PC (R$ 760)",
            fg_color="#27272A", hover_color="#3F3F46", text_color="#F4F4F5",
            height=28, command=lambda: self.set_sim_preset("Kit Ferramentas PC Essencial", "760.00")
        ).pack(fill="x", pady=2)

        ctk.CTkButton(
            presets_frame, text="🚀 Peças Próximo PC Flip (R$ 3.850)",
            fg_color="#27272A", hover_color="#3F3F46", text_color="#F4F4F5",
            height=28, command=lambda: self.set_sim_preset("Peças Próximo PC Flip (Revenda 6k)", "3850.00")
        ).pack(fill="x", pady=2)

        # Lado Direito: Veredito Inteligente
        self.verdict_frame = ctk.CTkFrame(self.tab_simulador, fg_color="#202024", corner_radius=10)
        self.verdict_frame.grid(row=0, column=1, padx=(7, 14), pady=14, sticky="nsew")

        ctk.CTkLabel(
            self.verdict_frame, text="PARECER DA SIMULAÇÃO",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#F4F4F5"
        ).pack(anchor="w", padx=16, pady=(16, 12))

        self.lbl_verdict_badge = ctk.CTkLabel(
            self.verdict_frame, text="AGUARDANDO SIMULAÇÃO",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color="#27272A", text_color="#A1A1AA",
            corner_radius=8, padx=16, pady=10
        )
        self.lbl_verdict_badge.pack(anchor="w", padx=16, pady=(0, 14))

        self.lbl_verdict_msg = ctk.CTkLabel(
            self.verdict_frame, 
            text="Preencha o valor da compra ao lado ou clique em um atalho para ver se você tem sinal verde sem apertar a sua quinzena.",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#D4D4D8", justify="left", wraplength=420
        )
        self.lbl_verdict_msg.pack(anchor="w", padx=16, pady=(0, 14))

        self.lbl_verdict_rec = ctk.CTkLabel(
            self.verdict_frame, text="",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#00E5FF", justify="left", wraplength=420
        )
        self.lbl_verdict_rec.pack(anchor="w", padx=16, pady=(0, 14))

    def set_sim_preset(self, name, val):
        self.entry_sim_item.delete(0, "end")
        self.entry_sim_item.insert(0, name)
        self.entry_sim_valor.delete(0, "end")
        self.entry_sim_valor.insert(0, val)
        self.run_simulation()

    def run_simulation(self):
        try:
            item = self.entry_sim_item.get().strip() or "Item sem nome"
            valor = float(self.entry_sim_valor.get().replace(",", "."))
            parc_str = self.combo_sim_parcelas.get().split("x")[0].strip()
            parcelas = int(parc_str)
        except ValueError:
            messagebox.showerror("Erro", "Por favor, insira um valor numérico válido.")
            return

        res = simulate_purchase(item, valor, parcelas)

        colors = {
            "GREEN": ("#00E676", "#003314"),
            "YELLOW": ("#FFB300", "#332400"),
            "RED": ("#FF5252", "#330A0A")
        }
        fg, bg = colors.get(res["verdict"], ("#FFFFFF", "#27272A"))

        self.lbl_verdict_badge.configure(text=res["badge"], text_color=fg, fg_color=bg)
        self.lbl_verdict_msg.configure(text=res["message"])
        self.lbl_verdict_rec.configure(text="💡 RECOMENDAÇÃO: " + res["recommendation"])

    # ==========================================
    # ABA 3: HARDWARE FLIP (ALAVANCAGEM COMERCIAL)
    # ==========================================
    def build_tab_flip(self):
        self.tab_flip.grid_columnconfigure((0, 1), weight=1)
        self.tab_flip.grid_rowconfigure(0, weight=1)

        # Lado Esquerdo: Calculadora & Novo Projeto
        calc_frame = ctk.CTkFrame(self.tab_flip, fg_color="#202024", corner_radius=10)
        calc_frame.grid(row=0, column=0, padx=(14, 7), pady=14, sticky="nsew")
        calc_frame.grid_rowconfigure(2, weight=1)
        calc_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            calc_frame, text="🧮 CALCULADORA DE HARDWARE FLIP",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#F4F4F5"
        ).grid(row=0, column=0, padx=14, pady=(12, 2), sticky="w")

        ctk.CTkLabel(
            calc_frame, text="Simule o custo das peças, markup e lucro líquido por máquina:",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color="#A1A1AA"
        ).grid(row=1, column=0, padx=14, pady=(0, 8), sticky="w")

        scroll_calc = ctk.CTkScrollableFrame(calc_frame, fg_color="transparent")
        scroll_calc.grid(row=2, column=0, padx=10, pady=4, sticky="nsew")
        scroll_calc.grid_columnconfigure(1, weight=1)

        # Nome do Projeto
        ctk.CTkLabel(scroll_calc, text="Nome da Máquina:", font=ctk.CTkFont(size=11, weight="bold"), text_color="#A1A1AA").grid(row=0, column=0, padx=6, pady=4, sticky="w")
        self.entry_flip_name = ctk.CTkEntry(scroll_calc, placeholder_text="ex: PC 2: Ryzen 5 5600 + RTX 4060")
        self.entry_flip_name.grid(row=0, column=1, padx=6, pady=4, sticky="ew")

        # Entradas de Peças
        parts = [
            ("Processador / CPU (R$):", "cpu", "180.00"),
            ("Placa-Mãe (R$):", "mobo", "280.00"),
            ("Memória RAM (R$):", "ram", "160.00"),
            ("Placa de Vídeo / GPU (R$):", "gpu", "420.00"),
            ("Armazenamento / SSD (R$):", "storage", "190.00"),
            ("Fonte de Alimentação (R$):", "psu", "240.00"),
            ("Gabinete & Fans (R$):", "case", "260.00"),
            ("Outros / Fretes (R$):", "other", "120.00"),
            ("Preço Alvo de Venda (R$):", "sale", "3850.00")
        ]

        self.flip_entries = {}
        for idx, (label, key, default_val) in enumerate(parts, start=1):
            lbl_color = "#00E5FF" if key == "sale" else "#A1A1AA"
            ctk.CTkLabel(scroll_calc, text=label, font=ctk.CTkFont(size=11), text_color=lbl_color).grid(row=idx, column=0, padx=6, pady=3, sticky="w")
            
            ent = ctk.CTkEntry(scroll_calc)
            ent.insert(0, default_val)
            ent.grid(row=idx, column=1, padx=6, pady=3, sticky="ew")
            self.flip_entries[key] = ent

        # Botões da Calculadora
        btn_box = ctk.CTkFrame(calc_frame, fg_color="transparent")
        btn_box.grid(row=3, column=0, padx=14, pady=8, sticky="ew")

        ctk.CTkButton(
            btn_box, text="🧮 CALCULAR",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color="#27272A", hover_color="#3F3F46", text_color="#00E5FF",
            height=32, corner_radius=6,
            command=self.calculate_current_flip
        ).pack(side="left", padx=(0, 6), expand=True, fill="x")

        ctk.CTkButton(
            btn_box, text="💾 SALVAR PROJETO",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color="#E040FB", hover_color="#C2185B", text_color="#FFFFFF",
            height=32, corner_radius=6,
            command=self.save_flip_project_action
        ).pack(side="left", expand=True, fill="x")

        # Card de Resumo Financeiro
        resumo_box = ctk.CTkFrame(calc_frame, fg_color="#27272A", corner_radius=8)
        resumo_box.grid(row=4, column=0, padx=14, pady=(4, 12), sticky="ew")

        self.lbl_flip_custo = ctk.CTkLabel(
            resumo_box, text="CUSTO TOTAL: R$ --",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#FF5252"
        )
        self.lbl_flip_custo.pack(anchor="w", padx=12, pady=(8, 2))

        self.lbl_flip_lucro = ctk.CTkLabel(
            resumo_box, text="LUCRO LÍQUIDO: R$ --",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#00E676"
        )
        self.lbl_flip_lucro.pack(anchor="w", padx=12, pady=2)

        self.lbl_flip_roi = ctk.CTkLabel(
            resumo_box, text="MARKUP: --% | ROI: --%",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#FFB300"
        )
        self.lbl_flip_roi.pack(anchor="w", padx=12, pady=(2, 8))

        # Lado Direito: Esteira de Projetos
        pipeline_frame = ctk.CTkFrame(self.tab_flip, fg_color="#202024", corner_radius=10)
        pipeline_frame.grid(row=0, column=1, padx=(7, 14), pady=14, sticky="nsew")
        pipeline_frame.grid_rowconfigure(2, weight=1)
        pipeline_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            pipeline_frame, text="💻 ESTEIRA DE PROJETOS DE HARDWARE FLIP",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#F4F4F5"
        ).grid(row=0, column=0, padx=14, pady=(12, 2), sticky="w")

        ctk.CTkLabel(
            pipeline_frame, text="Ao liquidar a venda, o lucro é creditado no pote de Hardware Flip:",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color="#A1A1AA"
        ).grid(row=1, column=0, padx=14, pady=(0, 8), sticky="w")

        self.scroll_flips = ctk.CTkScrollableFrame(pipeline_frame, fg_color="transparent")
        self.scroll_flips.grid(row=2, column=0, padx=10, pady=(0, 10), sticky="nsew")

    def calculate_current_flip(self):
        try:
            cpu = float(self.flip_entries["cpu"].get().strip().replace(",", ".") or 0)
            mobo = float(self.flip_entries["mobo"].get().strip().replace(",", ".") or 0)
            ram = float(self.flip_entries["ram"].get().strip().replace(",", ".") or 0)
            gpu = float(self.flip_entries["gpu"].get().strip().replace(",", ".") or 0)
            storage = float(self.flip_entries["storage"].get().strip().replace(",", ".") or 0)
            psu = float(self.flip_entries["psu"].get().strip().replace(",", ".") or 0)
            case_f = float(self.flip_entries["case"].get().strip().replace(",", ".") or 0)
            other = float(self.flip_entries["other"].get().strip().replace(",", ".") or 0)
            sale = float(self.flip_entries["sale"].get().strip().replace(",", ".") or 0)
        except ValueError:
            messagebox.showerror("Erro", "Insira valores numéricos válidos nas peças.")
            return

        res = calculate_flip_metrics(cpu, mobo, ram, gpu, storage, psu, case_f, other, sale)
        self.lbl_flip_custo.configure(text=f"CUSTO TOTAL DE MONTAGEM: R$ {res['cost_total']:.2f}")
        self.lbl_flip_lucro.configure(text=f"LUCRO LÍQUIDO PREVISTO: R$ {res['profit']:.2f}")
        self.lbl_flip_roi.configure(text=f"MARKUP: {res['markup_pct']:.1f}% | ROI: {res['roi_pct']:.1f}% | MARGEM: {res['margin_pct']:.1f}%")

    def save_flip_project_action(self):
        name = self.entry_flip_name.get().strip() or "PC Gamer Flip"
        try:
            cpu = float(self.flip_entries["cpu"].get().strip().replace(",", ".") or 0)
            mobo = float(self.flip_entries["mobo"].get().strip().replace(",", ".") or 0)
            ram = float(self.flip_entries["ram"].get().strip().replace(",", ".") or 0)
            gpu = float(self.flip_entries["gpu"].get().strip().replace(",", ".") or 0)
            storage = float(self.flip_entries["storage"].get().strip().replace(",", ".") or 0)
            psu = float(self.flip_entries["psu"].get().strip().replace(",", ".") or 0)
            case_f = float(self.flip_entries["case"].get().strip().replace(",", ".") or 0)
            other = float(self.flip_entries["other"].get().strip().replace(",", ".") or 0)
            sale = float(self.flip_entries["sale"].get().strip().replace(",", ".") or 0)
        except ValueError:
            messagebox.showerror("Erro", "Valores numéricos inválidos.")
            return

        add_flip_project(name, cpu, mobo, ram, gpu, storage, psu, case_f, other, sale)
        messagebox.showinfo("Sucesso", f"Projeto '{name}' cadastrado na esteira de flips!")
        self.render_flip_projects_list()

    def render_flip_projects_list(self):
        for w in self.scroll_flips.winfo_children():
            w.destroy()

        projects = get_flip_projects()
        if not projects:
            ctk.CTkLabel(self.scroll_flips, text="Nenhum projeto de hardware flip cadastrado.", text_color="#71717A").pack(pady=20)
            return

        for p in projects:
            card = ctk.CTkFrame(self.scroll_flips, fg_color="#27272A", corner_radius=8)
            card.pack(fill="x", pady=5, padx=4)

            top_row = ctk.CTkFrame(card, fg_color="transparent")
            top_row.pack(fill="x", padx=10, pady=(8, 4))

            ctk.CTkLabel(
                top_row, text=p["name"],
                font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
                text_color="#F4F4F5"
            ).pack(side="left")

            status_colors = {
                "Em Montagem": ("#FFB300", "#332400"),
                "Anunciado": ("#00E5FF", "#002B33"),
                "Vendido": ("#00E676", "#003314")
            }
            fg_col, bg_col = status_colors.get(p["status"], ("#FFFFFF", "#18181B"))

            status_badge = ctk.CTkLabel(
                top_row, text=p["status"].upper(),
                font=ctk.CTkFont(size=10, weight="bold"),
                text_color=fg_col, fg_color=bg_col,
                corner_radius=6, padx=8, pady=2
            )
            status_badge.pack(side="right")

            cost = (p["cpu_cost"] + p["mobo_cost"] + p["ram_cost"] + p["gpu_cost"] + 
                    p["storage_cost"] + p["psu_cost"] + p["case_fans_cost"] + p["other_cost"])
            sale = p["sale_price"]
            profit = sale - cost
            roi = (profit / cost * 100.0) if cost > 0 else 0.0

            info_row = ctk.CTkFrame(card, fg_color="transparent")
            info_row.pack(fill="x", padx=10, pady=2)

            ctk.CTkLabel(
                info_row, text=f"Custo: R$ {cost:.2f} | Venda Alvo: R$ {sale:.2f} | Lucro: R$ {profit:.2f} ({roi:.0f}% ROI)",
                font=ctk.CTkFont(size=11), text_color="#D4D4D8"
            ).pack(side="left")

            action_row = ctk.CTkFrame(card, fg_color="transparent")
            action_row.pack(fill="x", padx=10, pady=(4, 8))

            if p["status"] != "Vendido":
                ctk.CTkButton(
                    action_row, text="💰 Liquidar Venda (Creditar Lucro)",
                    font=ctk.CTkFont(size=10, weight="bold"),
                    fg_color="#00E676", hover_color="#00C853", text_color="#000000",
                    height=26, corner_radius=6,
                    command=lambda pid=p["id"], prof=profit, pnm=p["name"]: self.liquidate_flip_project(pid, prof, pnm)
                ).pack(side="left", padx=(0, 6))

                if p["status"] == "Em Montagem":
                    ctk.CTkButton(
                        action_row, text="📢 Marcar Anunciado",
                        font=ctk.CTkFont(size=10, weight="bold"),
                        fg_color="#3F3F46", hover_color="#52525B", text_color="#00E5FF",
                        height=26, corner_radius=6,
                        command=lambda pid=p["id"]: self.change_flip_status(pid, "Anunciado")
                    ).pack(side="left", padx=(0, 6))
            else:
                ctk.CTkLabel(
                    action_row, text="✅ Lucro liquidado e reinvestido no pote.",
                    font=ctk.CTkFont(size=10, weight="bold"), text_color="#00E676"
                ).pack(side="left")

            ctk.CTkButton(
                action_row, text="🗑️",
                font=ctk.CTkFont(size=10),
                fg_color="#3F3F46", hover_color="#FF5252", text_color="#FFFFFF",
                width=32, height=26, corner_radius=6,
                command=lambda pid=p["id"]: self.delete_flip_project_action(pid)
            ).pack(side="right")

    def liquidate_flip_project(self, project_id: int, profit: float, name: str):
        confirm = messagebox.askyesno(
            "Liquidar Venda",
            f"Deseja marcar '{name}' como VENDIDO e creditar o lucro líquido de R$ {profit:.2f} no Pote Hardware Flip?"
        )
        if confirm:
            add_transaction("entrada", profit, "Hardware Flip", f"Lucro Venda: {name}", pot="hardware_flip")
            update_flip_project_status(project_id, "Vendido")
            self.refresh_all_data()
            messagebox.showinfo("Sucesso", f"R$ {profit:.2f} creditados no Pote Hardware Flip!")

    def change_flip_status(self, project_id: int, status: str):
        update_flip_project_status(project_id, status)
        self.render_flip_projects_list()

    def delete_flip_project_action(self, project_id: int):
        delete_flip_project(project_id)
        self.render_flip_projects_list()

    # ==========================================
    # ABA 4: ROTINA & FOCO
    # ==========================================
    def build_tab_rotina(self):
        self.tab_rotina.grid_columnconfigure((0, 1), weight=1)
        self.tab_rotina.grid_rowconfigure(0, weight=1)

        # Lado Esquerdo: Timeline do Dia
        timeline_frame = ctk.CTkFrame(self.tab_rotina, fg_color="#202024", corner_radius=10)
        timeline_frame.grid(row=0, column=0, padx=(14, 7), pady=14, sticky="nsew")
        timeline_frame.grid_rowconfigure(1, weight=1)
        timeline_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            timeline_frame, text="GRADE DE TEMPO DIÁRIA (SEG A SEX)",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#F4F4F5"
        ).grid(row=0, column=0, padx=14, pady=12, sticky="w")

        scroll_daily = ctk.CTkScrollableFrame(timeline_frame, fg_color="transparent")
        scroll_daily.grid(row=1, column=0, padx=8, pady=(0, 8), sticky="nsew")

        for block in get_daily_timeline():
            b_frame = ctk.CTkFrame(scroll_daily, fg_color="#27272A", corner_radius=6)
            b_frame.pack(fill="x", pady=3)

            ctk.CTkLabel(
                b_frame, text=block["time"],
                font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
                text_color="#00E5FF", width=95
            ).pack(side="left", padx=8, pady=6)

            ctk.CTkLabel(
                b_frame, text=block["label"],
                font=ctk.CTkFont(family="Segoe UI", size=11),
                text_color="#F4F4F5"
            ).pack(side="left", padx=8, pady=6)

        # Lado Direito: Metas da Semana & Registro Rápido
        right_routine = ctk.CTkFrame(self.tab_rotina, fg_color="#202024", corner_radius=10)
        right_routine.grid(row=0, column=1, padx=(7, 14), pady=14, sticky="nsew")

        # Card da Janela de Ouro Matinal (08h às 12h) & Streak
        morning_box = ctk.CTkFrame(right_routine, fg_color="#27272A", corner_radius=8)
        morning_box.pack(fill="x", padx=16, pady=(16, 10))

        m_top = ctk.CTkFrame(morning_box, fg_color="transparent")
        m_top.pack(fill="x", padx=12, pady=(10, 4))

        ctk.CTkLabel(
            m_top, text="⚡ JANELA MATINAL (08H - 12H)",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color="#00E5FF"
        ).pack(side="left")

        self.lbl_morning_streak = ctk.CTkLabel(
            m_top, text="🔥 STREAK: 0 DIAS",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            text_color="#FFB300"
        )
        self.lbl_morning_streak.pack(side="right")

        self.btn_morning_checkin = ctk.CTkButton(
            morning_box, text="⚡ Check-in Janela Matinal Cumprida!",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            fg_color="#00E676", hover_color="#00C853", text_color="#000000",
            height=30, corner_radius=6,
            command=self.do_morning_checkin
        )
        self.btn_morning_checkin.pack(fill="x", padx=12, pady=(4, 10))

        ctk.CTkLabel(
            right_routine, text="METAS SEMANAIS DE ALAVANCAGEM",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#F4F4F5"
        ).pack(anchor="w", padx=16, pady=(8, 12))

        # Barra IA
        self.lbl_meta_ia = ctk.CTkLabel(
            right_routine, text="🧠 Estudos de IA: -- h / 7.5h",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color="#00E5FF"
        )
        self.lbl_meta_ia.pack(anchor="w", padx=16, pady=(4, 2))
        self.progress_ia = ctk.CTkProgressBar(right_routine, fg_color="#27272A", progress_color="#00E5FF", height=10)
        self.progress_ia.pack(fill="x", padx=16, pady=(0, 14))

        # Barra IF Tech
        self.lbl_meta_iftech = ctk.CTkLabel(
            right_routine, text="💼 IF Tech: -- h / 12.0h",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color="#00E676"
        )
        self.lbl_meta_iftech.pack(anchor="w", padx=16, pady=(4, 2))
        self.progress_iftech = ctk.CTkProgressBar(right_routine, fg_color="#27272A", progress_color="#00E676", height=10)
        self.progress_iftech.pack(fill="x", padx=16, pady=(0, 20))

        # Botões de Registro Rápido de Horas
        ctk.CTkLabel(
            right_routine, text="REGISTRO DE HORAS CUMPRIDAS HOJE:",
            font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
            text_color="#71717A"
        ).pack(anchor="w", padx=16, pady=(10, 4))

        ctk.CTkButton(
            right_routine, text="➕ Registrei 1h30 de Estudos de IA",
            fg_color="#27272A", hover_color="#00E5FF", text_color="#F4F4F5",
            command=lambda: self.log_routine_hours("ia_estudos", 90, "Estudo diário matinal de IA")
        ).pack(fill="x", padx=16, pady=3)

        ctk.CTkButton(
            right_routine, text="➕ Registrei 2h00 de Bancada / IF Tech",
            fg_color="#27272A", hover_color="#00E676", text_color="#F4F4F5",
            command=lambda: self.log_routine_hours("iftech_lab", 120, "Trabalho matinal no Lab IF Tech")
        ).pack(fill="x", padx=16, pady=3)

    # ==========================================
    # ABA 4: CONFIGURAÇÕES
    # ==========================================
    def build_tab_config(self):
        conf_frame = ctk.CTkScrollableFrame(self.tab_config, fg_color="#202024", corner_radius=10)
        conf_frame.pack(fill="both", expand=True, padx=14, pady=14)

        ctk.CTkLabel(
            conf_frame, text="PARÂMETROS FINANCEIROS & METAS",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#F4F4F5"
        ).pack(anchor="w", padx=16, pady=(16, 12))

        # Grid de Campos
        grid_f = ctk.CTkFrame(conf_frame, fg_color="transparent")
        grid_f.pack(fill="x", padx=16, pady=8)
        grid_f.grid_columnconfigure(1, weight=1)

        fields = [
            ("Salário CLT Líquido Integral (R$):", "salario_liquido", "2164.00"),
            ("Adiantamento / Vale (%):", "pct_adiantamento", "40"),
            ("Compromisso Família Dia 05 (R$):", "gasto_familia", "500.00"),
            ("Gasto Fim de Semana / Namorada (R$):", "gasto_fds", "100.00"),
            ("Orçamento Mensal Lazer / Namorada (R$):", "orcamento_lazer", "400.00"),
            ("1º Vale (20/09) Proporcional (R$ - opcional):", "primeiro_vale_custom", ""),
            ("1º Saldo (05/10) Proporcional (R$ - opcional):", "primeiro_saldo_custom", ""),
            ("Meta Semanal Estudos IA (Horas):", "meta_horas_ia_semana", "7.5"),
            ("Meta Semanal IF Tech (Horas):", "meta_horas_iftech_semana", "12.0")
        ]

        self.config_entries = {}
        for idx, (label, key, default) in enumerate(fields):
            ctk.CTkLabel(
                grid_f, text=label,
                font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#A1A1AA"
            ).grid(row=idx, column=0, padx=(0, 16), pady=6, sticky="w")

            ent = ctk.CTkEntry(grid_f)
            ent.insert(0, get_config(key, default))
            ent.grid(row=idx, column=1, pady=6, sticky="ew")
            self.config_entries[key] = ent

        # Seção 1.5: Metas e Saldos Livres de Cada Pote
        ctk.CTkLabel(
            conf_frame, text="METAS & SALDOS DOS POTES FINANCEIROS",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#F4F4F5"
        ).pack(anchor="w", padx=16, pady=(16, 6))

        ctk.CTkLabel(
            conf_frame, text="Defina livremente o saldo atual e a meta de acúmulo de cada pote:",
            font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#A1A1AA"
        ).pack(anchor="w", padx=16, pady=(0, 8))

        grid_pots = ctk.CTkFrame(conf_frame, fg_color="transparent")
        grid_pots.pack(fill="x", padx=16, pady=4)
        grid_pots.grid_columnconfigure((1, 2), weight=1)

        ctk.CTkLabel(grid_pots, text="Pote / Finalidade", font=ctk.CTkFont(size=11, weight="bold"), text_color="#A1A1AA").grid(row=0, column=0, padx=6, pady=4, sticky="w")
        ctk.CTkLabel(grid_pots, text="Saldo Atual (R$)", font=ctk.CTkFont(size=11, weight="bold"), text_color="#A1A1AA").grid(row=0, column=1, padx=6, pady=4, sticky="w")
        ctk.CTkLabel(grid_pots, text="Meta de Acúmulo (R$)", font=ctk.CTkFont(size=11, weight="bold"), text_color="#A1A1AA").grid(row=0, column=2, padx=6, pady=4, sticky="w")

        pots = get_pots()
        self.pot_entries = {}
        for r_idx, p in enumerate(pots, start=1):
            ctk.CTkLabel(grid_pots, text=p["label"], font=ctk.CTkFont(size=11), text_color="#F4F4F5").grid(row=r_idx, column=0, padx=6, pady=4, sticky="w")
            
            ent_bal = ctk.CTkEntry(grid_pots, width=110)
            ent_bal.insert(0, f"{p['balance']:.2f}")
            ent_bal.grid(row=r_idx, column=1, padx=6, pady=4, sticky="ew")
            
            ent_tgt = ctk.CTkEntry(grid_pots, width=110)
            ent_tgt.insert(0, f"{p['target']:.2f}")
            ent_tgt.grid(row=r_idx, column=2, padx=6, pady=4, sticky="ew")
            
            self.pot_entries[p["name"]] = (ent_bal, ent_tgt)

        btn_salvar = ctk.CTkButton(
            conf_frame, text="💾 SALVAR TODOS OS PARÂMETROS E POTES",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            fg_color="#00E676", hover_color="#00C853", text_color="#000000",
            height=34, corner_radius=8,
            command=self.save_configurations
        )
        btn_salvar.pack(anchor="w", padx=16, pady=(12, 16))

        # Seção 2: Personalizar Botões de Atalho Rápido
        ctk.CTkLabel(
            conf_frame, text="PERSONALIZAR ATALHOS RÁPIDOS (1 TOQUE)",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#F4F4F5"
        ).pack(anchor="w", padx=16, pady=(16, 6))

        ctk.CTkLabel(
            conf_frame, text="Altere o ícone, nome, valor ou adicione novos botões para a barra superior:",
            font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#A1A1AA"
        ).pack(anchor="w", padx=16, pady=(0, 10))

        self.btn_editor_frame = ctk.CTkFrame(conf_frame, fg_color="transparent")
        self.btn_editor_frame.pack(fill="x", padx=16)
        self.render_quick_button_editors()

        # Seção 3: Zona de Manutenção & Backup
        ctk.CTkLabel(
            conf_frame, text="BACKUP & MANUTENÇÃO DO BANCO DE DADOS",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#00E5FF"
        ).pack(anchor="w", padx=16, pady=(24, 6))

        ctk.CTkLabel(
            conf_frame, text="Gere uma cópia de segurança instantânea e datada do seu banco SQLite:",
            font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#A1A1AA"
        ).pack(anchor="w", padx=16, pady=(0, 8))

        btn_backup = ctk.CTkButton(
            conf_frame, text="💾 GERAR BACKUP IMEDIATO DO BANCO (SQLITE)",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            fg_color="#00E5FF", hover_color="#00B4D8", text_color="#000000",
            height=34, corner_radius=8,
            command=self.trigger_sqlite_backup
        )
        btn_backup.pack(anchor="w", padx=16, pady=(0, 16))

        ctk.CTkLabel(
            conf_frame, text="Limpar lançamentos de teste e resetar todos os saldos para R$ 0,00:",
            font=ctk.CTkFont(family="Segoe UI", size=11), text_color="#A1A1AA"
        ).pack(anchor="w", padx=16, pady=(0, 8))

        btn_reset = ctk.CTkButton(
            conf_frame, text="🧹 ZERAR EXTRATO E RESETAR SALDOS (R$ 0,00)",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            fg_color="#3F3F46", hover_color="#FF5252", text_color="#F4F4F5",
            height=34, corner_radius=8,
            command=self.confirm_reset_database
        )
        btn_reset.pack(anchor="w", padx=16, pady=(0, 20))

    def render_quick_button_editors(self):
        for w in self.btn_editor_frame.winfo_children():
            w.destroy()

        self.btn_entries = []
        buttons = get_quick_buttons()

        for idx, b in enumerate(buttons):
            row = ctk.CTkFrame(self.btn_editor_frame, fg_color="#27272A", corner_radius=6)
            row.pack(fill="x", pady=4)

            ent_icon = ctk.CTkEntry(row, width=40)
            ent_icon.insert(0, b.get("icon", "⚡") or "⚡")
            ent_icon.pack(side="left", padx=4, pady=4)

            ent_lbl = ctk.CTkEntry(row, placeholder_text="Nome do Botão", width=140)
            ent_lbl.insert(0, b["label"])
            ent_lbl.pack(side="left", padx=4, pady=4)

            ent_amt = ctk.CTkEntry(row, placeholder_text="Valor R$", width=80)
            ent_amt.insert(0, str(b["amount"]))
            ent_amt.pack(side="left", padx=4, pady=4)

            ent_cat = ctk.CTkEntry(row, placeholder_text="Categoria", width=110)
            ent_cat.insert(0, b["category"])
            ent_cat.pack(side="left", padx=4, pady=4)

            ent_desc = ctk.CTkEntry(row, placeholder_text="Descrição ao lançar", width=160)
            ent_desc.insert(0, b["description"])
            ent_desc.pack(side="left", padx=4, pady=4, fill="x", expand=True)

            btn_del = ctk.CTkButton(
                row, text="🗑️", width=36, fg_color="#3F3F46", hover_color="#FF5252",
                command=lambda bid=b["id"]: self.delete_button_and_refresh(bid)
            )
            btn_del.pack(side="right", padx=4, pady=4)

            self.btn_entries.append((b["id"], ent_icon, ent_lbl, ent_amt, ent_cat, ent_desc))

        btns_ctrl = ctk.CTkFrame(self.btn_editor_frame, fg_color="transparent")
        btns_ctrl.pack(fill="x", pady=(10, 16))

        ctk.CTkButton(
            btns_ctrl, text="💾 SALVAR ATALHOS",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color="#00E676", hover_color="#00C853", text_color="#000000",
            command=self.save_quick_buttons_changes
        ).pack(side="left", padx=(0, 8))

        ctk.CTkButton(
            btns_ctrl, text="➕ ADICIONAR NOVO ATALHO",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color="#27272A", hover_color="#3F3F46", text_color="#F4F4F5",
            command=self.add_new_quick_button_action
        ).pack(side="left")

    def save_quick_buttons_changes(self):
        for bid, ent_icon, ent_lbl, ent_amt, ent_cat, ent_desc in self.btn_entries:
            icon = ent_icon.get().strip() or "⚡"
            label = ent_lbl.get().strip() or "Atalho"
            try:
                amt = float(ent_amt.get().strip().replace(",", "."))
            except ValueError:
                amt = 0.0
            cat = ent_cat.get().strip() or "Geral"
            desc = ent_desc.get().strip() or label
            update_quick_button(bid, label, amt, cat, desc, icon)
        messagebox.showinfo("Sucesso", "Atalhos da barra superior atualizados!")
        self.render_quick_buttons()

    def add_new_quick_button_action(self):
        add_quick_button("Novo Gasto", 10.0, "Geral", "Despesa rápida", "⚡")
        self.render_quick_button_editors()
        self.render_quick_buttons()

    def delete_button_and_refresh(self, bid):
        delete_quick_button(bid)
        self.render_quick_button_editors()
        self.render_quick_buttons()

    def submit_manual_transaction(self):
        try:
            val_str = self.entry_m_val.get().strip().replace(",", ".")
            if not val_str:
                messagebox.showerror("Erro", "Insira um valor numérico.")
                return
            amount = float(val_str)
            if amount <= 0:
                messagebox.showerror("Erro", "O valor deve ser maior que zero.")
                return
        except ValueError:
            messagebox.showerror("Erro", "Valor inválido.")
            return

        desc = self.entry_m_desc.get().strip() or "Movimentação Manual"
        t_type = "saida" if "Saída" in self.seg_trans_type.get() else "entrada"
        pot_key = self.combo_m_pot.get().split()[0] # "giro", "familia", "reserva", "stormtrooper"
        category = "Retirada" if t_type == "saida" else "Depósito/Entrada"

        add_transaction(t_type, amount, category, desc, pot=pot_key)
        self.entry_m_val.delete(0, "end")
        self.entry_m_desc.delete(0, "end")
        self.refresh_all_data()
        op_label = "Retirada" if t_type == "saida" else "Entrada"
        messagebox.showinfo("Sucesso", f"{op_label} de R$ {amount:.2f} registrada no pote {pot_key}!")

    def save_configurations(self):
        for key, entry in self.config_entries.items():
            set_config(key, entry.get().strip())
        
        for pot_name, (ent_bal, ent_tgt) in self.pot_entries.items():
            try:
                b_val = float(ent_bal.get().strip().replace(",", "."))
                set_pot_balance(pot_name, b_val)
            except ValueError:
                pass
            try:
                t_val = float(ent_tgt.get().strip().replace(",", "."))
                set_pot_target(pot_name, t_val)
            except ValueError:
                pass

        messagebox.showinfo("Sucesso", "Configurações e potes salvos com sucesso!")
        self.refresh_all_data()

    def confirm_reset_database(self):
        confirm = messagebox.askyesno(
            "Confirmar Reset",
            "Deseja realmente limpar todas as transações do extrato e zerar os saldos de todos os potes para R$ 0,00?"
        )
        if confirm:
            reset_all_transactions_and_balances()
            self.refresh_all_data()
            messagebox.showinfo("Sucesso", "Extrato limpo e todos os saldos foram resetados para R$ 0,00!")

    # ==========================================
    # AÇÕES & ATUALIZAÇÃO DE DADOS
    # ==========================================
    def quick_spend(self, amount: float, category: str, description: str):
        add_transaction("saida", amount, category, description, pot="giro")
        self.refresh_all_data()

    def log_routine_hours(self, category: str, minutes: int, notes: str):
        log_routine(category, minutes, notes)
        self.refresh_all_data()
        messagebox.showinfo("Registrado", f"{minutes} minutos registrados com sucesso!")

    def do_morning_checkin(self):
        log_morning_checkin()
        self.refresh_all_data()
        messagebox.showinfo("Check-in Realizado!", "Janela de Ouro Matinal (08h às 12h) registrada com sucesso! Mantenha a consistência nos estudos e projetos!")

    def trigger_sqlite_backup(self):
        try:
            backup_path = create_database_backup()
            messagebox.showinfo("Backup Concluído", f"Cópia de segurança gerada com sucesso em:\n{backup_path}")
        except Exception as e:
            messagebox.showerror("Erro de Backup", f"Não foi possível criar o backup: {e}")

    def refresh_all_data(self):
        # 1. Atualizar Modo Atual
        mode_info = get_current_mode()
        self.mode_badge.configure(
            text=f"MODO: {mode_info['title']}",
            text_color="#000000",
            fg_color=mode_info["color"]
        )

        # 2. Atualizar Métricas Financeiras
        fin = get_financial_overview()
        self.lbl_cota_header.configure(text=f"COTA HOJE: R$ {fin['cota_diaria']:.2f}/dia")
        self.lbl_proximo_salario.configure(
            text=f"{fin['proximo_tipo']} ({fin['proximo_dia_paga']:02d}) em {fin['dias_restantes']} dias"
        )

        # 3. Atualizar Cards dos Potes
        pots = {p["name"]: p["balance"] for p in get_pots()}
        self.card_giro.configure(text=f"R$ {pots.get('giro', 0.0):.2f}")
        self.card_familia.configure(text=f"R$ {pots.get('familia', 0.0):.2f}")
        self.card_quarto.configure(text=f"R$ {pots.get('quarto_lab', 0.0):.2f}")
        self.card_flip.configure(text=f"R$ {pots.get('hardware_flip', 0.0):.2f}")

        # 4. Atualizar Extrato Recente
        for w in self.scroll_trans.winfo_children():
            w.destroy()

        trans = get_recent_transactions(10)
        if not trans:
            ctk.CTkLabel(self.scroll_trans, text="Nenhuma despesa recente registrada.", text_color="#71717A").pack(pady=12)
        else:
            for t in trans:
                row = ctk.CTkFrame(self.scroll_trans, fg_color="#27272A", corner_radius=6)
                row.pack(fill="x", pady=2)
                sign = "+" if t["type"] == "entrada" else "-"
                color = "#00E676" if t["type"] == "entrada" else "#FF5252"
                ctk.CTkLabel(row, text=f"{sign} R$ {t['amount']:.2f}", text_color=color, font=ctk.CTkFont(weight="bold"), width=80).pack(side="left", padx=8, pady=4)
                ctk.CTkLabel(row, text=f"{t['category']}: {t['description']}", text_color="#E4E4E7", font=ctk.CTkFont(size=11)).pack(side="left", padx=8, pady=4)

        # 5. Atualizar Linha do Tempo 30 Dias
        for w in self.scroll_timeline.winfo_children():
            w.destroy()

        timeline = project_30_days_timeline()
        for d in timeline: # Mostra a projeção completa (quinzena + virada do mês)
            row = ctk.CTkFrame(self.scroll_timeline, fg_color="#27272A", corner_radius=6)
            row.pack(fill="x", pady=2)
            ctk.CTkLabel(row, text=f"{d['date']} ({d['weekday']})", text_color="#A1A1AA", font=ctk.CTkFont(size=11, weight="bold"), width=85).pack(side="left", padx=6, pady=3)
            ctk.CTkLabel(row, text=f"R$ {d['projected_balance']:.2f}", text_color="#00E5FF" if d['projected_balance'] >= 0 else "#FF5252", font=ctk.CTkFont(size=11, weight="bold"), width=85).pack(side="left", padx=6, pady=3)
            if d['events']:
                ctk.CTkLabel(row, text=f"• {d['events']}", text_color="#FFB300", font=ctk.CTkFont(size=10)).pack(side="left", padx=6, pady=3)

        # 6. Atualizar Metas de Rotina
        met = get_weekly_metrics()
        self.lbl_meta_ia.configure(text=f"🧠 Estudos de IA: {met['ia']['feitas']}h / {met['ia']['meta']}h")
        self.progress_ia.set(met['ia']['pct'])

        self.lbl_meta_iftech.configure(text=f"💼 IF Tech: {met['iftech']['feitas']}h / {met['iftech']['meta']}h")
        self.progress_iftech.set(met['iftech']['pct'])

        # 7. Atualizar Telemetria Supabase Cloud
        try:
            telemetry = fetch_supabase_telemetry()
            if telemetry.get("online"):
                self.lbl_cloud_telemetry.configure(
                    text=f"🌐 IF TECH CLOUD: {telemetry['summary']}",
                    text_color="#00E676"
                )
            else:
                self.lbl_cloud_telemetry.configure(
                    text="🌐 IF TECH CLOUD: Offline",
                    text_color="#A1A1AA"
                )
        except Exception:
            self.lbl_cloud_telemetry.configure(text="🌐 IF TECH CLOUD: Offline", text_color="#A1A1AA")

        # 8. Atualizar Status Check-in Matinal
        if hasattr(self, "lbl_morning_streak"):
            ch = get_morning_checkin_status()
            self.lbl_morning_streak.configure(text=f"🔥 STREAK: {ch['streak']} DIA(S)")
            if ch["checked_today"]:
                self.btn_morning_checkin.configure(
                    text="✅ Janela de Ouro Cumprida Hoje!",
                    fg_color="#18181B", hover_color="#27272A",
                    text_color="#00E676", state="disabled"
                )
            else:
                self.btn_morning_checkin.configure(
                    text="⚡ Check-in Janela Matinal Cumprida!",
                    fg_color="#00E676", hover_color="#00C853",
                    text_color="#000000", state="normal"
                )

        # 9. Atualizar Lista de Hardware Flips
        if hasattr(self, "scroll_flips"):
            self.render_flip_projects_list()

if __name__ == "__main__":
    from database import init_db
    init_db()
    app = LifeOpsApp()
    app.mainloop()
