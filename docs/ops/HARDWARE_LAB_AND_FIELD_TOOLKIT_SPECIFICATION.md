# Especificação Técnica de Infraestrutura de Laboratório & Kit de Campo B2B/MSP
**IF Tech — Engenharia de Hardware, Laboratório Físico & Operações de Campo**  
**Versão:** 1.0 (Oficial — Diretriz de Compras & Padrão de Engenharia)  
**Autor:** Engenheiro Especialista em Laboratório de Hardware & Operações de TI  
**Classificação:** Operacional / Estratégico / Investimento de Capital (CapEx & OpEx)

---

## 📑 Sumário Executivo

Este documento estabelece o **padrão de engenharia e a lista mestra de aquisições** para a infraestrutura física de bancada (Laboratório In-house B2C/B2B) e o ferramental de atendimento presencial em campo (B2B Corporativo & MSP).

A estratégia de investimento é dividida em **duas fases financeiras**:
1. **Fase 1 — Setup Essencial Imediato (R$ 1.800 a R$ 2.800):** Conjunto cirúrgico de equipamentos que habilita 100% dos serviços de diagnóstico, manutenção preventiva profunda, upgrades, clonagem bit-a-bit e socorro presencial em redes/servidores com proteção ESD total e retorno do investimento (Payback) em menos de 15 a 21 dias de operação.
2. **Fase 2 — Expansão & Eletrônica Avançada (Financiamento via Fluxo de Caixa):** Aquisição de estações de microeletrônica, microscopia trinocular, câmera térmica e fonte assimétrica para reparo de placas em nível de componente (reparo de curto em linhas primárias/secundárias, regravação de BIOS avançada e solda BGA/QFN).

---

