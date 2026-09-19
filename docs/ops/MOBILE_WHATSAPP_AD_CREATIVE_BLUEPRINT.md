# BLUEPRINT TÉCNICO DE DESIGN MOBILE-FIRST & PERFORMANCE: META ADS PARA WHATSAPP

**Documento Operacional:** `MOBILE_WHATSAPP_AD_CREATIVE_BLUEPRINT.md`  
**Empresa:** IF Tech (Engenharia de Hardware & TI)  
**Autor:** Diretor Criativo Principal & Arquiteto de Performance Visual  
**Data:** 18 de Setembro de 2026  
**Status:** Validado e Renderizado em Produção  
**Diretórios de Destino:**
- Repositório: `c:\tech-solutions-ifl\marketing\campanhas-inauguracao\04_ANUNCIO_EXCLUSIVO_WHATSAPP_MOBILE/`
- Área de Trabalho: `C:\Users\Iago\OneDrive\Desktop\CAMPANHAS_INSTAGRAM_IFTECH\04_ANUNCIO_EXCLUSIVO_WHATSAPP_MOBILE/`

---

## 1. INTRODUÇÃO & DIAGNÓSTICO DE PERFORMANCE MOBILE

### 1.1 O Desafio da Atenção em Dispositivos Móveis
Em campanhas de tráfego pago na Meta direcionadas ao WhatsApp (*Click-to-WhatsApp Ads - CTWA*), mais de **96% das impressões e cliques ocorrem em smartphones**. O comportamento do usuário nesse ecossistema é pautado por:
1. **Velocidade de rolagem acelerada:** Janela de atenção de apenas 1,5 a 3 segundos para reter o olhar (*Thumb-stopping power*);
2. **Navegação monomanual:** O polegar opera na metade inferior da tela, exigindo botões de ação amplos e identificação cognitiva imediata;
3. **Fricção de conversão:** Anúncios institucionais genéricos sofrem alta taxa de abandono. Criativos que abordam uma **dor aguda local** ("Computador Lento / Esquecendo") associada à **conveniência logística** ("Leva-e-Traz na porta do seu condomínio/casa") e um **CTA de clique único para o WhatsApp** geram taxas de conversão de 3x a 5x superiores.

---

## 2. ARQUITETURA DE FORMATOS & SCREEN REAL ESTATE

### 2.1 Comparativo de Formatos Meta Ads

| Formato | Resolução | Aspect Ratio | Área Visual no Smartphone | Posicionamento Primário | Recomendação IF Tech |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Full Vertical** | **1080 x 1920 px** | **9:16** | **100% da tela** | Instagram Stories, Reels, Facebook Stories, WhatsApp Status | **Mandatório para Stories/Reels** |
| **Vertical Feed** | **1080 x 1350 px** | **4:5** | **+78% de área vs 1:1** | Feed do Instagram e Facebook | **Mandatório para Feed** |
| **Quadrado** | **1080 x 1080 px** | **1:1** | ~56% da tela | Feed clássico / Carrossel desktop | Formato legado / Fallback |

```
               ESQUEMA COMPARATIVO DE OCUPAÇÃO DE TELA (MOBILE)

   [ Quadrado 1:1 ]             [ Vertical Feed 4:5 ]          [ Full Screen 9:16 ]
    1080 x 1080 px                1080 x 1350 px                 1080 x 1920 px
   +--------------+              +--------------+               +--------------+
   | (Espaço do   |              |              |  ^            | Top SafeZone | 260px (Header Nativo)
   |  app Meta)   |              |              |  |            +--------------+
   +--------------+              |              |  | +78% Mais  |              |
   |              |              | CONTEÚDO     |  | Ocupação   | CONTEÚDO     |
   | CONTEÚDO     |              | VISUAL       |  | Visual     | IMERSIVO     | 1400px Área Útil
   | PEQUENO      |              | DE DESTAQUE  |  |            | LIVRE DE     |
   |              |              |              |  |            | CORTES       |
   +--------------+              |              |  v            |              |
   | (Espaço do   |              +--------------+               +--------------+
   |  app Meta)   |                                             | Btm SafeZone | 260px (CTA Nativo)
   +--------------+                                             +--------------+
```

