# 🚀 ROTEIRO MESTRE DE TESTES PONTA A PONTA (TEST FLIGHT QA ROADMAP)
**IF Tech // Hardware Lab • Web Engines • MSP Corporativo**
*Versão:* 5.0 (Clean Slate Baseline) • *Data de Início:* 28/08/2026

---

## 📋 Como Funciona este Roteiro
Este documento foi estruturado para você testar **100% dos fluxos reais** do seu negócio, do primeiro contato do cliente até a conciliação financeira no DRE.

> **Regra de Ouro:** Conforme você for testando cada etapa, anote no checklist abaixo se o comportamento foi `[OK]` ou se encontrou algum detalhe/ajuste `[BUG / AJUSTE]`. Basta me enviar a mensagem com o que você notou para corrigirmos na hora!

---

## 🗺️ MATRIZ DE TESTES POR ETAPA

### 1️⃣ ETAPA 1: Landing Page & Atendimento Inicial (`https://iflcosta.tech`)
- [ ] **1.1. Rastreamento de OS no Hero:** Digite um número de OS (ex: `1001`) ou token no campo do Hero e clique em `Rastrear` ➔ Deve redirecionar para `/status?os=1001`;
- [ ] **1.2. Seletor de Diagnóstico no WhatsApp:**
  - Clique no Card 1 (*Hardware & PC Lento*) ➔ Deve abrir o WhatsApp com mensagem pré-formatada de hardware;
  - Clique no Card 2 (*Criar Site ou Sistema*) ➔ Deve abrir o WhatsApp com mensagem de software;
  - Clique no Card 3 (*Suporte de TI PME*) ➔ Deve abrir o WhatsApp para agendamento de avaliação de TI;
- [ ] **1.3. Menu Mobile e Navegação:** Abra no celular ou redimensione a tela ➔ Teste abrir/fechar o menu hambúrguer e clicar em `ACOMPANHAR SERVIÇO`.

---

### 2️⃣ ETAPA 2: Acesso ao Cockpit Admin (`https://iflcosta.tech/app`)
- [ ] **2.1. Tela de Login (Auth Guard):**
  - Teste login via **PIN Master** (`982601`);
  - Teste login via **Supabase Auth** (se tiver criado usuário no dashboard);
- [ ] **2.2. Persistência de Tela no F5:**
  - Mude para a aba `3. Estoque & PDV` ou `4. Clientes & CRM` e pressione `F5` ➔ Deve recarregar e permanecer exatamente na mesma aba;
- [ ] **2.3. Atalhos de Teclado:**
  - Pressione `Alt+1` até `Alt+7` ➔ Deve navegar entre as 7 abas;
  - Pressione `F1` ou `?` ➔ Deve abrir a Central de Atalhos (Cheat Sheet);
  - Pressione `Escape` ➔ Deve fechar modais abertos.

---

### 3️⃣ ETAPA 3: Motor 1 - Bancada de Hardware & Check-in de OS (`Alt+1`)
- [ ] **3.1. Check-in de Entrada (30s):**
  - Pressione `Alt+N` ou clique em `+ CHECK-IN ENTRADA (30S)`;
  - Preencha: Nome do Cliente, WhatsApp (ex: `11999998888`), Aparelho (ex: `Notebook Dell Inspiron`), Defeito Relatado e PIN/Senha;
  - Salve a OS ➔ Deve criar a **OS #1001** na coluna **Triagem** e cadastrar o cliente no CRM;
- [ ] **3.2. Impressão Térmica Dual:**
  - Clique em `🖨️ Etiqueta de Bancada` ➔ Deve gerar o layout 58mm para colar na carcaça com PIN, Defeito e QR Code;
  - Clique em `📄 Recibo do Cliente` ➔ Deve gerar o termo térmico de custódia com Termo de Guarda e Garantia Legal CDC 90 Dias;
- [ ] **3.3. Ciclo de Vida da OS no Kanban:**
  - **Triagem ➔ Orçamento:** Clique em `Definir Orçamento`, adicione 1 peça (ex: SSD 480GB - Custo R$ 90 / Venda R$ 180) + Mão de Obra (R$ 150) e salve;
  - **Orçamento ➔ Fila:** Teste aprovação do orçamento;
  - **Fila ➔ Bancada:** Inicie a manutenção, adicione fotos da máquina aberta e dados de telemetria térmica AIDA64 (-18°C);
  - **Bancada ➔ QA ➔ Pronto p/ Retirada:** Avance até a finalização e teste a entrega da máquina com quitação.

---

### 4️⃣ ETAPA 4: Portal do Cliente em Tempo Real (`https://iflcosta.tech/status`)
- [ ] **4.1. Visualização via Magic Link:**
  - No Cockpit, clique em `🔗 Magic Link` na OS #1001 e abra a URL no navegador;
  - Verifique: Stepper de 5 etapas atualizado, laudo técnico de bancada com fotos e telemetria térmica;
  - **Sigilo Absoluto:** Verifique se o preço de custo da peça está 100% oculto para o cliente (exibindo apenas o valor final de venda);
