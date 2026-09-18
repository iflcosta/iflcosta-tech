import os
from PIL import Image, ImageDraw, ImageFont

def get_font(name, size, bold=False):
    font_path = f"C:/Windows/Fonts/{name}bd.ttf" if bold else f"C:/Windows/Fonts/{name}.ttf"
    if os.path.exists(font_path):
        return ImageFont.truetype(font_path, size)
    fallback = "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"
    if os.path.exists(fallback):
        return ImageFont.truetype(fallback, size)
    return ImageFont.load_default()

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def generate_cover(config, output_path):
    W, H = 1080, 1080
    im = Image.new("RGB", (W, H), config["bg_color"])
    draw = ImageDraw.Draw(im)

    accent = config["accent_color"]
    # Subtle background accent glow at top
    for i in range(120):
        alpha_color = tuple(int(c * (1 - i/120) * 0.15) for c in accent)
        draw.line([(0, i), (W, i)], fill=alpha_color)

    # 1. Top Header: Brand & Location Pills
    f_brand = get_font("segoeui", 26, bold=True)
    f_loc = get_font("segoeui", 22, bold=False)

    # Brand pill
    draw_rounded_rect(draw, (70, 50, 390, 95), radius=12, fill=(26, 36, 54), outline=(42, 58, 86), width=2)
    draw.text((95, 60), "IF TECH  •  INFORMÁTICA", font=f_brand, fill=(255, 255, 255))

    # Location pill
    draw_rounded_rect(draw, (690, 50, 1010, 95), radius=12, fill=(20, 30, 45), outline=(40, 55, 80), width=1)
    draw.text((715, 62), "📍 Bragança Paulista & Região", font=f_loc, fill=(180, 200, 230))

    # 2. Inauguration Badge
    f_badge = get_font("segoeui", 26, bold=True)
    draw_rounded_rect(draw, (70, 130, 550, 185), radius=28, fill=accent)
    badge_text_color = (10, 15, 25) if config.get("dark_badge_text", True) else (255, 255, 255)
    draw.text((95, 142), config["badge_text"], font=f_badge, fill=badge_text_color)

    # 3. Main Headline
    f_title = get_font("segoeui", 54, bold=True)
    f_sub = get_font("segoeui", 29, bold=False)
    f_prop = get_font("segoeui", 26, bold=True)

    draw.text((70, 215), config["title"], font=f_title, fill=(255, 255, 255))
    draw.text((70, 290), config["subtitle"], font=f_sub, fill=(160, 185, 215))
    draw.text((70, 335), config["value_prop"], font=f_prop, fill=accent)

    # 4. Central Checklist Card (What is included)
    card_top = 395
    card_bottom = 755
    draw_rounded_rect(draw, (70, card_top, 1010, card_bottom), radius=20, fill=(18, 26, 40), outline=(36, 52, 78), width=2)

    f_card_header = get_font("segoeui", 26, bold=True)
    draw.text((105, card_top + 25), "O QUE ESTÁ INCLUSO NO SERVIÇO:", font=f_card_header, fill=(140, 170, 210))

    f_item = get_font("segoeui", 27, bold=False)
    f_check = get_font("segoeui", 26, bold=True)

    items = config["items"]
    start_y = card_top + 75
    for i, item in enumerate(items):
        y = start_y + (i * 65)
        # Checkmark badge
        draw_rounded_rect(draw, (105, y, 145, y + 40), radius=8, fill=(16, 185, 129))
        draw.text((116, y + 3), "✓", font=f_check, fill=(255, 255, 255))
        # Item text
        draw.text((165, y + 5), item, font=f_item, fill=(240, 245, 255))

    # 5. Pricing Anchor Box
    price_top = 780
    price_bottom = 975
    draw_rounded_rect(draw, (70, price_top, 1010, price_bottom), radius=20, fill=(12, 19, 32), outline=accent, width=3)

    f_old_price = get_font("segoeui", 28, bold=False)
    f_price_label = get_font("segoeui", 32, bold=True)
    f_big_price = get_font("segoeui", 76, bold=True)
    f_payment = get_font("segoeui", 24, bold=False)

    # Old price strikethrough
    draw.text((110, price_top + 30), config["old_price"], font=f_old_price, fill=(130, 150, 180))
    old_bbox = draw.textbbox((110, price_top + 30), config["old_price"], font=f_old_price)
    draw.line([(old_bbox[0], old_bbox[1] + 16), (old_bbox[2], old_bbox[1] + 16)], fill=(239, 68, 68), width=3)

    # Big new price
    draw.text((110, price_top + 70), config["new_price_label"], font=f_price_label, fill=(255, 255, 255))
    draw.text((370, price_top + 35), config["new_price"], font=f_big_price, fill=accent)

    # Payment conditions
    draw.text((110, price_top + 135), config["payment_terms"], font=f_payment, fill=(160, 185, 215))

    # 6. Bottom Swipe CTA
    f_swipe = get_font("segoeui", 24, bold=True)
    draw.text((310, 1005), "👉 Arraste para o lado e veja o serviço na bancada", font=f_swipe, fill=(150, 180, 220))

    im.save(output_path, quality=95)
    print(f"Generated: {output_path}")