## 🏢 1. Laboratório Físico & Bancada de Engenharia (In-House)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            BANCADA DE ENGENHARIA IF TECH (IN-HOUSE)                              │
├─────────────────────────┬─────────────────────────┬────────────────────┬─────────────────────────┤
│    SEGURANÇA ESD        │ FERRAMENTAS PRECISÃO    │  DIAGNÓSTICO ELETR.│   INSUMOS & QUÍMICOS    │
│ • Manta Dissipativa     │ • Kit S2 Magnético      │ • Multímetro True- │ • Arctic MX-4 / Hydron. │
│ • Pulseira + Aterramento│ • Espátulas Inox/Nylon  │   RMS c/ Bip Fast  │ • Isopropílico 99.8%    │
│ • Pincéis Condutivos    │ • Pinças ESD Ultra-fine │ • Tester ATX LCD   │ • Thermal Pads Variados │
│ • Luvas Carbono/PU      │ • Ventosas / Abertura   │ • CH341A Pro BIOS  │ • Limpa Contato Rápido  │
└─────────────────────────┴─────────────────────────┴────────────────────┴─────────────────────────┘
```

---

### 1.1. Proteção Eletrostática (ESD) & Segurança de Bancada

A descarga eletrostática (ESD) silenciosa é a causa número 1 de falhas intermitentes em circuitos integrados sensíveis (chipsets, VRMs, controladores de memória). Todos os procedimentos na IF Tech seguem a norma **ANSI/ESD S20.20**.

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Manta Antiestática Dissipativa** | Borracha dupla camada (camada superior dissipativa $10^6 - 10^9 \ \Omega$, inferior condutiva $10^3 - 10^5 \ \Omega$), resistente a calor de ferro de solda, dimensões mínimas $1000 \times 600 \times 2\text{mm}$, com 2 botões de pressão (ilhós) instalados. | Hikari / Solver / Proesi (Azul/Cinza) | `Manta Antiestatica Borracha Dupla Camada 100x60cm` | R$ 110,00 – R$ 160,00 | Mercado Livre / Proesi |
| **Cabo de Aterramento de Manta** | Cabo de aterramento com plug tipo banana/garra jacaré e resistor de segurança de $1\text{ M}\Omega$ acoplado. | Solver / Hikari | `Cabo Aterramento Manta Antiestatica Garra Jacare` | R$ 25,00 – R$ 38,00 | Mercado Livre / Proesi |
| **Pulseira Antiestática ESD** | Cabo espiralado expansível até 1,8m, fita elástica ajustável, plug banana + garra jacaré com resistor embutido de $1\text{ M}\Omega$ para segurança do operador. | Hikari HK-102 / Solver SL-100 | `Pulseira Antiestatica Profissional Hikari 1M Ohm` | R$ 18,00 – R$ 28,00 | Mercado Livre / Shopee |
| **Calcanheira de Aterramento ESD** | Fita condutiva para sapato/tênis com contato na meia/pele para dissipação contínua enquanto em pé. | Antistatic Heel Strap ESD | `Calcanheira Antiestatica ESD Aterramento` | R$ 22,00 – R$ 35,00 | Mercado Livre / Shopee |
| **Kit de Pincéis & Trinchas ESD** | 6 a 8 peças, cerdas de polipropileno condutivo dissipativo (não geram estática ao esfregar PCBs). | QianLi / Yaxun / Baku ESD | `Kit Pinceis Antiestaticos ESD Escova Limpeza PCB` | R$ 28,00 – R$ 45,00 | Mercado Livre / Shopee |
| **Luvas Antiestáticas ESD** | Tecido de poliéster com filamentos de fibra de carbono condutiva e banho de Poliuretano (PU) na palma e ponta dos dedos (tamanho M/G). Pacote com 3 a 5 pares. | Delta Plus / Volk / Yaxun | `Luva Antiestatica ESD Carbono Banho PU` | R$ 35,00 – R$ 55,00 | Mercado Livre / Shopee |

> [!IMPORTANT]
> **Ponto de Aterramento Comum (Common Point Ground):**  
> A manta e a pulseira antiestática **NUNCA** devem ser conectadas diretamente ao neutro da tomada. Devem ser ligadas ao pino de proteção (Terra - NBR 14136) através de um conector tipo bloco/plug com resistor limitador de corrente de $1\text{ M}\Omega$, protegendo tanto os componentes contra surtos quanto o operador contra choques acidentais.

---

### 1.2. Ferramental de Precisão & Desmontagem Não Destrutiva

O padrão IF Tech exige desmontagem com **zero marcas, dentes ou empenamento** em carcaças plásticas de notebooks e gabinetes premium de vidro temperado e alumínio anodizado.

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Kit de Chaves de Precisão Master** | Estojo magnético com 60 a 128 ponteiras em **Aço S2 Temperado (HRC 58-62)** (evita espanar parafusos Torx/Phillips/Pentalobe/Tri-Wing), cabo de alumínio usinado com rolamento de giro suave e extensor flexível. | Jakemy JM-8176 / Nanch 22in1 / Xiaomi Wiha / iFixit clone | `Kit Chaves Precisao Aco S2 Jakemy 8176 Magnetico` | R$ 95,00 – R$ 160,00 | Mercado Livre / AliExpress |
| **Espátulas Metálicas Ultrafinas de Abertura** | Lâminas de aço inoxidável flexível com espessura de 0.1mm a 0.3mm e bordas polidas a laser para abertura de travas plásticas de ultrabooks. | iSesamo Original / QianLi Curved Blade / Mechanic | `Espatula Abertura Inox iSesamo Original QianLi` | R$ 35,00 – R$ 55,00 | Mercado Livre / Shopee |
| **Kit de Palhetas & Alavancas Plásticas (POM/Nylon)** | Conjunto de 10 a 20 palhetas triangulares em plástico POM de alta densidade (não risca nem deforma a carcaça). | iFixit Opening Picks / Baku | `Kit Palhetas Plasticas Abertura Celular Notebook` | R$ 15,00 – R$ 25,00 | Mercado Livre / Shopee |
| **Kit de Pinças de Precisão ESD** | Aço inoxidável não magnético revestido com tinta condutiva ESD. Inclui ponta reta ultrafina (TS-11), curva (TS-15) e ponta chata. | Vetus ESD Original (TS-11 / TS-15 / ESD-13) | `Kit Pincas Precisao Vetus ESD Original Aco Inox` | R$ 45,00 – R$ 75,00 | Mercado Livre / Shopee |
| **Ventosa de Alta Sucção com Trava** | Ventosa de borracha de 55mm com alavanca de sucção a vácuo para remoção segura de tampas traseiras de notebooks de vidro/metal e telas de AIO. | Jakemy JM-Z13 / Yaxun | `Ventosa Alta Succao Abertura Telas Vidro Jakemy` | R$ 18,00 – R$ 30,00 | Mercado Livre |

---

### 1.3. Equipamentos de Diagnóstico & Eletrônica

Instrumentação de bancada com alta velocidade de amostragem para identificar curtos-circuitos, oscilação de linhas de tensão e corrupção de firmware em minutos.

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Multímetro Digital True-RMS de Alta Velocidade** | 6000 a 9999 contagens, True-RMS, **bip de continuidade instantâneo (latência < 10ms)**, medição de capacitância até 100mF, frequência, duty cycle e teste de diodo com tensão de teste $\ge 3\text{V}$ (para acender LEDs). | Aneng AN8008 / AN8009 / Aneng Q1 / Uni-T UT89X | `Multimetro Digital True RMS Aneng Q1 AN8008` | R$ 130,00 – R$ 210,00 | Mercado Livre / Shopee |
| **Pontas de Prova Agulha Ultrafina Banhadas a Ouro** | Pontas de agulha com diâmetro de 1.0mm a 0.5mm banhadas a ouro, isolação Cat III 1000V / 20A, cabo flexível de silicone (essencial para medir terminais minúsculos de CI e resistores 0402). | Cleqee P1503D / Aneng Agulha Silicone | `Pontas de Prova Agulha Banhada a Ouro Silicone Multimetro` | R$ 38,00 – R$ 58,00 | Mercado Livre / Shopee |
| **Testador Digital de Fonte ATX com LCD** | Conector 24 pinos, 4/8 pinos CPU, 6/8 pinos PCIe, SATA, Molex. Display LCD retroiluminado com leitura digital das linhas $+12\text{V}_1$, $+12\text{V}_2$, $+5\text{V}$, $+3.3\text{V}$, $+5\text{VSB}$, $-12\text{V}$ e indicador de tempo de sinal **Power Good (PG)** em milissegundos. | Digital Power Supply Tester IV LCD | `Testador Fonte ATX Digital Display LCD Power Good` | R$ 65,00 – R$ 95,00 | Mercado Livre |
| **Gravador de BIOS SPI Flash CH341A Pro v1.7** | Compatível com chips série 24/25 SPI Flash, **comutador de tensão 3.3V / 5.0V por chave física (sem risco de queimar chips de 3.3V)** + Adaptador de tensão de 1.8V para memórias de notebooks modernos + Pinça Jacaré SOP8 (SOIC8 clip) com cabo blindado para leitura e gravação in-circuit sem necessidade de dessoldar. | CH341A Pro Black Edition v1.7 + Clip SOP8 + Adaptador 1.8V | `Gravador Bios CH341A Pro V1.7 Clip SOP8 Adaptador 1.8V` | R$ 55,00 – R$ 85,00 | Mercado Livre / Shopee |
| **Testador de Portas & Cabos USB (USB Power Meter)** | Medidor digital USB-A / USB-C com display IPS colorido, medição de tensão ($4-30\text{V}$), corrente ($0-5\text{A}$), detecção automática de protocolos PD/QC e verificação de integridade de linhas de dados ($D+/D-$) para teste imediato de curtos em portas USB sem risco à placa-mãe. | FNB48 / KWS-MX18L / TC66 | `Testador USB Digital Amperimetro Voltimetro KWS FNB48` | R$ 45,00 – R$ 90,00 | Mercado Livre / Shopee |
| **Placa de Diagnóstico PCIe / LPC Debug Card** | Display de 2 a 4 dígitos LED para códigos POST (Power-On Self-Test), compatível com slot PCIe Desktop e interface LPC / mini-PCIe para diagnóstico de placa-mãe travada. | Placa Diagnostico POST Code PCI / PCIe | `Placa Diagnostico Pos Motherboard PCI PCIe LPC` | R$ 35,00 – R$ 65,00 | Mercado Livre |
| **Soprador de Ar Comprimido Elétrico Recarregável** | Motor elétrico brushless de alta rotação ($50.000$ a $100.000\text{ RPM}$), bateria de lítio de $6000\text{mAh}$, bicos direcionais finos. Substitui latas de ar comprimido descartáveis (zero condensação líquida e economia recorrente). | MECO / X-Power / Electric Air Duster Brushless | `Soprador Ar Comprimido Eletrico Recarregavel Limpeza PC` | R$ 130,00 – R$ 195,00 | Mercado Livre / Shopee |

---

### 1.4. Insumos Químicos, Térmicos & Solda Rápida

Materiais consumíveis de primeira linha que garantem temperatura de operação até $15^\circ\text{C}$ menor em CPUs/GPUs e confiabilidade de 3 a 5 anos sem ressecamento precoce.

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pasta Térmica de Alto Desempenho (Giro Rápido)** | Condutividade térmica de $8.5\text{ W/m}\cdot\text{K}$, viscosidade ideal sem tempo de cura (zero capacitância/não condutiva). Seringa de 4g para bancada e 20g econômica para montagens em lote. | Arctic MX-4 (4g e 20g) Original c/ QR Code | `Pasta Termica Arctic MX-4 Original 4g 20g` | R$ 55,00 (4g) / R$ 135,00 (20g) | Mercado Livre (Lojas Oficiais) |
| **Pasta Térmica Premium Entusiasta / GPUs Quentes** | Condutividade térmica de $11.8\text{ W/m}\cdot\text{K}$ a $12.5\text{ W/m}\cdot\text{K}$, formulação estável sem cura, ideal para placas de vídeo RTX/Radeon e notebooks gamers ultrafinos. | Thermal Grizzly Hydronaut (1.5g / 3.9g) | `Pasta Termica Thermal Grizzly Hydronaut Original` | R$ 75,00 – R$ 120,00 | Mercado Livre / KaBuM |
| **Kit de Thermal Pads de Alta Condutividade** | Placas de silicone condutivo térmico $12.8\text{ W/m}\cdot\text{K}$, dimensões $100 \times 100\text{mm}$, kit sortido com espessuras de **0.5mm, 1.0mm e 1.5mm**. | Thermalright Odyssey / Gelid GP-Extreme | `Thermal Pad 12.8 WmK 0.5mm 1.0mm 1.5mm Thermalright` | R$ 65,00 – R$ 110,00 | Mercado Livre / Shopee |
| **Álcool Isopropílico 99.8% Puro (1 Litro)** | Grau eletrônico com pureza $\ge 99.8\%$ e teor de água $< 0.2\%$ (evita oxidação residual após secagem). | Implastec / Proesi 1 Litro | `Alcool Isopropilico 99.8 1L Implastec Puro` | R$ 28,00 – R$ 42,00 | Mercado Livre / Proesi |
| **Frasco Dosador Tipo Pump Antiestático (200ml)** | Frasco ESD em polietileno com bomba mecânica em aço inox e sistema de válvula anti-refluxo. | Mechanic / Baku Pump Bottle ESD | `Frasco Dosador Alcool Isopropilico Pump ESD Mechanic` | R$ 22,00 – R$ 35,00 | Mercado Livre / Shopee |
| **Limpa Contato Elétrico Não Condutivo (Secagem Rápida)** | Solvente de alta pureza dielétrica, evaporação em 3 segundos, sem resíduos oleosos. Lata 300ml / 200g. | Wurth / Orbi Química Contactec / WD-40 Specialist | `Limpa Contato Eletrico Nao Condutivo Wurth Contactec` | R$ 24,00 – R$ 38,00 | Mercado Livre / Distribuidora |
| **Fluxo de Solda No-Clean em Seringa (10cc)** | Fluxo de solda halogen-free sem resíduos corrosivos, excelente para ressolda de portas USB, conectores DC Jack e jumpers. | Amtech NC-559-ASM-UV / Mechanic Kingbo | `Fluxo de Solda Amtech NC-559-ASM Seringa Original` | R$ 35,00 – R$ 55,00 | Mercado Livre / Shopee |
| **Fita Kapton Resistente a Alta Temperatura (Poliimida)** | Fita adesiva resistente a temperaturas contínuas até $280^\circ\text{C}$ e isolação dielétrica. Rolos de **10mm e 20mm** de largura. | Fita Poliimida Kapton Original 33m | `Fita Kapton Alta Temperatura 10mm 20mm Original` | R$ 20,00 – R$ 32,00 | Mercado Livre / Shopee |
| **Solda em Fio 63/37 (Estanho/Chumbo) 0.5mm e 0.8mm** | Liga eutética 63% Sn / 37% Pb com ponto de fusão preciso a $183^\circ\text{C}$ e fluxo interno de resina ativada. Carretel de 100g ou 250g. | Cobix / Best / Cast | `Solda Estanho Cobix 63 37 0.5mm 0.8mm Tubo Carretel` | R$ 38,00 – R$ 75,00 | Mercado Livre / Proesi |
| **Malha Dessoldadora de Cobre Trançado** | Cobre puro trançado de alta condutividade térmica com fluxo no-clean impregnado para absorção instantânea de solda residual. Largura **2.0mm / 2.5mm**. | Goot Wick Original (Japão) / Chemtronics | `Malha Dessoldadora Goot Wick CP-2015 CP-2515 Original` | R$ 22,00 – R$ 35,00 | Mercado Livre / Shopee |

---

### 1.5. Estação de Testes, Clonagem Offline & Utilitários de Bancada

Autonomia para clonagem direta de discos sem necessidade de amarrar a máquina principal do laboratório, reduzindo o tempo de entrega de upgrades para menos de 40 minutos.

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dock Station / Case Duplo M.2 NVMe + SATA com Clone Offline** | USB 3.2 Gen2 (10Gbps), suporte a NVMe M.2 (M-Key / B+M Key) + SSD SATA 2.5"/3.5", **função de clonagem autônoma bit-a-bit via botão físico (Stand-Alone Offline Clone)** com LEDs indicadores de progresso (25%, 50%, 75%, 100%). | Maiwo / Acasis / Orico Dual NVMe SATA Offline Clone | `Dock Station NVMe M2 SATA Clonagem Offline USB 3.2` | R$ 210,00 – R$ 320,00 | Mercado Livre / AliExpress |
| **Kit de Adaptadores de Vídeo de Bancada** | Conjunto contendo: (1) HDMI para VGA com saída de áudio P2, (1) DisplayPort para HDMI 4K, (1) DVI-D Dual Link para HDMI, (1) Mini-DP para HDMI. | Ugreen / Baseus / Vention | `Adaptador HDMI para VGA Displayport DVI Ugreen` | R$ 65,00 – R$ 95,00 | Mercado Livre / Shopee |
| **Par de Pendrives Rápidos de Metal (64GB e 128GB)** | Corpo em metal inteiriço (dissipa calor em operações prolongadas), interface USB 3.2 Gen 1 (leitura $\ge 150\text{ MB/s}$), formatados com **Ventoy Multiboot** particionado em GPT (UEFI) e MBR (Legacy). | SanDisk Ultra Flair / Ultra Dual Drive Type-C Metal | `Pendrive Sandisk Ultra Flair 64GB 128GB Metal USB 3.0` | R$ 90,00 – R$ 130,00 (Par) | Mercado Livre (Lojas Oficiais) |
| **Combo Teclado & Mouse Sem Fio Compacto de Bancada** | Receptor USB Nano 2.4GHz único, formato compacto sem teclado numérico ou teclado com touchpad integrado para economizar espaço de bancada. | Logitech K400 Plus / Logitech MK240 Nano | `Teclado Mouse Sem Fio Compacto Logitech K400 MK240` | R$ 110,00 – R$ 170,00 | Mercado Livre / Amazon |

---

### 1.6. Identificação, Organização & Acolhimento de Peças

Padronização visual e rastreabilidade total: cada parafuso, tampa e componente do cliente é protegido contra perdas e identificado na entrada.

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Impressora Térmica Portátil de Etiquetas** | Conexão Bluetooth + USB, impressão térmica direta (sem tinta nem ribbon), resolução 203 DPI, largura de impressão até 50mm, suporte a rolos de etiquetas adesivas plásticas impermeáveis para carcaças, cabos e lacres de garantia. | Niimbot D110 / Niimbot B21 / Phomemo M110 | `Impressora Termica Etiquetas Portatil Bluetooth Niimbot D110` | R$ 120,00 – R$ 210,00 | Mercado Livre / Shopee |
| **Manta Magnética Organizadora de Parafusos** | Superfície quadriculada com grade milimetrada e propriedades magnéticas para reter parafusos na ordem exata de desmontagem de notebooks e placas-mãe. | QianLi Screw Pad / iFixit Magnetic Project Mat | `Manta Magnetica Organizador Parafusos Qianli iFixit` | R$ 28,00 – R$ 48,00 | Mercado Livre / Shopee |
| **Kit de Caixas Organizadoras Transparentes com Trava** | Plástico polipropileno virgem transparente, tampa com travas reforçadas, empilháveis, volume de 5 a 10 Litros (uma caixa individual para cada Ordem de Serviço em andamento). Kit com 6 caixas. | Sanremo / Plasútil / Marfinite | `Caixa Organizadora Plastica Transparente com Trava 6L 10L` | R$ 75,00 – R$ 110,00 | Mercado Livre / Lojas Físicas |

---

## 🎒 2. Kit de Mala de Campo / Atendimento B2B & MSP (VIP)

Apresentação executiva impecável e capacidade de resolver 99% dos problemas de rede, infraestrutura, servidores e estações de trabalho diretamente no cliente sem necessidade de deslocamento ao laboratório.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         KIT DE CAMPO B2B & MSP / ATENDIMENTO PRESENCIAL                          │
├─────────────────────────┬─────────────────────────┬────────────────────┬─────────────────────────┤
│    MALA & PROTEÇÃO      │  CABEAMENTO & REDES     │ ADAPTADORES INFRA  │ SUPRIMENTOS RACK & MESA │
│ • Mochila Fundo Rígido  │ • Alicate EZ-RJ45       │ • Cabo FTDI Serial │ • 200x Enforca-gato UV  │
│ • Impermeável / Divisórias│ • Noyafa NF-8209 Pro  │ • USB-C Gigabit RJ4│ • 5m Velcro Dupla-face  │
│ • Alça Reforçada        │ • 100 Conectores Gold   │ • Testador Tomadas │ • Pendrive RMM Agente   │
└─────────────────────────┴─────────────────────────┴────────────────────┴─────────────────────────┘
```

