import urllib.request
import json
import os
from db_exec import get_env

def run_query(sql):
    env = get_env()
    token = env.get("SUPABASE_ACCESS_TOKEN")
    project_ref = env.get("SUPABASE_PROJECT_REF", "togrnwxazuweuihlaljo")
    url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
    headers = {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "User-Agent": "Python Script"
    }
    data = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=== AUDIT SUPABASE TABLES ===")
    tables_sql = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
    """
    tables = [r["table_name"] for r in run_query(tables_sql)]
    print(f"Total Tables ({len(tables)}):", tables)

    print("\n=== ROW COUNTS ===")
    for t in tables:
        cnt_sql = f"SELECT count(*) as cnt FROM {t};"
        try:
            res = run_query(cnt_sql)
            print(f"  - {t}: {res[0]['cnt']} rows")
        except Exception as e:
            print(f"  - {t}: Error ({e})")

    print("\n=== PUBLIC RPC FUNCTIONS ===")
    rpcs_sql = """
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
    """
    rpcs = run_query(rpcs_sql)
    for r in rpcs:
        print(f"  - {r['routine_name']} ({r['routine_type']})")

if __name__ == "__main__":
    main()
