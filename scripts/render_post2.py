import os
from playwright.sync_api import sync_playwright

html_path = os.path.abspath('assets/carrossel_post2.html')
output_dir = os.path.abspath('assets/img/posts/post2')
os.makedirs(output_dir, exist_ok=True)

print(f"Iniciando renderização de: {html_path}")
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1200, 'height': 1600, 'device_scale_factor': 1})
    page.goto(f'file:///{html_path}')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2500) # Aguarda as fontes do Google

    for i in range(1, 6):
        slide_id = f'#slide-{i}'
        element = page.locator(slide_id)
        out_file = os.path.join(output_dir, f'slide_{i}.png')
        element.screenshot(path=out_file)
        print(f"Slide {i} renderizado com sucesso -> {out_file}")

    browser.close()

print("Todos os 5 slides do Post 2 foram gerados com sucesso em 1080x1350px!")
