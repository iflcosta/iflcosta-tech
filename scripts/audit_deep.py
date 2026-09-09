import re, sys

def audit_file(filepath):
    print(f"=== AUDITING {filepath} ===")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    scripts = "\n".join(re.findall(r"<script\b[^>]*>(.*?)</script>", content, re.DOTALL | re.IGNORECASE))
    handlers = re.findall(r"on(?:click|submit|change|input)\s*=\s*['\"]([a-zA-Z0-9_$]+)\s*\(", content, re.IGNORECASE)

    missing_handlers = set()
    standard_builtins = {"alert", "confirm", "prompt", "print", "close", "setTimeout", "clearTimeout", "setInterval", "clearInterval"}
    for func in set(handlers):
        if func in standard_builtins:
            continue
        pattern = rf"(?:function\s+{func}\b|window\.{func}\s*=|const\s+{func}\s*=|let\s+{func}\s*=|var\s+{func}\s*=|(?<![a-zA-Z0-9_]){func}\s*=)"
        if not re.search(pattern, scripts):
            missing_handlers.add(func)

    print(f"Event handlers found: {len(set(handlers))}")
    if missing_handlers:
        print("❌ MISSING EVENT HANDLERS:", missing_handlers)
    else:
        print("[OK] All event handlers have matching JS functions!")

    get_ids = set(re.findall(r"getElementById\(['\"]([a-zA-Z0-9_-]+)['\"]\)", scripts))
    dom_ids = set(re.findall(r"id=['\"]([a-zA-Z0-9_-]+)['\"]", content))
    dynamic_ids = set(re.findall(r"id=['\"]([a-zA-Z0-9_-]+)['\"]", scripts))
    all_available = dom_ids | dynamic_ids

    missing_ids = get_ids - all_available
    print(f"\nTotal getElementById calls: {len(get_ids)}")
    print(f"Total DOM + template IDs: {len(all_available)}")
    if missing_ids:
        print("IDs referenced by getElementById not found in DOM/templates:")
        for mid in sorted(list(missing_ids)):
            print(f"   - {mid}")
    else:
        print("[OK] All getElementById references match valid DOM IDs!")

if __name__ == '__main__':
    targets = sys.argv[1:] if len(sys.argv) > 1 else ['admin.html']
    for t in targets:
        audit_file(t)
