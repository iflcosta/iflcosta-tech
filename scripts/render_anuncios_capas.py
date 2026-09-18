import os
from playwright.sync_api import sync_playwright

html_path = os.path.abspath('assets/carrossel_anuncios_capas.html')
base_dir = os.path.abspath('marketing/campanhas-inauguracao')

targets = [
    ('#capa-1', os.path.join(base_dir, '01_COMBO_PC_NOVO_DE_NOVO', 'slide_01_capa_tabela.png')),
    ('#capa-2', os.path.join(base_dir, '02_COMBO_NOTEBOOK_TURBO', 'slide_01_capa_tabela.png')),
    ('#capa-3', os.path.join(base_dir, '03_MONTAGEM_PC_GAMER_VIP', 'slide_01_capa_tabela.png')),
]

print(f"Iniciando renderização de: {html_path}")
with sync_playwright() as p:
    browser = p.chromium.launch()
    # Viewport largo para acomodar o container de 1080x1080
    page = browser.new_page(viewport={'width': 1200, 'height': 3600, 'device_scale_factor': 1})
    page.goto(f'file:///{html_path}')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2500) # Aguarda carregamento das fontes do Google

    for selector, out_file in targets:
        element = page.locator(selector)
        os.makedirs(os.path.dirname(out_file), exist_ok=True)
        img_bytes = element.screenshot()
        with open(out_file, 'wb') as f:
            f.write(img_bytes)
        print(f"Renderizado com sucesso -> {out_file} ({len(img_bytes)} bytes)")

    browser.close()

print("Todas as 3 capas foram geradas com sucesso na identidade oficial da IF Tech!")
