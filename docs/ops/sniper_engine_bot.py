# =====================================================================
# IF TECH // TECH SOLUTIONS - SPRINT 7
# HARDWARE SNIPER ENGINE & PROMOTION BROADCASTER (TELEGRAM / WHATSAPP)
# =====================================================================
import os
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

class HardwareSniperEngine:
    def __init__(self, telegram_token=None, telegram_chat_id=None, affiliate_tags=None):
        self.telegram_token = telegram_token or os.getenv("TELEGRAM_BOT_TOKEN")
        self.telegram_chat_id = telegram_chat_id or os.getenv("TELEGRAM_CHAT_ID")
        self.affiliate_tags = affiliate_tags or {
            "amazon": "iftech0b-20",
            "mercadolivre": "iftech_ml",
            "kabum": "iftech_kb",
            "aliexpress": "iftech_ali"
        }

    def generate_affiliate_link(self, original_url, store_name):
        store = store_name.lower()
        if "amazon" in store and self.affiliate_tags.get("amazon"):
            tag = self.affiliate_tags["amazon"]
            separator = "&" if "?" in original_url else "?"
            return f"{original_url}{separator}tag={tag}"
        elif "aliexpress" in store and self.affiliate_tags.get("ali"):
            return f"{original_url}?aff_platform=default&aff_trace_key={self.affiliate_tags['ali']}"
        return original_url

    def calculate_resale_margin(self, category, current_price):
        """
        Calcula o preço de revenda sugerido e o lucro estimado com base
        nos dados de mercado da IF Tech em Bragança Paulista.
        """
        markup_table = {
            "SSD": 1.55,       # 55% de markup para SSDs de giro rápido
            "RAM": 1.50,       # 50% de markup em memória RAM
            "Fonte": 1.45,     # 45% em fontes 80 Plus
            "Cooler": 1.50,    # 50% em coolers / water coolers
            "GPU": 1.25,       # 25% em GPUs (alto ticket)
            "CPU": 1.25,       # 25% em CPUs
            "Placa_Mae": 1.35, # 35% em placas-mãe
            "Gabinete": 1.40,  # 40% em gabinetes
            "Periferico": 1.60 # 60% em cabos, adaptadores e periféricos
        }
        multiplier = markup_table.get(category, 1.35)
        suggested_price = round(current_price * multiplier, 2)
        profit = round(suggested_price - current_price, 2)
        margin_pct = round((profit / suggested_price) * 100)
        return suggested_price, profit, margin_pct

    def format_telegram_message(self, deal):
        aff_url = self.generate_affiliate_link(deal["product_url"], deal["store_name"])
        discount_str = f"🔥 *{deal.get('discount_percentage', 20)}% OFF*" if deal.get('discount_percentage') else "⚡ *OFERTA SNIPER*"
        
        msg = (
            f"🎯 *[ RADAR SNIPER // IF TECH ]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📦 *{deal['title']}*\n\n"
            f"🏪 *Loja:* {deal['store_name']}\n"
            f"💰 *Preço Promo:* `R$ {deal['current_price']:.2f}` ({deal.get('payment_method', 'À vista/Pix')})\n"
        )
        if deal.get('normal_price') and deal['normal_price'] > deal['current_price']:
            msg += f"🏷️ *De:* ~R$ {deal['normal_price']:.2f}~\n"
        
        msg += (
            f"📊 *{discount_str}*\n\n"
            f"💡 *Oportunidade Bancada IF Tech:*\n"
            f"💵 *Revenda Balcão:* `R$ {deal.get('suggested_resale_price', deal['current_price']*1.4):.2f}`\n"
            f"📈 *Lucro Estimado:* `+ R$ {deal.get('estimated_profit', deal['current_price']*0.4):.2f}`\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🛒 [CLIQUE AQUI PARA COMPRAR]({aff_url})\n\n"
            f"📍 *IF Tech // Bragança Paulista - SP*\n"
            f"🛡️ *Garantia & Procedência Técnica*"
        )
        return msg

    def send_telegram_broadcast(self, deal):
        if not self.telegram_token or not self.telegram_chat_id:
            print("⚠️ Token ou Chat ID do Telegram não configurados. Modo de simulação:")
            print(self.format_telegram_message(deal))
            return {"status": "simulated", "message": "Broadcast simulado com sucesso"}

        url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
        payload = {
            "chat_id": self.telegram_chat_id,
            "text": self.format_telegram_message(deal),
            "parse_mode": "Markdown",
            "disable_web_page_preview": False
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    sample_deal = {
        "title": "SSD Kingston NV2 1TB M.2 NVMe 2280 (3500MB/s Leitura)",
        "category": "SSD",
        "store_name": "Kabum",
        "current_price": 249.90,
        "normal_price": 389.90,
        "discount_percentage": 36,
        "payment_method": "Pix / À Vista",
        "suggested_resale_price": 390.00,
        "estimated_profit": 140.10,
        "product_url": "https://www.kabum.com.br/produto/384931/ssd-kingston-nv2-1-tb"
    }
    sniper = HardwareSniperEngine()
    print("Testando formatação de alerta Sniper:")
    print(sniper.format_telegram_message(sample_deal))
