"""
IF Tech Life & Business Ops - Database Manager (SQLite)
Gerencia persistência local de fluxo de caixa, potes e rotina.
"""

import sqlite3
import os
import shutil
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "life_ops.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Tabela de Configurações Gerais
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    # Tabela de Potes Financeiros
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pots (
            name TEXT PRIMARY KEY,
            label TEXT,
            balance REAL DEFAULT 0.0,
            target REAL DEFAULT 0.0,
            color TEXT
        )
    """)

    # Tabela de Transações / Despesas / Entradas
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            type TEXT, -- 'entrada', 'saida', 'transferencia'
            amount REAL,
            category TEXT,
            description TEXT,
            pot TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de Registro de Rotina (Horas cumpridas)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS routine_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            category TEXT, -- 'ia_estudos', 'iftech_lab', 'fabrica_clt', 'descanso'
            duration_minutes INTEGER,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de Botões de Atalho Rápido Personalizáveis
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS quick_buttons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT,
            amount REAL,
            category TEXT,
            description TEXT,
            icon TEXT
        )
    """)

    # Tabela de Projetos de Hardware Flip (Escala de PCs Comerciais)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS flip_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            cpu_cost REAL DEFAULT 0.0,
            mobo_cost REAL DEFAULT 0.0,
            ram_cost REAL DEFAULT 0.0,
            gpu_cost REAL DEFAULT 0.0,
            storage_cost REAL DEFAULT 0.0,
            psu_cost REAL DEFAULT 0.0,
            case_fans_cost REAL DEFAULT 0.0,
            other_cost REAL DEFAULT 0.0,
            sale_price REAL DEFAULT 0.0,
            status TEXT DEFAULT 'Em Montagem',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de Check-ins da Janela Matinal (08h às 12h)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS morning_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE,
            completed INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de Checklist e Cronograma de Aquisição da E-Bike DIY (Fase 1 vs Fase 2)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ebike_procurement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phase INTEGER DEFAULT 1, -- 1: Mecânica/Ferramentas/Segurança, 2: Powertrain BBSHD/Bateria
            item_name TEXT,
            estimated_cost REAL DEFAULT 0.0,
            actual_cost REAL DEFAULT 0.0,
            status TEXT DEFAULT 'Planejado', -- 'Planejado', 'Comprado'
            target_period TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de Corridas e Despacho Leva-e-Traz (E-Bike Logística)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ebike_trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            client_name TEXT,
            work_order_id TEXT,
            distance_km REAL DEFAULT 0.0,
            fee_charged REAL DEFAULT 0.0,
            operational_cost REAL DEFAULT 0.0,
            net_margin REAL DEFAULT 0.0,
            manutencao_share REAL DEFAULT 0.0,
            bateria_share REAL DEFAULT 0.0,
            amortizacao_share REAL DEFAULT 0.0,
            avoided_uber_cost REAL DEFAULT 23.0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Seed de configurações padrão (se não existirem)
    defaults_config = {
        "salario_liquido": "2164.00",
        "pct_adiantamento": "40",
        "dia_adiantamento": "20",
        "dia_saldo": "5",
        "gasto_familia": "500.00",
        "gasto_fds": "100.00",
        "orcamento_lazer": "400.00", # 4 x R$ 100 fds namorada (zero cigarro)
        "meta_horas_ia_semana": "7.5",
        "meta_horas_iftech_semana": "25.0",
        "ebike_meta_capex": "11000.00",
        "ebike_aporte_mensal": "1833.00",
        "ebike_data_inicio": "2026-10-01",
        "ebike_data_alvo": "2027-03-31",
        "ebike_tarifa_km": "0.89",
        "ebike_taxa_minima": "6.50",
        "ebike_cpk_total": "0.234",
        "ebike_pct_manutencao": "26",
        "ebike_pct_bateria": "35",
        "ebike_pct_amortizacao": "39",
        "ebike_custo_uber_referencia": "23.00"
    }

    for key, val in defaults_config.items():
        cursor.execute("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)", (key, val))
    # Atualiza meta semanal de iftech para o novo patamar
    cursor.execute("UPDATE config SET value = '25.0' WHERE key = 'meta_horas_iftech_semana' AND value = '12.0'")

    # Limpa potes antigos se existirem
    cursor.execute("DELETE FROM pots WHERE name IN ('reserva', 'stormtrooper')")

    # Seed de Potes Estratégicos (Operacionais, Pessoais e Projeto E-Bike)
    default_pots = [
        ("giro", "Caixa de Giro Diário", 0.0, 400.0, "#00E676"),
        ("familia", "Provisão Família (Dia 05)", 0.0, 500.0, "#FFB300"),
        ("quarto_lab", "Projeto Quarto & Bancada", 0.0, 1560.0, "#00E5FF"),
        ("hardware_flip", "Giro Hardware / Flip PCs", 0.0, 4000.0, "#E040FB"),
        ("ebike_capex", "Projeto E-Bike BBSHD 1000W", 0.0, 11000.0, "#76FF03"),
        ("ebike_bateria", "E-Bike: Fundo Nova Bateria", 0.0, 2800.0, "#00E5FF"),
        ("ebike_manutencao", "E-Bike: Manutenção Imediata", 0.0, 500.0, "#FF9100")
    ]

    for name, label, balance, target, color in default_pots:
        cursor.execute("""
            INSERT OR IGNORE INTO pots (name, label, balance, target, color)
            VALUES (?, ?, ?, ?, ?)
        """, (name, label, balance, target, color))

    # Remove qualquer botão antigo de cigarro
    cursor.execute("DELETE FROM quick_buttons WHERE label LIKE '%Maço%' OR category LIKE '%Cigarro%'")

    # Seed de Botões Rápidos (se a tabela estiver vazia)
    btn_count = cursor.execute("SELECT COUNT(*) FROM quick_buttons").fetchone()[0]
    if btn_count == 0:
        default_buttons = [
            ("Fim de Semana", 100.0, "Lazer / Namoro", "Saída / Lanche Fim de Semana", "💑"),
            ("Mercado / Útil", 20.0, "Utilidades", "Gasto Avulso Mercado/Farmácia", "🛒"),
            ("Lanche Avulso", 30.0, "Alimentação", "Lanche Avulso", "🍔"),
            ("Transporte", 25.0, "Transporte", "Gasto Avulso Transporte", "🚶")
        ]
        for label, amount, category, description, icon in default_buttons:
            cursor.execute("""
                INSERT INTO quick_buttons (label, amount, category, description, icon)
                VALUES (?, ?, ?, ?, ?)
            """, (label, amount, category, description, icon))

    # Seed de Projetos de Hardware Flip (se estiver vazio)
    flip_count = cursor.execute("SELECT COUNT(*) FROM flip_projects").fetchone()[0]
    if flip_count == 0:
        cursor.execute("""
            INSERT INTO flip_projects (
                name, cpu_cost, mobo_cost, ram_cost, gpu_cost, storage_cost, 
                psu_cost, case_fans_cost, other_cost, sale_price, status, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "PC 1: Xeon Gamer E5 2680v4 + RX 580 (Flip Comercial)",
            180.0, 280.0, 160.0, 420.0, 190.0, 240.0, 260.0, 120.0,
            3850.0, "Em Montagem", "Ativo comercial. 100% da venda líquida irá para o pote hardware_flip para montar o PC de R$ 6.000."
        ))

    # Seed de Itens de Aquisição da E-Bike BBSHD se estiver vazio
    proc_count = cursor.execute("SELECT COUNT(*) FROM ebike_procurement").fetchone()[0]
    if proc_count == 0:
        default_procurement = [
            # Fase 1: Mecânica, Ferramentas, Segurança CONTRAN 996 (Meses 1 a 4 - Out/26 a Jan/27)
            (1, "Corrente Reforçada e-Bike (KMC e-Glide/e9/e10)", 180.0, 0.0, "Planejado", "Meses 1 a 4 (Out/26 - Jan/27)", "Resiste aos 160Nm do motor. Aproveitar promoções / Black Friday."),
            (1, "Pastilhas de Freio Metálicas/Sinterizadas + Fluído", 160.0, 0.0, "Planejado", "Meses 1 a 4 (Out/26 - Jan/27)", "Frenagem de alta performance para descidas severas de Bragança com carga."),
            (1, "Kit Legal CONTRAN 996 (Farol 1000lm, Lanterna, Retrovisor Esq, Campainha)", 220.0, 0.0, "Planejado", "Meses 1 a 4 (Out/26 - Jan/27)", "Conformidade legal integral com a Resolução CONTRAN 996/2023."),
            (1, "Ferramentas Específicas (Chave BBS, Extrator Pedivela, Alicate Elo)", 140.0, 0.0, "Planejado", "Meses 1 a 4 (Out/26 - Jan/27)", "Ferramental indispensável para montagem e manutenção DIY."),
            (1, "Canote Retrátil Mecânico c/ Alavanca Guidão (Dropper Post)", 350.0, 0.0, "Planejado", "Meses 1 a 4 (Out/26 - Jan/27)", "Ajuste rápido de altura para apoio firme dos pés em aclives acentuados."),
            # Fase 2: Powertrain BBSHD 1000W e Bateria Li-ion NMC (Meses 5 e 6 - Fev/27 a Mar/27)
            (2, "Kit Motor Central Bafang BBSHD 1000W Completo (Display DPC-18 + Sensores)", 7800.0, 0.0, "Planejado", "Meses 5 e 6 (Fev/27 - Mar/27)", "160 Nm de torque, 48V/52V 30A. Adquirir na semana da montagem para garantia integral."),
            (2, "Bateria Lítio Li-ion NMC 48V/52V 20Ah Hailong (1000Wh) + Carregador 3A/4A", 2700.0, 0.0, "Planejado", "Meses 5 e 6 (Fev/27 - Mar/27)", "Pack de alta densidade. Compra imediata na montagem para preservar frescor químico.")
        ]
        for phase, item_name, est_cost, act_cost, status, period, notes in default_procurement:
            cursor.execute("""
                INSERT INTO ebike_procurement (phase, item_name, estimated_cost, actual_cost, status, target_period, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (phase, item_name, est_cost, act_cost, status, period, notes))

    conn.commit()
    conn.close()

def get_quick_buttons():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM quick_buttons ORDER BY id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_quick_button(btn_id: int, label: str, amount: float, category: str, description: str, icon: str = ""):
    conn = get_connection()
    conn.execute("""
        UPDATE quick_buttons 
        SET label = ?, amount = ?, category = ?, description = ?, icon = ?
        WHERE id = ?
    """, (label, amount, category, description, icon, btn_id))
    conn.commit()
    conn.close()

def add_quick_button(label: str, amount: float, category: str, description: str, icon: str = "⚡"):
    conn = get_connection()
    conn.execute("""
        INSERT INTO quick_buttons (label, amount, category, description, icon)
        VALUES (?, ?, ?, ?, ?)
    """, (label, amount, category, description, icon))
    conn.commit()
    conn.close()

def delete_quick_button(btn_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM quick_buttons WHERE id = ?", (btn_id,))
    conn.commit()
    conn.close()

def get_config(key: str, default=None):
    conn = get_connection()
    row = conn.execute("SELECT value FROM config WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default

def set_config(key: str, value: str):
    conn = get_connection()
    conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()

def get_pots():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM pots").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_pot_balance(pot_name: str, delta: float):
    conn = get_connection()
    conn.execute("UPDATE pots SET balance = balance + ? WHERE name = ?", (delta, pot_name))
    conn.commit()
    conn.close()

def set_pot_balance(pot_name: str, new_balance: float):
    conn = get_connection()
    conn.execute("UPDATE pots SET balance = ? WHERE name = ?", (new_balance, pot_name))
    conn.commit()
    conn.close()

def set_pot_target(pot_name: str, new_target: float):
    conn = get_connection()
    conn.execute("UPDATE pots SET target = ? WHERE name = ?", (new_target, pot_name))
    conn.commit()
    conn.close()

def add_transaction(t_type: str, amount: float, category: str, description: str, pot: str = "giro"):
    conn = get_connection()
    today = datetime.now().strftime("%Y-%m-%d")
    conn.execute("""
        INSERT INTO transactions (date, type, amount, category, description, pot)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (today, t_type, amount, category, description, pot))
    
    # Atualiza saldo do pote
    delta = amount if t_type == "entrada" else -amount
    conn.execute("UPDATE pots SET balance = balance + ? WHERE name = ?", (delta, pot))
    
    conn.commit()
    conn.close()

def get_recent_transactions(limit: int = 15):
    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM transactions 
        ORDER BY id DESC LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def log_routine(category: str, duration_minutes: int, notes: str = ""):
    conn = get_connection()
    today = datetime.now().strftime("%Y-%m-%d")
    conn.execute("""
        INSERT INTO routine_logs (date, category, duration_minutes, notes)
        VALUES (?, ?, ?, ?)
    """, (today, category, duration_minutes, notes))
    conn.commit()
    conn.close()

def get_week_routine_summary():
    conn = get_connection()
    # Pega soma da semana atual
    rows = conn.execute("""
        SELECT category, SUM(duration_minutes) as total_minutes
        FROM routine_logs
        WHERE strftime('%W', date) = strftime('%W', 'now')
        GROUP BY category
    """).fetchall()
    conn.close()
    return {r["category"]: r["total_minutes"] for r in rows}

def reset_all_transactions_and_balances():
    conn = get_connection()
    conn.execute("DELETE FROM transactions")
    conn.execute("UPDATE pots SET balance = 0.0")
    conn.commit()
    conn.close()

# ==========================================
# GESTÃO DE HARDWARE FLIP (PROJETOS DE PCS)
# ==========================================
def get_flip_projects():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM flip_projects ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_flip_project(name: str, cpu: float, mobo: float, ram: float, gpu: float, 
                     storage: float, psu: float, case_fans: float, other: float, 
                     sale_price: float, status: str = "Em Montagem", notes: str = ""):
    conn = get_connection()
    conn.execute("""
        INSERT INTO flip_projects (
            name, cpu_cost, mobo_cost, ram_cost, gpu_cost, storage_cost,
            psu_cost, case_fans_cost, other_cost, sale_price, status, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (name, cpu, mobo, ram, gpu, storage, psu, case_fans, other, sale_price, status, notes))
    conn.commit()
    conn.close()

def update_flip_project_status(project_id: int, new_status: str):
    conn = get_connection()
    conn.execute("UPDATE flip_projects SET status = ? WHERE id = ?", (new_status, project_id))
    conn.commit()
    conn.close()

def delete_flip_project(project_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM flip_projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()

# ==========================================
# JANELA DE OURO MATINAL (08H ÀS 12H) & STREAK
# ==========================================
def log_morning_checkin(notes: str = ""):
    conn = get_connection()
    today = datetime.now().strftime("%Y-%m-%d")
    conn.execute("""
        INSERT OR IGNORE INTO morning_checkins (date, completed)
        VALUES (?, 1)
    """, (today,))
    conn.commit()
    conn.close()

def get_morning_checkin_status():
    conn = get_connection()
    today = datetime.now().strftime("%Y-%m-%d")
    today_row = conn.execute("SELECT * FROM morning_checkins WHERE date = ?", (today,)).fetchone()
    checked_today = today_row is not None

    # Cálculo de streak consecutivo
    streak = 0
    cur_date = datetime.now().date()
    if not checked_today:
        cur_date -= timedelta(days=1)
    
    while True:
        d_str = cur_date.strftime("%Y-%m-%d")
        row = conn.execute("SELECT * FROM morning_checkins WHERE date = ?", (d_str,)).fetchone()
        if row:
            streak += 1
            cur_date -= timedelta(days=1)
        else:
            break

    total_row = conn.execute("SELECT COUNT(*) FROM morning_checkins").fetchone()
    total_count = total_row[0] if total_row else 0
    conn.close()

    return {
        "checked_today": checked_today,
        "streak": streak,
        "total_checkins": total_count
    }

# ==========================================
# BACKUP 1-CLICK DO BANCO SQLITE
# ==========================================
def create_database_backup():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backup_dir = os.path.join(base_dir, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"life_ops_backup_{timestamp}.db"
    backup_filepath = os.path.join(backup_dir, backup_filename)
    
    shutil.copy2(DB_PATH, backup_filepath)
    return backup_filepath

# ==========================================
# GESTÃO DO PROJETO E-BIKE BBSHD 1000W & LOGÍSTICA
# ==========================================
def get_ebike_procurement():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM ebike_procurement ORDER BY phase ASC, id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_ebike_procurement_item(phase: int, item_name: str, estimated_cost: float, 
                               actual_cost: float = 0.0, status: str = "Planejado", 
                               target_period: str = "", notes: str = ""):
    conn = get_connection()
    conn.execute("""
        INSERT INTO ebike_procurement (phase, item_name, estimated_cost, actual_cost, status, target_period, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (phase, item_name, estimated_cost, actual_cost, status, target_period, notes))
    conn.commit()
    conn.close()

def update_ebike_procurement_item(item_id: int, status: str, actual_cost: float = None):
    conn = get_connection()
    if actual_cost is not None:
        conn.execute("""
            UPDATE ebike_procurement SET status = ?, actual_cost = ? WHERE id = ?
        """, (status, actual_cost, item_id))
    else:
        conn.execute("""
            UPDATE ebike_procurement SET status = ? WHERE id = ?
        """, (status, item_id))
    conn.commit()
    conn.close()

def delete_ebike_procurement_item(item_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM ebike_procurement WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()

def get_ebike_trips(limit: int = 50):
    conn = get_connection()
    rows = conn.execute("SELECT * FROM ebike_trips ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_ebike_trip(client_name: str, distance_km: float, fee_charged: float, 
                   operational_cost: float, net_margin: float, 
                   manutencao_share: float, bateria_share: float, amortizacao_share: float,
                   work_order_id: str = "", avoided_uber_cost: float = 23.0, notes: str = "", date_str: str = None):
    conn = get_connection()
    today = date_str if date_str else datetime.now().strftime("%Y-%m-%d")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO ebike_trips (
            date, client_name, work_order_id, distance_km, fee_charged,
            operational_cost, net_margin, manutencao_share, bateria_share,
            amortizacao_share, avoided_uber_cost, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (today, client_name, work_order_id, distance_km, fee_charged,
          operational_cost, net_margin, manutencao_share, bateria_share,
          amortizacao_share, avoided_uber_cost, notes))
    trip_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return trip_id

def delete_ebike_trip(trip_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM ebike_trips WHERE id = ?", (trip_id,))
    conn.commit()
    conn.close()


