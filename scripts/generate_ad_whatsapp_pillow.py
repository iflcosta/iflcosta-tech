import os
import shutil
from PIL import Image, ImageDraw, ImageFont

def get_font(name, size, bold=False):
    """Obtém fonte do sistema Windows com fallback gracioso"""
    font_path = f"C:/Windows/Fonts/{name}bd.ttf" if bold else f"C:/Windows/Fonts/{name}.ttf"
    if os.path.exists(font_path):
        try:
            return ImageFont.truetype(font_path, size)
        except Exception:
            pass
    fallback = "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"
    if os.path.exists(fallback):
        try:
            return ImageFont.truetype(fallback, size)
        except Exception:
            pass
    arial = "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
    if os.path.exists(arial):
        try:
            return ImageFont.truetype(arial, size)
        except Exception:
            pass
    return ImageFont.load_default()

def draw_grid_background(draw, width, height, step=54, color=(20, 20, 26)):
    """Desenha a malha técnica sutil da IF Tech"""
    for x in range(0, width, step):
        draw.line([(x, 0), (x, height)], fill=color, width=1)
    for y in range(0, height, step):
        draw.line([(0, y), (width, y)], fill=color, width=1)

def draw_whatsapp_icon(draw, cx, cy, radius, bg_color=(255, 255, 255), fg_color=(37, 211, 102)):
    """Desenha o ícone arredondado de alta resolução do WhatsApp"""
    draw.ellipse([(cx - radius, cy - radius), (cx + radius, cy + radius)], fill=bg_color)
    # Círculo interno ou símbolo estilizado
    r_in = int(radius * 0.65)
    draw.ellipse([(cx - r_in, cy - r_in), (cx + r_in, cy + r_in)], fill=fg_color)
    # Bico do balão
    tail_pts = [(cx - int(radius*0.4), cy + int(radius*0.3)), 
                (cx - int(radius*0.7), cy + int(radius*0.7)), 
                (cx - int(radius*0.1), cy + int(radius*0.5))]
    draw.polygon(tail_pts, fill=fg_color)
    # Telefone branco
    f_phone = get_font("segoeui", int(radius * 0.8), bold=True)
    draw.text((cx - int(radius*0.35), cy - int(radius*0.5)), "✆", font=f_phone, fill=(255, 255, 255))