- [ ] **4.2. Pagamento Pix Asaas:**
  - Teste o modal de pagamento Pix (QR Code dinâmico e código copia-e-cola);
- [ ] **4.3. Certificado de Garantia CDC 90D:**
  - Clique em `Imprimir Certificado de Garantia (PDF)` ➔ Deve abrir o documento oficial com HASH de autenticidade SHA-256 e termos do CDC Art. 26.

---

### 5️⃣ ETAPA 5: Motor 2 - Custom Build & Orçamentos de Máquinas (`Alt+2`)
- [ ] **5.1. Seletor de Perfis Pré-Calibrados:**
  - Selecione perfis como *Gamer Esports*, *Workstation 3D/Render* ou *PC Escritório Ultra-Rápido*;
  - Verifique se os componentes, custos, preços de venda e mão de obra de montagem são preenchidos e recalculados;
- [ ] **5.2. Montagem Livre & Cadastro:**
  - Troque peças e adicione componentes personalizados;
  - Clique em `Gerar Orçamento / WhatsApp` e teste o envio da proposta.

---

### 6️⃣ ETAPA 6: Motor 3 - Estoque Inteligente & PDV Caixa Rápido (`Alt+3`)
- [ ] **6.1. Cadastro de Produto no Almoxarifado:**
  - Clique em `+ CADASTRAR PRODUTO / ENTRADA`;
  - Cadastre: SSD NVMe 512GB (Custo R$ 130, Venda R$ 260, Estoque: 5, Mínimo: 2);
  - Verifique se o produto aparece no catálogo e na esteira de categorias;
- [ ] **6.2. Venda Rápida de Balcão (PDV):**
  - No PDV Caixa Rápido, clique no produto ou bipe o código de barras (`F2`);
  - Selecione a forma de pagamento (Pix / Cartão / Dinheiro com troco automático);
  - Finalize a venda (`F8`) ➔ Verifique se emite o **Cupom Térmico Não Fiscal** e dá baixa automática no estoque.

---

### 7️⃣ ETAPA 7: Motor 4 - Clientes & CRM 360° (`Alt+4`)
- [ ] **7.1. Listagem & Filtros:**
  - Verifique se o cliente da OS #1001 está listado;
  - Teste os filtros de tipo (Todos, B2C Pessoa Física, B2B Empresas);
- [ ] **7.2. Dossiê LTV do Cliente:**
  - Clique em `👁️ Ver Dossiê` ➔ Verifique se exibe o faturamento acumulado (LTV), total de máquinas atendidas e histórico completo de serviços.

---

### 8️⃣ ETAPA 8: Motor 5 - Projetos de Software (50/50 & Web) (`Alt+5`)
- [ ] **8.1. Criação de Projeto Web:**
  - Clique em `+ NOVO PROJETO WEB`, selecione `SW-01` (Landing Page de Alta Conversão);
  - Defina cliente, orçamento (ex: R$ 2.400) e modelo de pagamento 50% Kickoff / 50% Entrega;
- [ ] **8.2. Timesheet de Horas:**
  - Adicione um apontamento de horas extras (ex: 2.0h a R$ 130/h para integração de API);
- [ ] **8.3. Portal do Cliente para Software:**
  - Abra o link do portal do projeto e verifique o status de desenvolvimento e homologação digital.

---

### 9️⃣ ETAPA 9: Motor 6 - Contratos MSP & Service Desk B2B (`Alt+6`)
- [ ] **9.1. Cadastro de Contrato MSP:**
  - Clique em `+ NOVO CONTRATO MSP`, cadastre uma empresa cliente (ex: 5 estações a R$ 98/estação = R$ 490/mês, SLA 2h);
- [ ] **9.2. Inventário ITAM & RustDesk:**
  - Cadastre uma estação de trabalho vinculando o RustDesk ID e teste o botão `Conectar`;
- [ ] **9.3. Service Desk (Gestão de Chamados):**
  - Abra um chamado técnico e verifique o cronômetro de SLA regressivo em tempo real.

---

### 🔟 ETAPA 10: DRE 360° & Business Intelligence (`Alt+7`)
- [ ] **10.1. Consolidação Automática dos 4 Motores:**
  - Acesse a aba `7. DRE 360°`;
  - Verifique se o Faturamento Bruto somou corretamente as receitas de Hardware (OS), Software, MSP e PDV Balcão;
  - Verifique o Custo de Peças (CMV) e o Lucro Líquido Real apurado;
- [ ] **10.2. Simulador de Viabilidade do Ponto Comercial:**
  - Mova o slider do Custo Fixo (R$ 1.300) e veja o cálculo dinâmico de quantas OSs/mês ou contratos MSP cobrem o ponto.

---

## 📝 QUADRO DE REGISTRO DE PROBLEMAS & AJUSTES ENCONTRADOS

| # | Etapa / Tela | O que aconteceu? (Descrição do Problema) | O que deveria acontecer? | Status |
|---|---|---|---|---|
| *01* | | | | `Pendente` |
| *02* | | | | `Pendente` |
| *03* | | | | `Pendente` |
| *04* | | | | `Pendente` |
| *05* | | | | `Pendente` |