---

### 2.1. Mala & Transporte Técnico de Alta Resistência

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mochila / Maleta Técnica com Fundo Rígido Injetado** | Tecido Oxford/Nylon 1680D impermeável, fundo em polipropileno rígido injetado (pode ser colocada no chão de data centers/fábricas sem molhar nem tombar), compartimento acolchoado para notebook de até 15.6", mais de 20 bolsos e alças ergonômicas acolchoadas. | Stanley FatMax Quick Access / Worker 20L / ToughBuilt | `Mochila Ferramentas Fundo Rigido Stanley Fatmax Worker` | R$ 190,00 – R$ 290,00 | Mercado Livre / Ferramentas Kennedy |

---

### 2.2. Cabeamento Estruturado & Redes Corporativas

Ferramentas que garantem certificação física de cabos, rastreamento de circuitos no rack sem desligar a rede do cliente e conectorização perfeita de primeira tentativa.

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Alicate de Crimpar Profissional EZ-RJ45 de Catraca** | Mecanismo de catraca com lâmina frontal de corte de excesso para conectores passantes (**EZ Crimp / Pass-Through** Cat5e e Cat6). Reduz o erro humano na crimpagem a zero. | Pier Telecom / Greenlee / Pro'sKit EZ-RJ45 | `Alicate Crimpar Catraca Conector Passante EZ RJ45 Cat6` | R$ 85,00 – R$ 135,00 | Mercado Livre / Distribuidoras |
| **Rastreador de Cabos & Testador Multifuncional de Rede** | Gerador de tom analógico/digital + sonda indutiva de rastreamento com zumbidor sonoro e luz (para localizar cabos misturados em eletrocalhas e patch panels), teste de continuidade pino a pino (1-8 + G), teste de comprimento de cabo por TDR, detecção de tensão PoE e função NCV (tensão sem contato). | Noyafa NF-8209 / NF-8209S / Noyafa NF-801 | `Testador Cabos Rede Gerador Tom Zumbidor Noyafa NF-8209` | R$ 170,00 – R$ 260,00 | Mercado Livre / AliExpress |
| **Alicate Decapador Giratório & Alicate de Corte Rente** | Decapador ajustável para cabos UTP/STP Cat5e/Cat6/RG59 + Alicate de corte rente de precisão em aço cromo vanádio para abraçadeiras e condutores. | Plato 170 + Decapador Coaxial/UTP Amarelo | `Alicate Decapador UTP Alicate Corte Rente Plato 170` | R$ 25,00 – R$ 38,00 | Mercado Livre / Shopee |
| **Pote com 100 Conectores RJ45 Passantes + 100 Capas** | Conectores RJ45 Cat6 tipo EZ passante com pinos banhados a ouro 50 microns (3 dentes para cabo flexível/rígido) + 100 capas emborrachadas (boots) pretas anti-dobra. | Furukawa / Pier Telecom / SohoPlus | `Pote 100 Conectores RJ45 Passante Cat6 Capas Protetoras` | R$ 65,00 – R$ 95,00 | Mercado Livre / Shopee |
| **Kit com 10 Patch Cords Cat6 Certificados (1.5m e 3.0m)** | Cabo de manobra Cat6 100% Cobre homologado Anatel, blindagem contra diafonia (crosstalk), conector injetado em fábrica. 6 unidades de 1.5m e 4 unidades de 3.0m (cores azul e preto). | Furukawa SohoPlus / Nexans / D-Link Cat6 | `Patch Cord Cat6 Furukawa 1.5m 3m 100 Cobre Anatel` | R$ 90,00 – R$ 130,00 (Kit) | Mercado Livre / Distribuidora |

