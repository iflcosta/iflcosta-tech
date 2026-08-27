# CRONOGRAMA DE TAREFAS (SDD) & ROADMAP DE SPRINTS
**Projeto:** IF Tech — https://iflcosta.tech

---

## 🏛️ ETAPAS CONCLUÍDAS

- [x] **Fase 1 a 7:** Branding Neobrutalista, Landing Page de Alta Conversão e SEO Local Bragança Paulista.
- [x] **Fase 8 a 10:** Modelagem Relacional do Supabase, Catálogo de Preços e POPs de Atendimento.
- [x] **Sprint 1 (Bancada, Kanban & Experiência do Cliente):**
  - [x] Cockpit Administrativo 360° (`admin.html` / `app.html` / `iflcosta.tech/app`);
  - [x] Portal de Acompanhamento do Cliente em Tempo Real (`portal.html` / `status.html`);
  - [x] Kanban de 5 Colunas com Máquina de Estados Desacoplada (Triagem -> Orçamento -> Fila -> Bancada -> QA -> Pronto);
  - [x] Impressão Térmica Dual (Etiqueta Adesiva de Bancada 58mm + Recibo de Custódia CDC 90D);
  - [x] Motor Universal de Reconhecimento de Scanner USB de Código de Barras & QR Code com atalho `Ctrl+K`.
- [x] **Sprint 2: Motor Financeiro Asaas & Automações de Pagamento (CONTA/CNPJ DO IRMÃO)**
  - [x] Criação das tabelas e campos de faturamento Asaas no Supabase (`payments`, `sprint2_asaas_payments_schema.sql`);
  - [x] Modal de Pagamento Asaas no Portal do Cliente com QR Code Pix Dinâmico e Copia-e-Cola;
  - [x] Opção de Cartão de Crédito em até 12x com cálculo de parcelamento;
  - [x] Trava inteligente de sinal de 100% de peças (com avanço automático para `Peca_Encomendada` após pagamento);
  - [x] Painel de conciliação Asaas no Cockpit Admin com cópia de cobrança para WhatsApp e simulador Sandbox.
- [x] **Sprint 3: Estoque Inteligente & PDV Caixa Rápido (Loja Express)**
  - [x] Implementação da aba `[ 📦 Estoque & PDV ]` no Cockpit Admin com 3 sub-visões especializadas;
  - [x] PDV Caixa Rápido com leitor de código de barras USB (atalho `F2`), Hot-Tiles e cálculo de troco automático;
  - [x] Emissão de Cupom Térmico Não Fiscal 58mm/80mm no PDV (atalho `F8`);
  - [x] Catálogo Geral com saldo físico, reservado e disponível + Alertas de Reposição (Curva ABC);
  - [x] Raio-X de Garantia Reversa (RMA de Fornecedor) por Número de Série (S/N) e Livro Kardex auditável.

---

## 🔮 PRÓXIMAS SPRINTS

- [x] **Sprint 4: Software & Engenharia Web (Motor 50/50, Milestones, Staging, QA Lighthouse & Timesheet)**
  - [x] Pipeline visual de projetos de software no Cockpit Admin (`admin.html` / `app.html`);
  - [x] Wizard de criação de projeto (Landing Page, Automação WhatsApp, Sistema Web/SaaS, Custom);
  - [x] Motor de Faturamento 50/50 integrado ao Asaas (50% Sinal no Kickoff + 50% na Homologação);
  - [x] Gestão de Milestones/Entregáveis com avanço de status e checklist de homologação;
  - [x] Timesheet de Horas Adicionais (R$ 130/h) para escopo extra e suporte especializado;
  - [x] Painel do Cliente no Portal (`portal.html` / `status.html`) com stepper de desenvolvimento, link de Staging e botão de Homologação/Aceite em 1 clique;
  - [x] Métricas de QA de Software (Lighthouse Performance, SEO e Best Practices > 95);
  - [x] Schema DDL e RPCs atômicas no Supabase (`docs/ops/sprint4_software_web_schema.sql`).

- [ ] **Sprint 5: Portal B2B MSP & Gestão de Contratos de TI Corporativa**
  - [ ] Painel corporativo para clientes de TI Gerenciada com inventário de estações e servidores;
  - [ ] Central de chamados e service desk com SLA 2h/4h;
  - [ ] Monitoramento de rotinas de backup em nuvem (Regra 3-2-1) e telemetria de segurança ("Dead Man's Snitch").

- [ ] **Sprint 6: DRE Executivo em Tempo Real & BI Analytics 360°**
  - [ ] Apuração diária e mensal da DRE com Custo Fixo Real calibrado (R$ 1.300/mês);
  - [ ] Consolidação dos 4 Motores de Receita (Hardware, Software, MSP e PDV Balcão);
  - [ ] Dashboard de Atribuição de Canais (Leva-e-Traz vs Balcão Presencial) e Unit Economics (CAC/LTV).

- [ ] **Sprint 7: 🤖 BOT DE IA SNIPER DE PROMOÇÕES NO WHATSAPP (HARDWARE & MOBILE)**
  - [ ] Coleta contínua de promoções relâmpago (KaBuM, Terabyte, Pichau, ML Full, AliExpress DDP);
  - [ ] Cérebro de IA com filtro pelo Preço Teto IF Tech e cálculo de margem líquida;
  - [ ] Notificações automáticas no WhatsApp com link direto de compra.

