import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

hrefs = set(re.findall(r'href=[\"\']#([a-zA-Z0-9_-]+)[\"\']', content))
ids = set(re.findall(r'id=[\"\']([a-zA-Z0-9_-]+)[\"\']', content))

missing = hrefs - ids
print(f"Total internal anchors in index.html: {len(hrefs)}")
if missing:
    print(f"[WARN] Missing target IDs: {missing}")
else:
    print("[OK] All internal anchors match valid section IDs!")

# Also check external links
links = re.findall(r'href=[\"\'](https?://[^\"\']+)[\"\']', content)
print(f"Total external links: {len(links)}")