---

### 2.3. Conectividade & Adaptadores de Infraestrutura

Permite ao engenheiro conectar-se a qualquer switch gerenciável, roteador de borda, servidor de rack ou terminal industrial sem depender de portas legadas ou placas de rede em falta.

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cabo USB para Console Serial RJ45 (Chip FTDI FT232R)** | Comprimento de 1.8m a 3.0m, conector USB-A / USB-C para RJ45 Serial Console, **chipset original FTDI FT232R + ZT213** (reconhecimento nativo no Windows 10/11 e Linux sem driver e sem travamento com PuTTY/TeraTerm). Compatível com MikroTik RouterBOARD, Cisco Catalyst, Ubiquiti EdgeSwitch, Huawei e Dell EMC. | FTDI USB Serial Console RJ45 Cable | `Cabo Console USB RJ45 Chip FTDI Original Cisco Mikrotik` | R$ 45,00 – R$ 75,00 | Mercado Livre / Shopee |
| **Adaptador USB-C / USB-A para Gigabit Ethernet RJ45** | Interface USB 3.0 / USB-C 3.2, taxa de transferência 10/100/1000 Mbps Gigabit, carcaça de alumínio para dissipação térmica, chipset Realtek RTL8153 ou ASIX AX88179 (Plug and Play). | Ugreen / Baseus Gigabit Ethernet Aluminum | `Adaptador USB C USB 3.0 Gigabit Ethernet RJ45 Ugreen` | R$ 65,00 – R$ 95,00 | Mercado Livre / KaBuM |
| **Testador Digital de Tomadas & Polaridade com Teste DR** | Verificador rápido de ligação elétrica (padrão NBR 14136), LEDs de indicação de falhas: Fase/Neutro invertidos, Terra ausente, Neutro rompido, além de botão com resistor de teste para acionamento de Disjuntor Residual (DR - 30mA). | Minipa MTT-01 / Habotest HT107D / ANENG AC11 | `Testador de Tomada Digital Polaridade Teste DR Minipa Habotest` | R$ 48,00 – R$ 78,00 | Mercado Livre / Shopee |