### 2.2 Zonas de Segurança Milimétricas (Safe Zones)
Para evitar que elementos nativos dos aplicativos móveis (nome de usuário, botões de curtir, balão de resposta rápida do Instagram e barra de navegação) sobreponham textos cruciais:
* **Margem Superior (Stories/Reels 9:16):** 260 px livres de qualquer texto ou botão vital (reservada para avatar, @perfil e barra de tempo);
* **Margem Inferior (Stories/Reels 9:16):** 260 px livres de elementos vitais (reservada para o campo nativo "Enviar mensagem" / "Send message");
* **Margens Laterais:** 64 px em ambas as laterais para evitar cortes em telas curvas ou modelos dobráveis;
* **Área Útil Central (Live Canvas):** `1080 x 1400 px` rigorosamente utilizada no criativo `anuncio_whatsapp_9x16_stories_reels.png`.

---

## 3. IDENTIDADE VISUAL BRUTALISTA NEON DA IF TECH

### 3.1 Paleta Cromática & Validação WCAG AAA

| Elemento | Nome / Função | Hex Code | RGB | Relação de Contraste vs #0A0A0C | Status WCAG |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Fundo Principal** | Deep Onyx Void | `#0A0A0C` | `(10, 10, 12)` | 1:1 | Base sólida |
| **Fundo de Cartões** | Technical Slate Card | `#121216` | `(18, 18, 22)` | 1.15:1 | Delimitação sutil |
| **Bordas Estruturais** | Dark Graphite Border | `#27272E` | `(39, 39, 46)` | 2.1:1 | Estrutura brutalista |
| **Acento Primário** | High-Luminescence Lime | `#CCFF00` | `(204, 255, 0)` | **16.8:1** | **WCAG AAA Aprovado** |
| **Acento de Ação** | WhatsApp Brand Green | `#25D366` | `(37, 211, 102)` | **8.9:1** | **WCAG AAA Aprovado** |
| **Tipografia Primária**| Pure White | `#FFFFFF` | `(255, 255, 255)`| **20.5:1** | **WCAG AAA Aprovado** |
| **Tipografia Secundária**| Cool Muted Zinc | `#D4D4D8` / `#A1A1AA` | `(161, 161, 170)`| **7.4:1** | **WCAG AAA Aprovado** |

### 3.2 Tipografia de Escaneabilidade em 3 Segundos
1. **Headline (Gancho de Atenção):** Fonte `Inter` (peso 900 Black), corpo `72px - 74px` com entre-linhas compacto (`line-height: 1.05`). Uso da palavra de impacto "DEIXE NOVO DE NOVO" em Neon Lime `#CCFF00`.
2. **Subhead (Proposta de Valor):** Fonte `Inter` (peso 500-700), corpo `22px - 25px` com borda lateral esquerda de `4px #CCFF00`.
3. **Cartão Bento / Checklist:** Fonte `Inter` (peso 600) mesclada a `JetBrains Mono` nos marcadores. Ícones de `✓` em caixas de `32x32px` com borda neon.
4. **Bloco de Preço Ancorado:** Contraste brutalista entre preço riscado ("De R$ 415,00") e preço de inauguração ("R$ 230") em tamanho monumental (`76px - 82px`).
5. **Botão CTA WhatsApp:** Gradiente tridimensional `#25D366` para `#1EBE5D` com ícone SVG oficial do WhatsApp, texto em corpo `32px - 34px` Ultra-bold e subtexto de suporte "Atendimento Direto com Especialista • Resposta Rápida".

---

## 4. MOTOR DE RENDERIZAÇÃO & SCRIPTS DESENVOLVIDOS

Para garantir autonomia completa e altíssima resolução gráfica, foram criados dois motores de geração:

### 4.1 Motor 1: HTML5 + CSS3 + Playwright Chromium (`scripts/render_whatsapp_mobile_ads.py`)
- **Template-Fonte:** `assets/anuncio_whatsapp_templates.html`
- **Capacidades:** Renderiza fontes Google Fonts (`Inter` e `JetBrains Mono`) com antialiasing subpixel, ícones vetoriais SVG reais, malha de engenharia milimétrica, gradientes de luz neon difusa e box-shadows com glow.
- **Validação:** Carregamento controlado com `networkidle` e captura exata dos nós DOM `#anuncio-9-16`, `#anuncio-4-5` e `#anuncio-1-1`.

