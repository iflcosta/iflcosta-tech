import sys, os, urllib.request, json

def get_env():
    env = {}
    if os.path.exists('.env.local'):
        with open('.env.local', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    return env

def execute_sql(sql_content):
    env = get_env()
    token = env.get('SUPABASE_ACCESS_TOKEN')
    project_ref = env.get('SUPABASE_PROJECT_REF', 'togrnwxazuweuihlaljo')
    
    if not token:
        print('[ERRO] SUPABASE_ACCESS_TOKEN nao encontrado no .env.local')
        sys.exit(1)
        
    url = f'https://api.supabase.com/v1/projects/{project_ref}/database/query'
    headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    
    data = json.dumps({'query': sql_content}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8')
            print(f'[OK] SQL Executado com Sucesso no Supabase! (Status {resp.status})')
            if body and body != '[]':
                print('Resultado:', body[:300])
            return True
    except urllib.error.HTTPError as e:
        print(f'[ERRO HTTP {e.code}]:', e.read().decode('utf-8'))
        return False
    except Exception as e:
        print(f'[ERRO]:', e)
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python scripts/db_exec.py <arquivo.sql | "SQL STRING">')
        sys.exit(1)
        
    target = sys.argv[1]
    if os.path.exists(target):
        with open(target, 'r', encoding='utf-8') as f:
            sql = f.read()
        print(f'Executando arquivo: {target}...')
        execute_sql(sql)
    else:
        execute_sql(target)
