import os
import shutil
from playwright.sync_api import sync_playwright
from PIL import Image

def render_ads():
    html_path = os.path.abspath('assets/anuncio_whatsapp_templates.html')
    output_dir_repo = os.path.abspath('marketing/campanhas-inauguracao/04_ANUNCIO_EXCLUSIVO_WHATSAPP_MOBILE')
    output_dir_desktop = os.path.abspath('C:/Users/Iago/OneDrive/Desktop/CAMPANHAS_INSTAGRAM_IFTECH/04_ANUNCIO_EXCLUSIVO_WHATSAPP_MOBILE')
    
    os.makedirs(output_dir_repo, exist_ok=True)
    os.makedirs(output_dir_desktop, exist_ok=True)

    targets = [
        {
            "selector": "#anuncio-9-16",
            "filename": "anuncio_whatsapp_9x16_stories_reels.png",
            "width": 1080,
            "height": 1920,
            "desc": "Stories / Reels / WhatsApp Status (9:16 - 1080x1920)"
        },
        {
            "selector": "#anuncio-4-5",
            "filename": "anuncio_whatsapp_4x5_feed.png",
            "width": 1080,
            "height": 1350,
            "desc": "Feed Vertical Instagram/Facebook (4:5 - 1080x1350)"
        },
        {
            "selector": "#anuncio-1-1",
            "filename": "anuncio_whatsapp_1x1_quadrado.png",
            "width": 1080,
            "height": 1080,
            "desc": "Feed Quadrado / Multiplataforma (1:1 - 1080x1080)"
        }
    ]

    print("==================================================")
    print("Iniciando Renderização de Alta Fidelidade com Playwright...")
    print(f"Origem do Template: {html_path}")
    print("==================================================")

    with sync_playwright() as p:
        # Launch Chromium headless
        browser = p.chromium.launch()
        # Viewport large enough to render all elements without layout reflows
        page = browser.new_page(viewport={'width': 1400, 'height': 5000, 'device_scale_factor': 1})
        page.goto(f'file:///{html_path}')
        
        # Wait for network idle and fonts from Google Fonts to settle
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)

        for t in targets:
            sel = t["selector"]
            fname = t["filename"]
            expected_w = t["width"]
            expected_h = t["height"]
            
            repo_file = os.path.join(output_dir_repo, fname)
            desktop_file = os.path.join(output_dir_desktop, fname)

            element = page.locator(sel)
            img_bytes = element.screenshot()

            with open(repo_file, 'wb') as f:
                f.write(img_bytes)

            # Copy to Desktop
            shutil.copy2(repo_file, desktop_file)

            # Audit with Pillow
            with Image.open(repo_file) as im:
                actual_w, actual_h = im.size
                file_size_kb = os.path.getsize(repo_file) / 1024
                print(f"[OK] {t['desc']}")
                print(f"     Dimensões: {actual_w}x{actual_h}px (Esperado: {expected_w}x{expected_h}px)")
                print(f"     Tamanho: {file_size_kb:.1f} KB")
                print(f"     Salvo em Repo:    {repo_file}")
                print(f"     Salvo em Desktop: {desktop_file}")
                assert (actual_w, actual_h) == (expected_w, expected_h), f"Dimensão incompatível: {actual_w}x{actual_h} vs {expected_w}x{expected_h}"

        browser.close()

    print("\nTodos os anúncios Mobile-First foram renderizados e validados com 100% de sucesso!")

if __name__ == "__main__":
    render_ads()
