import re
import os

files_to_check = [
    'admin.html',
    'portal.html',
    'index.html',
    'app.html',
    'status.html',
    'app/index.html',
    'status/index.html'
]

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

for fname in files_to_check:
    if not os.path.exists(fname):
        continue
    print(f"\n==========================================")
    print(f"FILE: {fname}")
    print(f"==========================================")
    with open(fname, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    found_count = 0
    for idx, line in enumerate(lines, 1):
        for label, pattern in suspicious:
            if pattern.search(line):
                is_placeholder = 'placeholder=' in line and 'Asaas' not in label
                line_preview = line.strip()[:110].encode('ascii', errors='replace').decode()
                tag = "[PLACEHOLDER]" if is_placeholder else "[ALERT]"
                print(f"  Line {idx:4d} {tag} [{label}]: {line_preview}")
                found_count += 1
    if found_count == 0:
        print("  [OK] CLEAN! 0 suspicious matches found.")

