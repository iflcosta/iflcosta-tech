# 🚀 ROTEIRO MESTRE DE TESTES CRONOLÓGICO (LIFECYCLE QA ROADMAP)
**IF Tech // Hardware Lab • Web Engines • MSP Corporativo**
*Versão:* 6.0 (Fluxo Cronológico Real) • *Data de Início:* 29/08/2026

---

## 📋 Como Funciona este Roteiro
Este documento segue a **ordem cronológica exata da vida real**: desde o técnico abrindo o sistema pela manhã, recebendo o primeiro equipamento, até a experiência do cliente e a apuração financeira no DRE.

---

## 🗺️ MATRIZ DE TESTES EM ORDEM CRONOLÓGICA REAL

### 1️⃣ FASE 1: Acesso ao Cockpit Admin & Primeiro Check-in de OS
- [ ] **1.1. Login no Cockpit (`https://iflcosta.tech/app`):**
  - Digite o PIN Master: `982601` ➔ Acesso liberado ao painel;
  - Teste os atalhos de teclado: `Alt+1` a `Alt+7` (navegar entre abas), `F1` (ajuda de atalhos), `Esc` (fechar modais);
  - Teste a persistência no `F5` (mudar de aba e atualizar a página mantendo a mesma aba aberta).
- [ ] **1.2. Check-in de Entrada do Primeiro Equipamento (30s):**
  - Pressione `Alt+N` ou clique em `+ CHECK-IN ENTRADA (30S)`;
  - Preencha:
    * Nome do Cliente: `Carlos Silva`
    * WhatsApp: `11998887766`
    * Canal: `📍 Balcão Presencial` (ou `🚚 Coleta Leva-e-Traz`)
    * Aparelho: `Notebook Lenovo Ideapad 3`
    * Defeito Relatado: `Não liga e esquenta muito ao conectar a fonte`
    * Senha/PIN do Usuário: `1234`
  - Salve a OS ➔ A OS deve ser gerada na coluna **`01. Triagem`** e o cliente criado automaticamente no CRM.
- [ ] **1.3. Impressão Térmica Dual:**
  - Clique na OS criada e teste:
    * **🏷️ Etiqueta de Bancada (58mm):** layout para colar na carcaça com OS, PIN, Defeito e QR Code;
    * **🧾 Recibo do Cliente (CDC 90D):** termo de custódia com Termo de Guarda e Garantia Legal CDC 90 Dias.

---

### 2️⃣ FASE 2: Diagnóstico, Orçamento & Envio da Proposta
- [ ] **2.1. Elaboração do Orçamento na Bancada:**
  - Na OS em Triagem, clique em `Definir Orçamento`;
  - Adicione:
    * Peça: `SSD NVMe M.2 512GB Kingston` (Custo: R$ 130,00 / Venda: R$ 260,00)
    * Mão de Obra: `R$ 180,00` (Limpeza profunda, troca de pasta térmica e instalação do NVMe)
  - Observe a barra de rodapé fixa calculando o total (R$ 440,00) e clique em `✓ Salvar Orçamento & Emitir Proposta`;
  - A OS deve mover para **`02. Orçamento`** com o badge de *Sinal Pendente*.
- [ ] **2.2. Envio do Magic Link para o Cliente:**
  - Clique no botão `Link Pix p/ WhatsApp` ➔ Copia a mensagem pré-formatada com o Magic Link de rastreamento direto para o cliente.

---

### 3️⃣ FASE 3: Experiência do Cliente no Portal (`https://iflcosta.tech/status`)
- [ ] **3.1. Busca e Rastreamento da OS:**
  - Abra o Portal do Cliente e teste localizar a OS digitando o número (ex: `1051` ou `001051`) e o telefone;
  - Teste também rastrear direto pelo Hero da Landing Page (`https://iflcosta.tech`);
- [ ] **3.2. Visualização do Laudo & Sigilo Financeiro:**
  - Verifique o Stepper na etapa 2 (*Aguardando Sinal de Peças*);
  - Verifique o laudo técnico e a discriminação de itens;
  - **Segurança & Sigilo:** Garanta que o preço de custo (R$ 130) esteja 100% oculto, exibindo apenas o valor de venda (R$ 260);
- [ ] **3.3. Aprovação do Orçamento & Checkout Asaas:**
  - Clique em `APROVAR ORÇAMENTO & SOLICITAR PEÇAS` ➔ Abre o modal Asaas com o valor do sinal das peças (R$ 260,00);
  - Verifique o QR Code Pix dinâmico, código copia-e-cola e opções de cartão;
  - Clique em `⚡ Simular Pagamento Aprovado` ➔ O Portal exibe confirmação e avança o status para *Sinal Quitado ✓*.

---

### 4️⃣ FASE 4: Execução na Bancada, QA e Entrega com Garantia CDC
- [ ] **4.1. Execução na Bancada (`03. Na Bancada`):**
  - No Cockpit Admin, verifique a OS movida para *Na Bancada*;
  - No Portal do Cliente (em outra aba), veja o banner e o Stepper atualizando em tempo real para *03. Em Execução na Bancada*;
- [ ] **4.2. Testes de Estresse & QA (`04. Testes QA`):**
  - No Cockpit, avance a OS para *Testes QA*;
  - Verifique os dados de telemetria AIDA64/FurMark e validação de 15 minutos;
- [ ] **4.3. Conclusão e Entrega (`05. Pronto p/ Retirada` ➔ `Entregue`):**
  - Avance para *Pronto* e depois clique em *Entregar ao Cliente / Quitar*;
  - No Portal do Cliente, teste o botão `Imprimir Certificado de Garantia (PDF)` com o HASH SHA-256 e termos do CDC Art. 26.

---

### 5️⃣ FASE 5: Consolidação no CRM, Estoque e DRE 360°
- [ ] **5.1. CRM 360° (`Alt+4`):**
  - Verifique o cliente `Carlos Silva` com o faturamento LTV acumulado e a OS no histórico;
- [ ] **5.2. Estoque & PDV Caixa Rápido (`Alt+3`):**
  - Cadastre um produto no almoxarifado e teste uma venda balcão com cupom térmico não fiscal;
- [ ] **5.3. DRE 360° & Lucro Real (`Alt+7`):**
  - Verifique se o DRE consolidou o Faturamento Bruto, o CMV das peças e o Lucro Líquido Real apurado.
