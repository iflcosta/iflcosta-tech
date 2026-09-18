import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def audit_dom_ids(filename):
    print(f"\n==========================================")
    print(f"AUDITING DOM IDs IN: {filename}")
    print(f"==========================================")
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    # Find all id="..." in HTML
    id_pattern = re.compile(r'\bid\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
    existing_ids = set(id_pattern.findall(content))

    # Find all document.getElementById('...') in scripts
    get_id_pattern = re.compile(r"getElementById\s*\(\s*['\"]([^'\"]+)['\"]\s*\)")
    queried_ids = set(get_id_pattern.findall(content))

    missing = []
    for qid in sorted(queried_ids):
        # Allow dynamic IDs that end with - or are templates
        if qid not in existing_ids:
            # Check if it might be dynamically created or template-like
            missing.append(qid)

    print(f"Total HTML element IDs declared: {len(existing_ids)}")
    print(f"Total document.getElementById queries: {len(queried_ids)}")
    if missing:
        print(f"⚠️ Queried IDs not statically declared in HTML ({len(missing)}):")
        for m in missing:
            print(f"   - {m}")
    else:
        print("✅ 100% of queried element IDs exist in the HTML!")

if __name__ == "__main__":
    audit_dom_ids("portal.html")
    audit_dom_ids("admin.html")
