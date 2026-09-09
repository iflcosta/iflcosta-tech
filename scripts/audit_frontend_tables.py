import re
from inspect_db import run_query

def find_tables(fpath):
    with open(fpath, "r", encoding="utf-8") as fp:
        content = fp.read()
    tables = set(re.findall(r"client\.from\(['\"]([a-zA-Z0-9_-]+)['\"]\)", content))
    tables.update(re.findall(r"supabaseClient\.from\(['\"]([a-zA-Z0-9_-]+)['\"]\)", content))
    return tables

def main():
    print("=== AUDITORIA DE TABELAS FRONTEND VS BANCO SUPABASE ===")
    admin_tables = find_tables("admin.html")
    portal_tables = find_tables("portal.html")
    all_frontend_tables = admin_tables.union(portal_tables)

    print(f"Tabelas chamadas em admin.html ({len(admin_tables)}):", sorted(list(admin_tables)))
    print(f"Tabelas chamadas em portal.html ({len(portal_tables)}):", sorted(list(portal_tables)))

    db_tables_sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
    db_tables = set(r["table_name"] for r in run_query(db_tables_sql))
    print(f"\nTabelas existentes no Supabase ({len(db_tables)}):", sorted(list(db_tables)))

    missing = all_frontend_tables - db_tables
    print(f"\nTabelas chamadas no frontend que FALTAM no Supabase: {missing if missing else 'NENHUMA! Todas existem.'}")

if __name__ == "__main__":
    main()
