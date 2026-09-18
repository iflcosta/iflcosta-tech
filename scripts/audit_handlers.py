import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def audit_html_handlers(filename):
    print(f"\n==========================================")
    print(f"AUDITING EVENT HANDLERS IN: {filename}")
    print(f"==========================================")
    with open(filename, "r", encoding="utf-8") as f:
        html = f.read()

    # Extract all inline script blocks
    script_pattern = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.DOTALL | re.IGNORECASE)
    scripts = script_pattern.findall(html)
    all_js = ""
    for attrs, body in scripts:
        if 'src=' not in attrs and 'application/ld+json' not in attrs:
            all_js += "\n" + body

    # Find defined functions in JS
    func_pattern = re.compile(r"(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>))")
    defined_funcs = set()
    for m in func_pattern.finditer(all_js):
        f = m.group(1) or m.group(2)
        if f:
            defined_funcs.add(f)
    
    # Also window.funcName = ...
    win_pattern = re.compile(r"window\.([a-zA-Z0-9_$]+)\s*=")
    for m in win_pattern.finditer(all_js):
        defined_funcs.add(m.group(1))

    # Built-in or browser globals
    builtins = {
        "alert", "confirm", "prompt", "print", "close", "open", "scrollTo", "scrollBy",
        "fetch", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "console"
    }

    # Find HTML event handlers
    handler_pattern = re.compile(r'''\b(on[a-z]+)\s*=\s*["']([^"']+)["']''', re.IGNORECASE)
    matches = handler_pattern.findall(html)
    
    missing = set()
    total_calls = 0

    for event_name, code in matches:
        # Extract function call names e.g. foo(), bar(1, 2)
        call_pattern = re.compile(r"\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(")
        for call_m in call_pattern.finditer(code):
            func_name = call_m.group(1)
            total_calls += 1
            if func_name in builtins:
                continue
            # Also check if it's JS syntax like e.preventDefault, this.value, event.stopPropagation
            if func_name in {"preventDefault", "stopPropagation", "trim", "toUpperCase", "toLowerCase", "replace", "split", "join", "filter", "find", "map", "forEach", "indexOf", "includes"}:
                continue
            if func_name not in defined_funcs:
                # Check if it's a method call on an object like console.log or e.target
                prefix_check = re.search(r"\.(" + re.escape(func_name) + r")\s*\(", code)
                if not prefix_check:
                    missing.add((func_name, event_name, code.strip()))

    print(f"Total defined functions in JS: {len(defined_funcs)}")
    print(f"Total inline event handler calls checked: {total_calls}")
    if missing:
        print(f"❌ POTENTIALLY UNDEFINED FUNCTIONS ({len(missing)}):")
        for f, ev, snippet in sorted(missing):
            print(f"   - {f}() in {ev}=\"{snippet}\"")
    else:
        print("✅ 100% of all inline event handler calls match defined JavaScript functions!")

if __name__ == "__main__":
    audit_html_handlers("portal.html")
    audit_html_handlers("admin.html")
    audit_html_handlers("index.html")