---

### 2.4. Ferramental Rápido & Organização em Campo

| Item | Especificação Técnica Mínima | Modelo / Marca Recomendada | Termo de Busca Preciso | Faixa de Preço (R$) | Fornecedor Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Kit Chaves de Bolso Tipo Carteira de Couro** | Estojo compacto de 24 ponteiras magnetizadas de bolso para intervenções ultrarrápidas em mesas de clientes sem abrir a maleta principal. | Jakemy / Xiaomi Pocket Edition | `Kit Chaves Precisao Carteira 25 em 1 Portatil` | R$ 22,00 – R$ 38,00 | Mercado Livre / Shopee |
| **Kit Organização de Racks & Mesas (Abraçadeiras + Velcro)** | Pacote com 200 abraçadeiras de nylon pretas com proteção UV ($150\text{mm} \times 3.6\text{mm}$ e $200\text{mm} \times 4.8\text{mm}$) + Rolo de 5 metros de fita velcro dupla face de alta aderência (permite manutenção em chicotes sem cortar cabos). | HellermannTyton / Starfer | `Abraçadeira Nylon Preta UV 150mm 200mm Rolo Fita Velcro` | R$ 35,00 – R$ 55,00 | Mercado Livre / Distribuidora |
| **Pendrive Técnico de Campo B2B (Agentes RMM & Ferramentas)** | SanDisk Ultra Dual Drive Type-C / Type-A 64GB com scripts de onboarding automatizado PowerShell, instaladores offline de agentes RMM (Tactical RMM / NinjaOne), AnyDesk, RustDesk, instaladores silenciosos de navegadores, 7-Zip, LibreOffice, Adobe Reader e base do Snappy Driver Installer Origin. | SanDisk Dual Drive Type-C 64GB | `Pendrive Sandisk Ultra Dual Drive USB Tipo C 64GB` | R$ 55,00 – R$ 80,00 | Mercado Livre (Loja Oficial) |

---

## 📦 3. Estoque Inicial de Giro Rápido (Peças para Faturamento Imediato)

O estoque inicial é composto exclusivamente por itens de **altíssima liquidez (giro médio de 7 a 15 dias)**, que destravam o faturamento imediato tanto no balcão da bancada (upgrades e recuperação de PCs lentos) quanto no campo B2B (máquinas de contabilidade/faturamento que pararam por queima de fonte ou corrupção de disco).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         ESTOQUE INICIAL DE GIRO RÁPIDO (PRONTA-ENTREGA)                          │
├─────────────────────────┬─────────────────────────┬────────────────────┬─────────────────────────┤
│    SSDs NVMe (M.2)      │      SSDs SATA 2.5"     │ MEMÓRIAS RAM DDR4  │  ENERGIA & ACESSÓRIOS   │
│ • 2x 256GB Gen3/Gen4    │ • 2x 240GB / 256GB SATA │ • 2x 8GB 3200 Desktop│ • 1x Fonte 500W 80 Plus │
│ • 2x 512GB Gen3/Gen4    │ • 2x 480GB / 512GB SATA │ • 2x 8GB 3200 Note │ • 4x Cabos Força NBR   │
│ • 1x 1TB Gen4 High-End  │                         │ • 1x 16GB 3200 Note│ • 2x Cartela CR2032 Lit.│
└─────────────────────────┴─────────────────────────┴────────────────────┴─────────────────────────┘
```

### 3.1. Tabela de Composição de Estoque Inicial & Margens de Venda

| Item | Marca / Modelo Recomendado | Qtd. Inicial | Custo Unit. Est. (R$) | Custo Total (R$) | Preço Venda Sugerido (R$) | Margem Bruta Total Gerada (R$) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **SSD NVMe M.2 256GB/250GB** | Kingston NV2 / Crucial P3 / Lexar | 2 un | R$ 135,00 | R$ 270,00 | R$ 230,00 | R$ 190,00 |
| **SSD NVMe M.2 512GB/500GB** | Kingston NV2 / XPG SX6000 / Crucial P3 | 2 un | R$ 195,00 | R$ 390,00 | R$ 340,00 | R$ 290,00 |
| **SSD NVMe M.2 1TB Gen4** | Kingston NV2 / Fury Renegade / Lexar NM790 | 1 un | R$ 360,00 | R$ 360,00 | R$ 560,00 | R$ 200,00 |
| **SSD SATA 2.5" 240GB** | Kingston A400 / Crucial BX500 / SanDisk | 2 un | R$ 110,00 | R$ 220,00 | R$ 190,00 | R$ 160,00 |
| **SSD SATA 2.5" 480GB** | Kingston A400 / Crucial BX500 / WD Green | 2 un | R$ 170,00 | R$ 340,00 | R$ 290,00 | R$ 240,00 |
| **RAM DDR4 8GB 3200MHz Desktop** | Kingston Fury Beast / Corsair Vengeance | 2 un | R$ 115,00 | R$ 230,00 | R$ 195,00 | R$ 160,00 |
| **RAM DDR4 8GB 3200MHz Notebook** | Kingston SO-DIMM / Crucial SO-DIMM | 2 un | R$ 115,00 | R$ 230,00 | R$ 195,00 | R$ 160,00 |
| **RAM DDR4 16GB 3200MHz Notebook** | Kingston SO-DIMM / Crucial SO-DIMM | 1 un | R$ 195,00 | R$ 195,00 | R$ 330,00 | R$ 135,00 |
| **Fonte ATX 500W/550W 80 Plus Bronze** | MSI MAG A550BN / Corsair CV550 / Cooler Master | 1 un | R$ 260,00 | R$ 260,00 | R$ 390,00 | R$ 130,00 |
| **Cabos de Força NBR 14136 (1.5m 10A 100% Cu)** | Força Tripolar Certificado Inmetro | 4 un | R$ 12,00 | R$ 48,00 | R$ 30,00 | R$ 72,00 |
| **Cabos HDMI 2.0 4K (1.8m Blindado)** | Ugreen / ChipSCE / PlusCable | 2 un | R$ 16,00 | R$ 32,00 | R$ 40,00 | R$ 48,00 |
| **Baterias CR2032 3V Lítio (Cartela c/ 5 un)** | Panasonic / Sony Murata Original | 2 cartelas | R$ 14,00 | R$ 28,00 | R$ 10,00/un (R$ 100) | R$ 72,00 |
| **TOTAL DO ESTOQUE INICIAL** | — | **23 itens** | — | **R$ 2.703,00** | **R$ 4.560,00** | **R$ 1.857,00** |

> [!TIP]
> **Estratégia de Giro Just-In-Time para DDR5 e Placas de Vídeo:**  
> Componentes de alto valor agregado (ex: DDR5 6000MHz, Placas de Vídeo RTX 4060/4070, Processadores Ryzen 7000/9000 e Intel Core i7) **NUNCA** devem ser mantidos estocados na fase inicial. Devem ser faturados via o fluxo padrão do ERP IF Tech: o cliente aprova o orçamento no portal e efetua o pagamento do sinal de 100% das peças via Pix/Cartão Asaas antes da compra na distribuidora (KaBuM, All Nations, SND).

---

## 🎯 4. Matriz de Priorização & Orçamento em 2 Fases

### 4.1. FASE 1: Setup Essencial Imediato (Investimento Enxuto de R$ 1.800 a R$ 2.800)

Esta cesta de compras contém os itens **estritamente obrigatórios para o Dia 1 de operação**. Garante capacidade técnica total de diagnóstico, manutenção preventiva, montagem cirúrgica e atendimento em campo.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                  FASE 1: INVESTIMENTO ESSENCIAL CONSOLIDADO (R$ 2.290,00)                         │
├────────────────────────────────┬───────────────────────────────┬────────────────────────────────┤
│ 1. BANCADA & ESD:      R$ 490  │ 2. DIAGNÓSTICO & DOCK: R$ 760 │ 3. MALA & REDES B2B:   R$ 680  │
│ 4. INSUMOS & QUÍMICOS: R$ 360  │                               │                                │
└────────────────────────────────┴───────────────────────────────┴────────────────────────────────┘
```