covers = [
    {
        "output": "c:/tech-solutions-ifl/marketing/campanhas-inauguracao/01_COMBO_PC_NOVO_DE_NOVO/slide_01_capa_tabela.png",
        "bg_color": (10, 15, 26),
        "accent_color": (56, 189, 248), # Sky Blue
        "dark_badge_text": True,
        "badge_text": "🎉 INAUGURAÇÃO • 35% OFF",
        "title": 'COMBO "PC NOVO DE NOVO"',
        "subtitle": "Seu computador está lento, esquentando ou travando?",
        "value_prop": "Buscamos e entregamos no seu endereço em Bragança Paulista.",
        "items": [
            "Limpeza Técnica Profunda (desmontagem integral)",
            "Troca de Pasta Térmica Premium Arctic MX-6",
            "Formatação Limpa & Otimização do Windows",
            "Leva-e-Traz incluso com termo digital de segurança"
        ],
        "old_price": "De R$ 415,00",
        "new_price_label": "Por apenas:",
        "new_price": "R$ 230,00",
        "payment_terms": "À vista via Pix ou até 2x no cartão • Laudo Técnico em PDF incluso"
    },
    {
        "output": "c:/tech-solutions-ifl/marketing/campanhas-inauguracao/02_COMBO_NOTEBOOK_TURBO/slide_01_capa_tabela.png",
        "bg_color": (12, 17, 28),
        "accent_color": (16, 185, 129), # Emerald Green
        "dark_badge_text": True,
        "badge_text": "⚡ NOTEBOOK TURBO • 35% OFF",
        "title": "REVITALIZAÇÃO DE NOTEBOOK",
        "subtitle": "Demora para ligar ou esquenta tanto que parece que vai decolar?",
        "value_prop": "Velocidade de verdade sem precisar gastar R$ 3.000 em outro.",
        "items": [
            "Desobstrução do cooler e limpeza interna de aletas",
            "Troca de Pasta Térmica de Alta Condutividade",
            "Otimização do Windows ou Upgrade de SSD Ultra Rápido",
            "Leva-e-Traz na sua porta em toda Bragança Paulista"
        ],
        "old_price": "De R$ 445,00",
        "new_price_label": "A partir de:",
        "new_price": "R$ 250,00",
        "payment_terms": "Opção com SSD 480GB incluso por R$ 310 • Até 3x no cartão"
    },
    {
        "output": "c:/tech-solutions-ifl/marketing/campanhas-inauguracao/03_MONTAGEM_PC_GAMER_VIP/slide_01_capa_tabela.png",
        "bg_color": (14, 13, 24),
        "accent_color": (168, 85, 247), # Neon Violet
        "dark_badge_text": False,
        "badge_text": "🎮 SETUP VIP • 35% OFF",
        "title": "MONTAGEM DE PC GAMER",
        "subtitle": "Comprou as peças na internet e quer montagem cirúrgica?",
        "value_prop": "Montagem profissional, temperaturas baixas e laudo de estresse.",
        "items": [
            "Cable Management militar (fios ocultos e fluxo de ar)",
            "Atualização de BIOS e Perfil de Memória XMP/EXPO",
            "1 Hora de Teste de Estresse Térmico (AIDA64 + FurMark)",
            "Entrega e instalação física pronta na sua mesa"
        ],
        "old_price": "De R$ 285,00",
        "new_price_label": "Por apenas:",
        "new_price": "R$ 185,00",
        "payment_terms": "À vista via Pix ou no cartão • Entrega segura em Bragança"
    }
]

if __name__ == "__main__":
    for c in covers:
        generate_cover(c, c["output"])
    print("All 3 covers generated successfully!")
