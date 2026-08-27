# CRONOGRAMA DE TAREFAS (SDD) & ROADMAP DE SPRINTS
**Projeto:** IF Tech — https://iflcosta.tech

---

## 🏛️ ETAPAS CONCLUÍDAS (FASE DE ESTRUTURAÇÃO & SPRINT 1)

- [x] **Fase 1 a 7:** Branding Neobrutalista, Landing Page de Alta Conversão e SEO Local Bragança Paulista.
- [x] **Fase 8 a 10:** Modelagem Relacional do Supabase, Catálogo de Preços e POPs de Atendimento.
- [x] **Sprint 1 (Bancada, Kanban & Experiência do Cliente):**
  - [x] Cockpit Administrativo 360° (`admin.html` / `app.html` / `iflcosta.tech/app`);
  - [x] Portal de Acompanhamento do Cliente em Tempo Real (`portal.html` / `status.html`);
  - [x] Kanban de 5 Colunas com Máquina de Estados Desacoplada (Triagem -> Orçamento -> Fila -> Bancada -> QA -> Pronto);
  - [x] Impressão Térmica Dual (Etiqueta Adesiva de Bancada 58mm + Recibo de Custódia CDC 90D);
  - [x] Motor Universal de Reconhecimento de Scanner USB de Código de Barras & QR Code com atalho `Ctrl+K`.

---

## 🔮 ROADMAP DE SPRINTS EXECUTIVAS

- [ ] **Sprint 2: Motor Financeiro Asaas & Automações de Pagamento (CONTA/CNPJ DO IRMÃO)**
  - [ ] Criação das tabelas e campos de faturamento Asaas no Supabase;
  - [ ] Geração de Pix Dinâmico com QR Code automático e Copia-e-Cola no Portal do Cliente;
  - [ ] Opção de Cartão de Crédito em até 12x com cálculo de parcelamento;
  - [ ] Trava inteligente de sinal de 100% de peças com avanço automático de status após confirmação do webhook;
  - [ ] Disparo automático de comprovante e recibo digital no WhatsApp.

- [ ] **Sprint 3: Estoque Inteligente & PDV Caixa Rápido (Loja Express)**
  - [ ] Implementação da aba `[ 📦 Estoque & PDV ]` no Cockpit Admin;
  - [ ] Mecânica de Baixa Dupla (Consumo em OS na Bancada com S/N vs Venda Rápida de Balcão);
  - [ ] Rastreamento de Garantia de Fornecedor (KaBuM/SND/All Nations) por Número de Série (S/N) e RMA em 1 clique;
  - [ ] Emissão de Cupom Térmico Não Fiscal 58mm/80mm no PDV;
  - [ ] Alertas visuais de Ponto de Reposição (Kanban de Compras: 🟢 Confortável, 🟡 Reposição, 🔴 Crítico, 🟣 Ruptura).

- [ ] **Sprint 4: Portal B2B MSP & Gestão de Contratos de TI**
  - [ ] Painel corporativo para clientes de TI Gerenciada com inventário de estações e servidores;
  - [ ] Central de chamados e chamados com SLA 2h/4h;
  - [ ] Monitoramento de rotinas de backup em nuvem (Regra 3-2-1) e telemetria de segurança.

- [ ] **Sprint 5: DRE Executivo em Tempo Real & BI Analytics 360°**
  - [ ] Apuração diária e mensal da DRE com Custo Fixo Real (R$ 1.300/mês);
  - [ ] CMV real de peças somado à Mão de Obra e ao faturamento do PDV;
  - [ ] Dashboard de Atribuição de Canais (Leva-e-Traz vs Balcão Presencial) e CAC/LTV.

- [ ] **Sprint 6: 🤖 BOT DE IA SNIPER DE PROMOÇÕES NO WHATSAPP (HARDWARE & MOBILE)**
  - [ ] **Motor de Ingestão de Ofertas:** Coleta e monitoramento contínuo de promoções relâmpago, cupons e quedas de preço (KaBuM, Terabyte, Pichau, Mercado Livre Full, AliExpress Remessa Conforme, Amazon, Pelando e canais de hardware);
  - [ ] **Cérebro de IA (LLM Filter & Valuation Engine):**
    - Compara o preço encontrado com a tabela de **"Preço Teto de Oportunidade"** da IF Tech (ex: Ryzen 5 5600G <= R$ 480, SSD NVMe 1TB <= R$ 260, RTX 4060 <= R$ 1.650, Arctic MX-4 <= R$ 35, Telas/Baterias);
    - Avalia compatibilidade com a **Tríade de Setups da IF Tech** (AMD APU, Intel + GPU, AMD Gamer Pro) e itens curingas de bancada;
    - Calcula na hora a **Margem Líquida Projetada** se a peça for aplicada em uma OS ou vendida em máquina montada;
  - [ ] **Notificador Proativo no WhatsApp do Fundador:**
    - Envio instantâneo de alerta formatado: *"🚨 [SNIPER IF TECH] SSD Kingston 1TB NVMe por R$ 249 na KaBuM com cupom! Margem projetada na Bancada: +R$ 230,00. Link direto: [URL]"*.