### 4.2 Motor 2: Python Pillow Nativo / Offline (`scripts/generate_ad_whatsapp_pillow.py`)
- **Capacidades:** Geração 100% offline via biblioteca PIL/Pillow utilizando primitivas gráficas (`ImageDraw`, `rounded_rectangle`, fontes Segoe UI / Consolas do Windows).
- **Finalidade:** Servir como fallback autônomo e produzir variantes de alto contraste para testes A/B no Meta Ads.

---

## 5. REGISTRO DE ARQUIVOS GERADOS & AUDITORIA

| Arquivo | Resolução | Formato | Tamanho (Bytes) | Localização no Repositório | Localização na Área de Trabalho |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `anuncio_whatsapp_9x16_stories_reels.png` | 1080 x 1920 | 9:16 | 433.690 | `marketing/.../04_ANUNCIO.../` | `CAMPANHAS_INSTAGRAM_IFTECH/.../` |
| `anuncio_whatsapp_4x5_feed.png` | 1080 x 1350 | 4:5 | 339.459 | `marketing/.../04_ANUNCIO.../` | `CAMPANHAS_INSTAGRAM_IFTECH/.../` |
| `anuncio_whatsapp_1x1_quadrado.png` | 1080 x 1080 | 1:1 | 282.277 | `marketing/.../04_ANUNCIO.../` | `CAMPANHAS_INSTAGRAM_IFTECH/.../` |
| `anuncio_whatsapp_9x16_stories_reels_pillow_variant.png` | 1080 x 1920 | 9:16 | 121.680 | `marketing/.../04_ANUNCIO.../` | `CAMPANHAS_INSTAGRAM_IFTECH/.../` |
| `anuncio_whatsapp_4x5_feed_pillow_variant.png` | 1080 x 1350 | 4:5 | 106.369 | `marketing/.../04_ANUNCIO.../` | `CAMPANHAS_INSTAGRAM_IFTECH/.../` |
| `ANUNCIO_E_COPY.md` | N/A | Texto | 7.316 | `marketing/.../04_ANUNCIO.../` | `CAMPANHAS_INSTAGRAM_IFTECH/.../` |

---

## 6. ESTRATÉGIA DE CONVERSÃO & CADÊNCIA NO WHATSAPP

### 6.1 A Regra dos 5 Minutos (Lead Response Time)
Estudos de conversão B2C apontam que leads que entram em contato via WhatsApp e são respondidos nos primeiros **5 minutos** têm **9x mais chances de fechar negócio** do que após 30 minutos.
* **Pré-preenchimento do Link:** O usuário chega ao WhatsApp com a mensagem pronta: *"Olá, Iago! Vi o anúncio no celular da condição de 35% OFF da IF Tech..."*
* **Triagem Ágil:** Perguntar imediatamente o tipo de máquina (Desktop ou Notebook), sintoma principal e bairro/condomínio em Bragança Paulista.
* **Segurança na Coleta:** Destacar a emissão do **Termo Digital de Entrada com Fotos** e o **Laudo Técnico em PDF** para quebrar a desconfiança de entregar o computador a um terceiro.

---

## 7. CONCLUSÃO & CHECKLIST DE IMPLEMENTAÇÃO

1. [x] Identidade visual brutalista IF Tech incorporada com paleta oficial `#CCFF00`, `#0A0A0C`, `#FFFFFF`, `#121216`;
2. [x] Proporções 9:16 (1080x1920px) e 4:5 (1080x1350px) renderizadas com Safe Zones rigorosas;
3. [x] Ícone oficial do WhatsApp (`#25D366`), selo de 35% OFF e ancoragem local "Bragança Paulista & Região" incluídos;
4. [x] Script Playwright e script Pillow testados e executados com sucesso;
5. [x] Arquivos exportados simultaneamente para a pasta de marketing do projeto e para o Desktop do usuário;
6. [x] Documentação de copy, gatilhos de fechamento e blueprint operacional registrados.