#### Lista Detalhada de Compras — Fase 1 (Ordem de Compra para o Dia 1)

| Categoria | Item / Descrição | Fornecedor Prioritário | Valor Médio (R$) | Payback Estimado |
| :--- | :--- | :--- | :---: | :--- |
| **ESD** | Manta Antiestática $100\times60\text{cm}$ + Cabo Aterramento + Pulseira Hikari | Mercado Livre Full | R$ 155,00 | 1 Manutenção Preventiva |
| **ESD** | Pincéis ESD (Kit 6 peças) + 3 Pares de Luvas ESD Carbono PU | Shopee / ML | R$ 65,00 | 1 Limpeza Simples |
| **Ferramental** | Kit Chaves Precisão Aço S2 Magnético (Jakemy JM-8176) | Mercado Livre Full | R$ 125,00 | 1 Montagem de PC |
| **Ferramental** | Espátulas Inox iSesamo + Kit Palhetas POM + Pinças Vetus ESD | Mercado Livre Full | R$ 85,00 | 1 Abertura de Notebook |
| **Diagnóstico** | Multímetro True-RMS Aneng Q1 / AN8008 com Bip Instantâneo + Pontas Agulha Ouro | Mercado Livre Full | R$ 175,00 | 2 Diagnósticos |
| **Diagnóstico** | Testador de Fonte ATX Digital com Display LCD Power Good | Mercado Livre | R$ 75,00 | 1 Troca de Fonte |
| **Diagnóstico** | Gravador de BIOS CH341A Pro v1.7 + Clip SOP8 + Adaptador 1.8V | Mercado Livre | R$ 68,00 | 1 Gravação de BIOS |
| **Diagnóstico** | Testador de Portas USB Digital KWS / FNB48 | Shopee / ML | R$ 52,00 | 1 Diagnóstico |
| **Diagnóstico** | Soprador Térmico Elétrico Recarregável 100.000 RPM | Mercado Livre / Shopee | R$ 145,00 | Economia de 10 latas de ar |
| **Insumos** | Pasta Térmica Arctic MX-4 4g Original c/ QR Code | Mercado Livre (Oficial) | R$ 58,00 | 3 Trocas Térmicas Premium |
| **Insumos** | Álcool Isopropílico 99.8% 1L + Frasco Dosador Pump ESD | Proesi / ML | R$ 55,00 | Insumo para 60 serviços |
| **Insumos** | Limpa Contato Wurth/Contactec + Fita Kapton + Malha Goot Wick | Mercado Livre | R$ 78,00 | Insumo contínuo |
| **Insumos** | Kit Sortido Thermal Pads 12.8 W/mK (0.5mm, 1.0mm, 1.5mm) | Mercado Livre | R$ 75,00 | 5 Revisões de GPU/Notebook |
| **Insumos** | Tubo Solda Cobix 63/37 + Fluxo No-Clean Amtech | Mercado Livre | R$ 65,00 | Reparos elétricos gerais |
| **Bancada** | Dock Station Dual NVMe M.2 + SATA USB 3.2 com Clone Offline | Mercado Livre / Ali | R$ 245,00 | 2 Clones de Disco |
| **Bancada** | Adaptadores de Vídeo Bancada (HDMI/VGA/DP/DVI) | Mercado Livre | R$ 75,00 | Testes de bancada |
| **Bancada** | 2x Pendrives SanDisk Metal 64GB/128GB (Ventoy Multiboot) | Mercado Livre (Oficial) | R$ 110,00 | Instalações e Formatações |
| **Organização** | Impressora Térmica Niimbot D110 + 2 Rolos de Etiquetas Plásticas | Mercado Livre / Shopee | R$ 145,00 | Identificação e Recibos |
| **Organização** | Manta Magnética Parafusos + 4 Caixas Organizadoras C/ Trava | Mercado Livre / Sanremo | R$ 85,00 | Organização de bancada |
| **Mala Campo** | Mochila Técnica Fundo Rígido Impermeável (Worker / Stanley) | Mercado Livre | R$ 210,00 | Atendimento Presencial B2B |
| **Mala Campo** | Alicate Crimpar EZ-RJ45 Catraca + Pote 100 Conectores + Boots | Mercado Livre | R$ 145,00 | Instalação de Redes |
| **Mala Campo** | Rastreador de Cabos Noyafa NF-8209 com Gerador de Tom | Mercado Livre | R$ 185,00 | Rastreamento em Racks |
| **Mala Campo** | Cabo Console USB FTDI Original + Adaptador USB-C Gigabit RJ45 | Mercado Livre | R$ 110,00 | Conexão Switch/Roteador |
| **Mala Campo** | Testador de Tomada com Teste de DR + Kit Abraçadeiras / Velcro | Mercado Livre | R$ 82,00 | Vistorias Elétricas de TI |
| **TOTAL GERAL DA FASE 1** | **Conjunto Completo de Ferramental, Diagnóstico & Mala B2B** | — | **R$ 2.541,00** | **Payback Médio: 12 a 18 dias** |

