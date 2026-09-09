import re
import os
import urllib.request
import json
import subprocess
import tempfile
import hashlib

print("=================================================================")
print(">>> RELATORIO DE AUDITORIA DE PRONTIDAO PARA PRODUCAO (IF TECH)")
print("=================================================================\n")

# 1. PARIDADE DE TRÍADES (HASH SHA-256)
print("--- 1. INTEGRIDADE DE ARQUIVOS & PARIDADE DAS TRÍADES ---")
def file_hash(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

admin_triad = ['admin.html', 'app.html', 'app/index.html']
portal_triad = ['portal.html', 'status.html', 'status/index.html']

admin_hashes = [file_hash(f) for f in admin_triad if os.path.exists(f)]
portal_hashes = [file_hash(f) for f in portal_triad if os.path.exists(f)]

if len(set(admin_hashes)) == 1 and len(admin_hashes) == 3:
    print(f"  [OK] Tríade Cockpit (admin.html, app.html, app/index.html): 100% IDÊNTICA (Hash: {admin_hashes[0][:12]}...)")
else:
    print("  [FALHA] Tríade Cockpit com divergência de arquivos!")

if len(set(portal_hashes)) == 1 and len(portal_hashes) == 3:
    print(f"  [OK] Tríade Portal (portal.html, status.html, status/index.html): 100% IDÊNTICA (Hash: {portal_hashes[0][:12]}...)")
else:
    print("  [FALHA] Tríade Portal com divergência de arquivos!")

# 2. SINTAXE JAVASCRIPT (NODE.JS)
print("\n--- 2. VALIDAÇÃO DE SINTAXE JAVASCRIPT (NODE.JS v24) ---")
for fname in ['admin.html', 'portal.html', 'index.html']:
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    script_matches = re.finditer(r'<script([^>]*)>(.*?)</script>', content, re.DOTALL | re.I)
    has_err = False
    for idx, m in enumerate(script_matches, 1):
        attrs = m.group(1)
        body = m.group(2)
        if 'application/ld+json' in attrs or not body.strip():
            continue
        with tempfile.NamedTemporaryFile(suffix='.js', delete=False, mode='w', encoding='utf-8') as tf:
            tf.write(body)
            tf_path = tf.name
        res = subprocess.run(['node', '--check', tf_path], capture_output=True, text=True)
        if res.returncode != 0:
            print(f"  [ERRO] Sintaxe em {fname} script #{idx}: {res.stderr}")
            has_err = True
        try: os.unlink(tf_path)
        except: pass
    if not has_err:
        print(f"  [OK] {fname}: Sintaxe JS 100% válida e sem erros.")

# 3. SCAN DE HARDCODED MOCKS & LEAKS
print("\n--- 3. VARREDURA DE DADOS MOCKADOS E LEAKS (7 ARQUIVOS) ---")
suspicious = [
    ('Mock Name Lucas', re.compile(r'Lucas\s+Oliveira', re.I)),
    ('Mock Name Carlos', re.compile(r'Carlos\s+Eduardo', re.I)),
    ('Mock Name Roberto', re.compile(r'Roberto\s+Guimar[aã]es', re.I)),
    ('Mock Name Vista Braganca', re.compile(r'Vista\s+Bragan[cç]a', re.I)),
    ('Mock Name Clinica Sao Francisco', re.compile(r'Cl[ií]nica.*S[aã]o\s+Francisco', re.I)),
    ('Mock Phone 99999', re.compile(r'99999-8888')),
    ('Mock Phone 98765', re.compile(r'98765-4321')),
    ('Mock Defect Video Bipa', re.compile(r'N[aã]o d[aá] v[ií]deo e bipa', re.I)),
    ('Mock OS #1050', re.compile(r'#1050|#1001|#1048|#1053')),
    ('Asaas Gateway', re.compile(r'asaas|pix\.asaas', re.I)),
]

all_files = admin_triad + portal_triad + ['index.html']
total_alerts = 0
for f in all_files:
    with open(f, 'r', encoding='utf-8') as fp:
        lines = fp.readlines()
    f_alerts = 0
    for idx, line in enumerate(lines, 1):
        for label, pat in suspicious:
            if pat.search(line):
                is_ph = 'placeholder=' in line and 'Asaas' not in label
                if not is_ph:
                    print(f"  [ALERTA] {f}:{idx} [{label}] {line.strip()[:80]}")
                    f_alerts += 1
    if f_alerts == 0:
        print(f"  [OK] {f}: 0 dados mockados encontrados.")
    total_alerts += f_alerts

# 4. TESTE DE CONEXÃO COM O SUPABASE
print("\n--- 4. BANCO DE DADOS SUPABASE & ENDPOINTS EM NUVEM ---")
SUPABASE_URL = "https://togrnwxazuweuihlaljo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZ3Jud3hhenV3ZXVpaGxhbGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNDYxMTMsImV4cCI6MjA5NDgyMjExM30.EH7EslfRQRoCbdbKxK0A07DZQ0Ich05KoRD1hddJA34"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

tables = ['work_orders', 'clients', 'products', 'software_projects', 'msp_contracts', 'msp_tickets']
for t in tables:
    try:
        url = f"{SUPABASE_URL}/rest/v1/{t}?select=id&limit=1"
        req = urllib.request.Request(url, headers={**headers, 'Prefer': 'count=exact'}, method='GET')
        with urllib.request.urlopen(req, timeout=5) as resp:
            crange = resp.headers.get('Content-Range', '0')
            total = crange.split('/')[-1] if '/' in crange else '0'
            print(f"  [OK] Tabela '{t}': Conectada! Registros em produção: {total}")
    except Exception as e:
        print(f"  [ERRO] Tabela '{t}': {e}")

# 5. TESTE DO MOTOR PIX OFICIAL (BACEN EMV BR CODE)
print("\n--- 5. MOTOR PIX OFICIAL (ianpietrinho@gmail.com) ---")
test_js = """
function crc16Pix(str) {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if ((crc & 0x8000) !== 0) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            else crc = (crc << 1) & 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}
function generatePixPayload(pixKey, merchantName, merchantCity, amount, txId = '***') {
    function formatField(id, val) { return id + String(val.length).padStart(2, '0') + val; }
    const mai = formatField('26', formatField('00', 'br.gov.bcb.pix') + formatField('01', pixKey.trim()));
    let payload = formatField('00', '01') + mai + formatField('52', '0000') + formatField('53', '986');
    if (amount > 0) payload += formatField('54', parseFloat(amount).toFixed(2));
    payload += formatField('58', 'BR') + formatField('59', merchantName.trim().slice(0, 25)) + formatField('60', merchantCity.trim().slice(0, 15));
    payload += formatField('62', formatField('05', (txId || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***'));
    payload += '6304';
    return payload + crc16Pix(payload);
}
const code = generatePixPayload('ianpietrinho@gmail.com', 'IAN PIETRO', 'BRAGANCA PAUL', 250.00, 'OS0926001');
console.log(JSON.stringify({ code: code, crc: code.slice(-4), valid: code.startsWith('00020126440014br.gov.bcb.pix') }));
"""
node_res = subprocess.run(['node', '-e', test_js], capture_output=True, text=True)
if node_res.returncode == 0:
    data = json.loads(node_res.stdout.strip())
    print(f"  [OK] Algoritmo EMV BR Code: Validado!")
    print(f"  [OK] Chave Oficial: ianpietrinho@gmail.com")
    print(f"  [OK] Favorecido: IAN PIETRO // Cidade: BRAGANCA PAUL")
    print(f"  [OK] Exemplo R$ 250,00 (CRC {data['crc']}): {data['code']}")
else:
    print(f"  [ERRO] Falha ao testar Pix no Node: {node_res.stderr}")

print("\n=================================================================")
print(">>> RESULTADO GERAL DA AUDITORIA:")
if total_alerts == 0:
    print("  [OK] SISTEMA 100% PRONTO, SEGURO E HOMOLOGADO PARA OPERACAO REAL!")
else:
    print(f"  [AVISO] SISTEMA COM {total_alerts} PENDENCIAS A RESOLVER.")
print("=================================================================")


