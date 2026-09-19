import os
import shutil
from playwright.sync_api import sync_playwright

def render_carrossel_feed():
    html_path = os.path.abspath('assets/carrossel_feed_1x1_ti_suporte.html')
    output_dir_repo = os.path.abspath('marketing/campanhas-inauguracao/06_CARROSSEL_FEED_1X1_ESPECIALISTA')
    output_dir_desktop = os.path.abspath('C:/Users/Iago/OneDrive/Desktop/CAMPANHAS_INSTAGRAM_IFTECH/06_CARROSSEL_FEED_1X1_ESPECIALISTA')
    
    os.makedirs(output_dir_repo, exist_ok=True)
    os.makedirs(output_dir_desktop, exist_ok=True)

    targets = [
        {
            "selector": "#feed-card-1",
            "filename": "card_01_notebook_pc_travando_1x1.png",
            "desc": "Card 01 - Notebook ou PC Travando (1:1 Quadrado Feed)"
        },
        {
            "selector": "#feed-card-2",
            "filename": "card_02_suporte_ti_empresas_1x1.png",
            "desc": "Card 02 - Suporte de TI para Empresas (1:1 Quadrado Feed)"
        },
        {
            "selector": "#feed-card-3",
            "filename": "card_03_blindagem_backup_seguranca_1x1.png",
            "desc": "Card 03 - Blindagem de Dados & Backup (1:1 Quadrado Feed)"
        },
        {
            "selector": "#feed-card-4",
            "filename": "card_04_engenharia_hardware_performance_1x1.png",
            "desc": "Card 04 - Engenharia de Hardware & Performance (1:1 Quadrado Feed)"
        },
        {
            "selector": "#feed-card-5",
            "filename": "card_05_laboratorio_proprio_preco_justo_1x1.png",
            "desc": "Card 05 - Institucional: Lab Próprio & Preço Justo (1:1 Quadrado Feed)"
        }
    ]

    print("==================================================")
    print("Renderizando Carrossel de 5 Cards 1:1 (1080x1080) com Playwright...")
    print(f"Origem do Template: {html_path}")
    print("==================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1400, 'height': 7000, 'device_scale_factor': 1})
        page.goto(f'file:///{html_path}')
        
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        for t in targets:
            sel = t["selector"]
            fname = t["filename"]
            
            repo_file = os.path.normpath(os.path.join(output_dir_repo, fname))
            desktop_file = os.path.normpath(os.path.join(output_dir_desktop, fname))
            
            element = page.locator(sel)
            element.screenshot(path=repo_file)
            
            # Copia segura para Desktop
            try:
                with open(repo_file, 'rb') as f_src:
                    content = f_src.read()
                with open(desktop_file, 'wb') as f_dst:
                    f_dst.write(content)
            except Exception as e:
                print(f"   [AVISO] Falha ao sincronizar com Desktop: {e}")
            
            print(f"[OK] Renderizado: {fname}")
            print(f"   -> Repositorio: {repo_file}")
            print(f"   -> Desktop:     {desktop_file}")

        browser.close()

    print("\nTodos os 5 Cards 1:1 do Carrossel de Feed foram renderizados e copiados com sucesso!")

if __name__ == "__main__":
    render_carrossel_feed()