---

### 4.2. FASE 2: Expansão & Ferramental Avançado de Eletrônica (Meses 2 e 3)

Esta fase adiciona poder de **microeletrônica pesada**, permitindo recuperar placas-mãe de notebooks em curto, placas de vídeo topo de linha que não geram vídeo e reparo de trilhas rompidas, com tickets médios de mão de obra entre **R$ 380,00 e R$ 950,00 por intervenção**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│              FASE 2: EXPANSÃO PARA REPARO AVANÇADO DE PLACAS & MICRO-SOLDA                       │
├─────────────────────────┬─────────────────────────┬────────────────────┬─────────────────────────┤
│ MICROSCOPIA TRINOCULAR  │   ESTAÇÃO SMD / SOLDA   │  FONTE ASSIMÉTRICA │     CÂMERA TÉRMICA      │
│ • Zoom Óptico 7x-45x    │ • Soprador Ar Quente    │ • 30V 5A / 30V 10A │ • Diagnóstico de Curto  │
│ • Câmera HDMI/USB 4K    │   Quick / Sugon / T26D  │ • Injeção de Tensão│   em 5 segundos         │
│ • R$ 1.900 a R$ 2.600   │ • R$ 480 a R$ 1.600     │ • R$ 380 a R$ 580  │ • R$ 1.400 a R$ 2.200   │
└─────────────────────────┴─────────────────────────┴────────────────────┴─────────────────────────┘
```

#### Lista de Aquisições — Fase 2 (Planejamento de Reinvestimento)

| Equipamento | Especificação & Benefício Técnico | Modelo / Marca Recomendada | Investimento Médio (R$) | Justificativa de ROI |
| :--- | :--- | :--- | :---: | :--- |
| **Microscópio Trinocular Estéreo com Câmera HDMI/USB** | Zoom óptico contínuo $7\text{x}-45\text{x}$, lente Barlow $0.5\text{x}$ (para aumentar distância de trabalho para solda), iluminação LED anelar com dimmer e saída trinocular para monitor Full HD. Permite inspeção de solda fria em BGA e reconstrução de trilhas microscópicas. | Relife RL-M3T-B1 / QianLi / Yaxun AK20 | R$ 2.100,00 – R$ 2.700,00 | 4 Reparos de Placa de Notebook |
| **Estação de Retrabalho SMD & Solda Profissional** | Controle digital de temperatura por circuito PID, soprador de ar quente com fluxo ajustável até $120\text{L/min}$ e ferro de solda de aquecimento ultra-rápido com pontas T12 / C210 (aquecimento em 2 segundos). | Quick 861DW (Topo) ou Sugon T26D / Yaxun 886D+ | R$ 550,00 (Híbrida) / R$ 1.600,00 (Topo) | 2 a 3 Trocas de CI / Conectores |
| **Fonte de Bancada Assimétrica Digital Regulável** | $0-30\text{V}$, $0-5\text{A}$ ou $0-10\text{A}$, display de 4 dígitos (tensão, corrente, potência), proteção contra sobrecorrente (OCP) e curto-circuito. Utilizada para **injeção de tensão** nas linhas de $19\text{V}$, $5\text{V}$, $3.3\text{V}$ e VCore para localizar capacitores e MOSFETs em curto que matam a placa. | Wanptek DPS3010U / Minipa MPL-3205M / Uni-T | R$ 380,00 – R$ 580,00 | 2 Reparos de Placa com Curto |
| **Câmera Térmica de Alta Resolução para Smartphone / Bancada** | Resolução infravermelha mínima $256 \times 192$ pixels, taxa de atualização $25\text{Hz}$, detecção de diferencial de temperatura de $0.05^\circ\text{C}$. Ao injetar tensão com a fonte assimétrica, o componente em curto brilha imediatamente na tela em menos de 3 segundos, eliminando horas de medição estática. | Infiray T2S Plus / Topdon TC001 / QianLi SuperCam | R$ 1.450,00 – R$ 2.200,00 | Reduz tempo de diagnóstico de curto de 2h para 30s |
| **Gravador Universal de Super I/O & BIOS (KB9012 / IT8586)** | Programador especializado para CIs de Super I/O (EC/KBC) de notebooks que contêm firmware interno soldado na placa. | SVOD 4 / RT809H / Vertyanov JIG | R$ 900,00 – R$ 1.600,00 | Recuperação de placas sem start |

---

## 🛠️ 5. Procedimentos Operacionais Padrão (SOP) de Bancada & Campo

Para garantir que todo o investimento em hardware se traduza em reputação inabalável e zero retrabalho, todos os técnicos e estagiários da IF Tech seguem os seguintes protocolos obrigatórios:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            FLUXO OPERACIONAL DE BANCA DA IF TECH                                 │
├──────────────────────────┬──────────────────────────┬────────────────────────────────────────────┤
│ 1. CHECK-IN & RECEPTÁCULO│ 2. DESMONTAGEM & LIMPEZA │ 3. MONTAGEM & STRESS-TEST                  │
│ • Foto 360° no Cockpit   │ • Manta ESD + Pulseira   │ • Pasta MX-4 na proporção correta          │
│ • Impressão Etiqueta OS  │ • Parafusos na Manta Pad │ • Cable Management Militar                 │
│ • Caixa c/ Trava do Cli. │ • Banho Químico Isoprop. │ • 1h AIDA64 + FurMark (Laudo PDF Gerado)   │
└──────────────────────────┴──────────────────────────┴────────────────────────────────────────────┘
```

### 5.1. Protocolo de Aterramento & Prevenção ESD
1. Antes de encostar em qualquer PCB, o técnico conecta a garra jacaré da pulseira ESD ao ponto de terra da bancada;
2. Placas-mãe, placas de vídeo e memórias RAM retiradas do chassi **devem repousar unicamente sobre a manta dissipativa cinza/azul** ou dentro de sacos antiestáticos metalizados (nunca sobre papelão, madeira crua ou plástico bolha convencional);
3. Limpeza de poeira sempre com pincéis condutivos dissipativos e soprador elétrico. **É expressamente proibido o uso de pincéis de cerdas plásticas comuns** (que geram cargas estáticas superiores a 5.000V).