def generate_pillow_ads():
    out_dir_repo = os.path.abspath('marketing/campanhas-inauguracao/04_ANUNCIO_EXCLUSIVO_WHATSAPP_MOBILE')
    out_dir_desktop = os.path.abspath('C:/Users/Iago/OneDrive/Desktop/CAMPANHAS_INSTAGRAM_IFTECH/04_ANUNCIO_EXCLUSIVO_WHATSAPP_MOBILE')
    
    os.makedirs(out_dir_repo, exist_ok=True)
    os.makedirs(out_dir_desktop, exist_ok=True)

    # Cores Oficiais IF Tech
    BG_DARK = (10, 10, 12)          # #0A0A0C
    CARD_BG = (18, 18, 22)          # #121216
    BORDER_DARK = (39, 39, 46)      # #27272E
    LIME_ACCENT = (204, 255, 0)     # #CCFF00
    WA_GREEN = (37, 211, 102)       # #25D366
    TEXT_WHITE = (255, 255, 255)
    TEXT_MUTED = (161, 161, 170)    # #A1A1AA
    TEXT_DIM = (113, 113, 122)      # #71717A

    configs = [
        {
            "filename": "anuncio_whatsapp_9x16_stories_reels.png",
            "width": 1080,
            "height": 1920,
            "safe_top": 260,
            "margin_x": 64,
            "format_name": "Stories / Reels / WhatsApp Status (9:16)"
        },
        {
            "filename": "anuncio_whatsapp_4x5_feed.png",
            "width": 1080,
            "height": 1350,
            "safe_top": 54,
            "margin_x": 54,
            "format_name": "Feed Vertical Instagram/Facebook (4:5)"
        }
    ]

    print("==================================================")
    print("Gerador Nativo Pillow (PIL) - IF Tech Mobile-First")
    print("==================================================")

    for cfg in configs:
        W = cfg["width"]
        H = cfg["height"]
        pad_x = cfg["margin_x"]
        card_w = W - (2 * pad_x)

        im = Image.new("RGB", (W, H), BG_DARK)
        draw = ImageDraw.Draw(im)

        # 1. Grid de Engenharia
        draw_grid_background(draw, W, H, step=54, color=(18, 18, 24))

        # 2. Top Safe Zone Margin
        curr_y = cfg["safe_top"]

        # --- CABEÇALHO ---
        # Logo Box IF
        logo_size = 52
        draw.rectangle([(pad_x, curr_y), (pad_x + logo_size, curr_y + logo_size)], fill=LIME_ACCENT)
        f_logo = get_font("segoeui", 28, bold=True)
        draw.text((pad_x + 11, curr_y + 7), "IF", font=f_logo, fill=(10, 10, 12))

        # Brand text
        f_brand = get_font("segoeui", 26, bold=True)
        f_cat = get_font("consola", 13, bold=True)
        draw.text((pad_x + 66, curr_y + 4), "IF Tech", font=f_brand, fill=TEXT_WHITE)
        draw.text((pad_x + 66, curr_y + 32), "ENGENHARIA DE HARDWARE & TI", font=f_cat, fill=TEXT_MUTED)

        # Location Pill (Right Aligned)
        f_loc = get_font("consola", 14, bold=True)
        loc_text = "📍 Bragança Paulista & Região"
        loc_box_w = 310
        loc_x = W - pad_x - loc_box_w
        draw.rounded_rectangle([(loc_x, curr_y + 4), (loc_x + loc_box_w, curr_y + 48)], radius=20, fill=(20, 20, 26), outline=BORDER_DARK, width=1)
        draw.text((loc_x + 20, curr_y + 14), loc_text, font=f_loc, fill=(228, 228, 231))

        curr_y += 75

        # --- BADGES DE ANCORAGEM ---
        f_badge = get_font("consola", 15, bold=True)
        
        # Badge 1: 35% OFF
        b1_w = 260
        draw.rounded_rectangle([(pad_x, curr_y), (pad_x + b1_w, curr_y + 38)], radius=6, fill=LIME_ACCENT)
        draw.text((pad_x + 14, curr_y + 8), "⚡ 35% OFF • INAUGURAÇÃO", font=f_badge, fill=(10, 10, 12))

        # Badge 2: SOS
        b2_x = pad_x + b1_w + 14
        b2_w = 260
        draw.rounded_rectangle([(b2_x, curr_y), (b2_x + b2_w, curr_y + 38)], radius=6, fill=(40, 15, 20), outline=(239, 68, 68), width=1)
        draw.text((b2_x + 14, curr_y + 8), "🚨 SOS COMPUTADOR LENTO", font=f_badge, fill=(252, 165, 165))

        # Badge 3: Leva-e-Traz
        b3_x = b2_x + b2_w + 14
        b3_w = 240
        draw.rounded_rectangle([(b3_x, curr_y), (b3_x + b3_w, curr_y + 38)], radius=6, fill=(15, 35, 22), outline=WA_GREEN, width=1)
        draw.text((b3_x + 14, curr_y + 8), "🛵 LEVA-E-TRAZ NA PORTA", font=f_badge, fill=WA_GREEN)

        curr_y += 56

        # --- HEADLINE PRINCIPAL ---
        head_size = 66 if H == 1920 else 54
        f_head = get_font("segoeui", head_size, bold=True)
        
        draw.text((pad_x, curr_y), "SEU PC TRAVANDO OU ESQUENTANDO?", font=f_head, fill=TEXT_WHITE)
        curr_y += int(head_size * 1.15)
        draw.text((pad_x, curr_y), "DEIXE NOVO DE NOVO", font=f_head, fill=LIME_ACCENT)
        curr_y += int(head_size * 1.15)
        draw.text((pad_x, curr_y), "SEM SAIR DE CASA.", font=f_head, fill=TEXT_WHITE)
        curr_y += int(head_size * 1.25)

        # Sub-lead
        lead_size = 22 if H == 1920 else 19
        f_lead = get_font("segoeui", lead_size, bold=False)
        draw.line([(pad_x, curr_y), (pad_x, curr_y + 55)], fill=LIME_ACCENT, width=4)
        draw.text((pad_x + 18, curr_y + 2), "Buscamos no seu endereço em Bragança Paulista com Leva-e-Traz Seguro.", font=f_lead, fill=(212, 212, 216))
        draw.text((pad_x + 18, curr_y + 28), "Revisão cirúrgica de bancada, pasta térmica premium e Windows voando.", font=f_lead, fill=(212, 212, 216))
        curr_y += 80

        # --- BENTO CHECKLIST CARD ---
        card_h = 320 if H == 1920 else 265
        draw.rounded_rectangle([(pad_x, curr_y), (pad_x + card_w, curr_y + card_h)], radius=12, fill=CARD_BG, outline=BORDER_DARK, width=2)
        
        f_card_head = get_font("consola", 15, bold=True)
        draw.text((pad_x + 24, curr_y + 18), "⚙️  O QUE ESTÁ INCLUSO NO COMBO COMPLETO:", font=f_card_head, fill=LIME_ACCENT)
        draw.line([(pad_x + 24, curr_y + 44), (pad_x + card_w - 24, curr_y + 44)], fill=(34, 34, 40), width=1)

        items = [
            ("Limpeza Técnica Profunda:", "Desmontagem integral & banho isopropílico"),
            ("Pasta Térmica Arctic MX-6:", "Redução drástica de temperatura (-20°C)"),
            ("Formatação & Otimização:", "Windows limpo, veloz e sem travamentos"),
            ("Leva-e-Traz Seguro:", "Coleta e entrega com Termo Digital de Responsabilidade")
        ]

        item_y = curr_y + 60
        f_bold_item = get_font("segoeui", 19 if H == 1920 else 17, bold=True)
        f_reg_item = get_font("segoeui", 19 if H == 1920 else 17, bold=False)

        for strong_txt, desc_txt in items:
            # Checkbox Box
            draw.rounded_rectangle([(pad_x + 24, item_y), (pad_x + 54, item_y + 30)], radius=5, fill=(30, 40, 15), outline=LIME_ACCENT, width=2)
            draw.text((pad_x + 32, item_y + 2), "✓", font=f_bold_item, fill=LIME_ACCENT)
            # Texts
            draw.text((pad_x + 68, item_y + 3), strong_txt, font=f_bold_item, fill=TEXT_WHITE)
            bbox = draw.textbbox((pad_x + 68, item_y + 3), strong_txt, font=f_bold_item)
            draw.text((bbox[2] + 8, item_y + 3), desc_txt, font=f_reg_item, fill=(228, 228, 231))
            item_y += 58 if H == 1920 else 48

        curr_y += card_h + (25 if H == 1920 else 18)

        # --- PRICING BOX ---
        price_h = 160 if H == 1920 else 140
        draw.rounded_rectangle([(pad_x, curr_y), (pad_x + card_w, curr_y + price_h)], radius=12, fill=(16, 16, 20), outline=LIME_ACCENT, width=3)

        f_old = get_font("consola", 20, bold=True)
        f_plabel = get_font("consola", 15, bold=True)
        f_pterms = get_font("consola", 13, bold=False)
        f_big = get_font("segoeui", 74 if H == 1920 else 66, bold=True)
        f_curr = get_font("consola", 24, bold=True)

        # Strikethrough old price
        draw.text((pad_x + 28, curr_y + 20), "De R$ 415,00", font=f_old, fill=TEXT_DIM)
        old_bb = draw.textbbox((pad_x + 28, curr_y + 20), "De R$ 415,00", font=f_old)
        draw.line([(old_bb[0], old_bb[1] + 12), (old_bb[2], old_bb[1] + 12)], fill=(239, 68, 68), width=3)

        draw.text((pad_x + 28, curr_y + 54), "CONDIÇÃO DE INAUGURAÇÃO:", font=f_plabel, fill=(212, 212, 216))
        draw.text((pad_x + 28, curr_y + 82), "À vista via Pix ou até 2x no cartão • CDC 90 dias", font=f_pterms, fill=TEXT_MUTED)

        # Big Price on Right
        draw.text((pad_x + card_w - 330, curr_y + 40), "R$", font=f_curr, fill=LIME_ACCENT)
        draw.text((pad_x + card_w - 280, curr_y + 15), "230", font=f_big, fill=LIME_ACCENT)

        # Economy pill
        f_econ = get_font("consola", 12, bold=True)
        draw.rounded_rectangle([(pad_x + card_w - 240, curr_y + 105), (pad_x + card_w - 28, curr_y + 132)], radius=4, fill=CARD_BG, outline=LIME_ACCENT, width=1)
        draw.text((pad_x + card_w - 225, curr_y + 111), "ECONOMIA R$ 185,00", font=f_econ, fill=LIME_ACCENT)

        curr_y += price_h + (25 if H == 1920 else 18)

        # --- BOTÃO CTA MASTER WHATSAPP ---
        btn_h = 100 if H == 1920 else 88
        draw.rounded_rectangle([(pad_x, curr_y), (pad_x + card_w, curr_y + btn_h)], radius=14, fill=WA_GREEN, outline=(88, 245, 141), width=2)
        
        # WhatsApp Icon Circle
        draw_whatsapp_icon(draw, pad_x + 55, curr_y + int(btn_h/2), radius=28 if H == 1920 else 24)

        f_btn_main = get_font("segoeui", 28 if H == 1920 else 24, bold=True)
        f_btn_sub = get_font("consola", 13 if H == 1920 else 12, bold=True)

        draw.text((pad_x + 105, curr_y + (16 if H == 1920 else 14)), "CHAMAR NO WHATSAPP EM 1 CLIQUE", font=f_btn_main, fill=(4, 36, 16))
        draw.text((pad_x + 105, curr_y + (54 if H == 1920 else 48)), "⚡ Atendimento Direto com Especialista • Resposta Rápida", font=f_btn_sub, fill=(7, 56, 25))

        # Arrow Box
        arr_x = pad_x + card_w - 65
        arr_y = curr_y + int(btn_h / 2)
        draw.ellipse([(arr_x - 22, arr_y - 22), (arr_x + 22, arr_y + 22)], fill=(4, 36, 16))
        f_arr = get_font("segoeui", 20, bold=True)
        draw.text((arr_x - 8, arr_y - 14), "➜", font=f_arr, fill=WA_GREEN)

        curr_y += btn_h + (20 if H == 1920 else 14)

        # --- TRUST FOOTER ---
        f_trust = get_font("consola", 13 if H == 1920 else 12, bold=True)
        draw.line([(pad_x, curr_y), (pad_x + card_w, curr_y)], fill=(34, 34, 40), width=1)
        curr_y += 12

        draw.ellipse([(pad_x, curr_y + 4), (pad_x + 6, curr_y + 10)], fill=LIME_ACCENT)
        draw.text((pad_x + 14, curr_y), "Laudo Técnico em PDF Incluso", font=f_trust, fill=TEXT_MUTED)

        draw.ellipse([(pad_x + 330, curr_y + 4), (pad_x + 336, curr_y + 10)], fill=LIME_ACCENT)
        draw.text((pad_x + 344, curr_y), "Garantia Legal 90 Dias CDC", font=f_trust, fill=TEXT_MUTED)

        draw.ellipse([(pad_x + 660, curr_y + 4), (pad_x + 666, curr_y + 10)], fill=LIME_ACCENT)
        draw.text((pad_x + 674, curr_y), "Retirada Hoje em Bragança", font=f_trust, fill=TEXT_MUTED)

        # Salva o arquivo Pillow
        pillow_filename = cfg["filename"].replace(".png", "_pillow_variant.png")
        repo_target = os.path.join(out_dir_repo, pillow_filename)
        desktop_target = os.path.join(out_dir_desktop, pillow_filename)

        im.save(repo_target, quality=95)
        shutil.copy2(repo_target, desktop_target)
        print(f"[Pillow OK] Gerado: {pillow_filename} ({W}x{H}px)")

    print("Todas as variantes nativas Pillow foram geradas com sucesso!")

if __name__ == "__main__":
    generate_pillow_ads()
