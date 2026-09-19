import os
import shutil
from playwright.sync_api import sync_playwright

def render_carrossel():
    html_path = os.path.abspath('assets/carrossel_stories_ti_suporte.html')
    output_dir_repo = os.path.abspath('marketing/campanhas-inauguracao/05_STORIES_ESPECIALISTA_ALTO_NIVEL')
    output_dir_desktop = os.path.abspath('C:/Users/Iago/OneDrive/Desktop/CAMPANHAS_INSTAGRAM_IFTECH/05_STORIES_ESPECIALISTA_ALTO_NIVEL')
    
    os.makedirs(output_dir_repo, exist_ok=True)
    os.makedirs(output_dir_desktop, exist_ok=True)

    targets = [
        {
            "selector": "#story-card-1",
            "filename": "card_01_notebook_pc_travando.png",
            "desc": "Card 01 - Notebook ou PC Travando (O Gancho de Impacto)"
        },
        {
            "selector": "#story-card-2",
            "filename": "card_02_suporte_ti_empresas.png",
            "desc": "Card 02 - Suporte de TI para Empresas & Gestão Proativa"
        },
        {
            "selector": "#story-card-3",
            "filename": "card_03_blindagem_backup_seguranca.png",
            "desc": "Card 03 - Blindagem de Dados & Backup 3-2-1"
        },
        {
            "selector": "#story-card-4",
            "filename": "card_04_engenharia_hardware_performance.png",
            "desc": "Card 04 - Engenharia de Hardware & Alta Performance"
        },
        {
            "selector": "#story-card-5",
            "filename": "card_05_laboratorio_proprio_preco_justo.png",
            "desc": "Card 05 - Institucional: Laboratório Próprio, Zero Intermediários e Preço Justo"
        }
    ]

    print("==================================================")
    print("Renderizando Carrossel de 5 Stories 9:16 com Playwright...")
    print(f"Origem do Template: {html_path}")
    print("==================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1400, 'height': 11000, 'device_scale_factor': 1})
        page.goto(f'file:///{html_path}')
        
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2500)

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

    print("\nTodos os 5 Stories do Carrossel foram renderizados e copiados com sucesso!")

if __name__ == "__main__":
    render_carrossel()
