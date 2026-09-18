import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def audit_supabase_calls(filename):
    print(f"\n==========================================")
    print(f"AUDITING SUPABASE CALLS IN: {filename}")
    print(f"==========================================")
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    rpc_pattern = re.compile(r"\.rpc\s*\(\s*['\"]([^'\"]+)['\"]")
    from_pattern = re.compile(r"\.from\s*\(\s*['\"]([^'\"]+)['\"]")

    rpcs = set(rpc_pattern.findall(content))
    tables = set(from_pattern.findall(content))

    print(f"Tables accessed via .from(): ({len(tables)})")
    for t in sorted(tables):
        print(f"   - {t}")

    print(f"RPCs invoked via .rpc(): ({len(rpcs)})")
    for r in sorted(rpcs):
        print(f"   - {r}")

if __name__ == "__main__":
    audit_supabase_calls("portal.html")
    audit_supabase_calls("admin.html")
