import os
import re
import subprocess
import tempfile

def check_html_js(file_path):
    print(f"Auditing JavaScript in {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find script tags without src
    script_pattern = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.DOTALL | re.IGNORECASE)
    matches = script_pattern.findall(content)

    total = 0
    errors = 0
    for idx, (attrs, script_body) in enumerate(matches, 1):
        if 'src=' in attrs or 'application/ld+json' in attrs:
            continue
        script_text = script_body.strip()
        if not script_text:
            continue
        total += 1
        
        # Write to temp file and run node --check
        with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w", encoding="utf-8") as tf:
            tf.write(script_text)
            temp_name = tf.name

        try:
            res = subprocess.run(["node", "--check", temp_name], capture_output=True, text=True)
            if res.returncode != 0:
                print(f"❌ Syntax Error in {file_path} script block #{idx}:")
                print(res.stderr)
                errors += 1
        finally:
            if os.path.exists(temp_name):
                os.remove(temp_name)

    if errors == 0:
        print(f"[OK] {file_path}: All {total} inline scripts passed JavaScript syntax check!")
    else:
        print(f"[FAIL] {file_path}: {errors} script block(s) failed syntax check!")

if __name__ == "__main__":
    for f in ["index.html", "admin.html", "portal.html"]:
        check_html_js(f)