### 5.2. Protocolo de Aplicação Térmica de Alta Condução
1. **Remoção de Composto Antigo:** Umedecer papel toalha industrial com álcool isopropílico 99.8%, amolecer a pasta ressecada e remover completamente sem riscar o DIE/Heatspreader. Finalizar com cotonete e álcool isopropílico no espelho de cobre do dissipador;
2. **CPUs com IHS Metálico (Desktop):** Método do ponto central generoso (tamanho de uma ervilha) ou padrão em "X" fino para processadores retangulares (Intel LGA1700 / AMD AM5);
3. **CPUs/GPUs com DIE Exposto (Notebooks & Placas de Vídeo):** **Método do Espalhamento Integral (Butter/Spread Method)** utilizando a espátula de silicone que acompanha a MX-4/Hydronaut, cobrindo 100% da superfície do DIE sem bolhas de ar antes de assentar o dissipador.

### 5.3. Estrutura Padrão do Pendrive Ventoy Multiboot IF Tech
Os pendrives de bancada e campo são particionados em GPT/UEFI e contêm as seguintes ferramentas homologadas:

```
VENTOY_IFTECH (Drives USB 3.2 Metal)
│
├── 📁 01_SISTEMAS_OPERACIONAIS/
│   ├── Win11_23H2_Pro_x64_PTBR_IFTech_Optimized.iso
│   ├── Win10_22H2_Pro_x64_PTBR_Official.iso
│   └── Ubuntu_Desktop_24.04_LTS_x64.iso
│
├── 📁 02_DIAGNOSTICO_E_BOOT/
│   ├── Sergei_Strelec_WinPE_2024_x64.iso (Kit Completo de Recuperação)
│   ├── Hirens_BootCD_PE_x64_v1.0.8.iso
│   ├── MemTest86_Pro_v10.7_UEFI.iso (Teste de Memória RAM)
│   └── GParted_Live_x64.iso (Particionamento Avançado)
│
├── 📁 03_CLONAGEM_E_BACKUP/
│   ├── Clonezilla_Live_x64.iso
│   └── Macrium_Reflect_Rescue_PE_x64.iso
│
└── 📁 04_UTILITARIOS_E_OFFLINE_INSTALL/
    ├── SDI_Origin_Drivers_LAN_WiFi_Full.zip (Drivers Offline de Rede)
    ├── IFTech_RMM_Agent_Silent_Deploy.ps1 (Script de Onboarding B2B)
    ├── FurMark_v2_Installer.exe (Teste de Estresse GPU)
    ├── AIDA64_Extreme_Portable.zip (Teste de Estresse CPU/FPU/Cache)
    └── CrystalDiskInfo_DiskMark_Portable.zip (Saúde de SSD/HD)
```

---

## 🏬 6. Guia de Fornecedores & Logística de Compras no Brasil

| Canal / Fornecedor | Especialidade / O que comprar | Prazo Médio de Entrega (Bragança Paulista) | Vantagem Competitiva |
| :--- | :--- | :---: | :--- |
| **Mercado Livre (Filtro: Full)** | Ferramentas manuais, multímetros, pendrives SanDisk, pastas térmicas Arctic MX-4 com envio no mesmo dia, conectores e cabos de força. | 24h a 48h (Entrega no dia seguinte) | Velocidade imediata de reposição e nota fiscal garantida. |
| **KaBuM! / TerabyteShop / Pichau** | Fontes ATX 80 Plus Bronze (MSI/Corsair), SSDs NVMe e SATA originais com garantia nacional de 3 a 5 anos, memórias RAM Kingston Fury. | 2 a 4 dias úteis | Preço de distribuidor com garantia direta do fabricante. |
| **Proesi / Baú da Eletrônica** | Manta antiestática de borracha, álcool isopropílico 1L, estanho Cobix, malhas dessoldadoras Goot Wick e conectores eletrônicos. | 3 a 5 dias úteis | Especialistas em eletrônica com preços de atacado. |
| **Shopee (Vendedores Locais / SP)** | Insumos secundários: kits de palhetas plásticas, frascos dosadores pump ESD, fita Kapton, organizadores de parafusos e luvas ESD. | 2 a 5 dias úteis | Menor custo unitário em miudezas plásticas e consumíveis. |
| **AliExpress (Choice / Remessa Conforme)** | Ferramental avançado de alto valor: microscópios trinoculares Relife, câmeras térmicas Infiray/Topdon e estações de ar quente Quick. | 9 a 16 dias corridos | Economia de até 45% comparado ao mercado importador nacional. |
| **Distribuidoras Oficiais TI (CNPJ): All Nations, SND, Aldo, Fujioka** | Hardware de alto volume para projetos MSP: switches gerenciáveis, access points corporativos, lotes de 10+ SSDs e memórias. | Faturamento a prazo (Boleto 28 dias) | Margem máxima de distribuição para contratos B2B. |

---

## 📊 7. Análise de Retorno sobre Investimento (ROI) da Fase 1

O investimento da **Fase 1 (R$ 2.541,00)** é amortizado com rapidez cirúrgica através dos primeiros atendimentos listados no catálogo de serviços da IF Tech:

$$\text{Faturamento Necessário para Payback} = \text{R\$ 2.541,00}$$

| Serviço Executado (Catálogo IF Tech) | Quantidade | Faturamento Unit. (Mão de Obra + Peça) | Faturamento Bruto | Lucro Líquido Acumulado |
| :--- | :---: | :---: | :---: | :---: |
| **HW-03B: Limpeza Profunda & Troca Térmica Premium (Desktop/Note)** | 4 clientes | R$ 220,00 | R$ 880,00 | R$ 810,00 |
| **HW-04: Upgrade de SSD NVMe 512GB + Clonagem Bit-a-Bit** | 4 clientes | R$ 480,00 (R$ 140 MO + R$ 340 Peça) | R$ 1.920,00 | R$ 1.140,00 |
| **HW-05: Montagem de PC Gamer de Alta Precisão** | 2 clientes | R$ 350,00 (Mão de obra média) | R$ 700,00 | R$ 700,00 |
| **Serviço de Rede B2B / Conectorização & Rastreamento Rack** | 1 empresa | R$ 450,00 (Visita Técnica + 10 pontos) | R$ 450,00 | R$ 410,00 |
| **TOTAL DOS PRIMEIROS 11 SERVIÇOS** | **11 OSs** | — | **R$ 3.950,00** | **R$ 3.060,00 (120% do CapEx)** |

> [!NOTE]
> **Conclusão Econômica:**  
> Com uma média de **apenas 2 a 3 serviços por semana**, o investimento total da bancada e da mala de campo se paga integralmente em **menos de 3 semanas (15 a 21 dias de operação)**, deixando a empresa com 100% dos ativos quitados e gerando lucro líquido recorrente para o reinvestimento na Fase 2.
