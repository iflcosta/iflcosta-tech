# Procedimentos Operacionais Padrão (SOPs)
**Projeto:** IFLCosta Tech

## 1. Check-in de Hardware (Triagem e Leva-e-Traz)
**Objetivo:** Garantir a segurança jurídica da empresa e a transparência com o cliente desde a coleta até a entrada na bancada.
- **Passo 1.1:** Coleta dos dados cadastrais básicos via WhatsApp (Nome, CPF/CNPJ, Endereço).
- **Passo 1.2:** Inspeção Visual no ato da coleta ou recebimento.
  - Fotografar o equipamento de 4 ângulos (Tampa superior, inferior, tela, teclado).
  - Fotografar o número de série e etiquetas de patrimônio.
- **Passo 1.3:** Preenchimento do Checklist de Entrada no ERP:
  - O equipamento liga? (Sim/Não)
  - Veio acompanhado de fonte/carregador original?
  - Possui senhas? (Solicitar pin/senha temporária de login).
- **Passo 1.4:** Disparo automático do **Template 1** (Protocolo de Entrada) via WhatsApp.

## 2. Ciclo de Aprovação e Orçamento (Sinal Financeiro)
**Objetivo:** Proteger o caixa da empresa e garantir comprometimento do cliente antes do início da execução.
- **Regra 2.1 (Hardware e Peças):**
  - O diagnóstico técnico deve separar claramente o valor da **Mão de Obra** do valor das **Peças**.
  - O serviço só entra no status `Aguardando Peca` após o pagamento de 100% do custo da peça pelo cliente (ou via cartão com repasse de juros da operadora).
- **Regra 2.2 (Projetos de Software):**
  - O Kickoff do projeto (Landing Page, Sistema) só ocorre mediante o pagamento de **50% de sinal** de Mão de Obra. Os 50% restantes na aprovação da homologação.
- **Passo 2.3:** Envio do **Template 2** (Orçamento Transparente) via WhatsApp ou link gerado pelo ERP.

## 3. Protocolo de Testes e QA (Quality Assurance) e Saída
**Objetivo:** Reduzir retorno de garantia (RMA) a menos de 2%, certificando que o equipamento/sistema suportará o uso diário no limite.
- **Passo 3.1 (Testes de Hardware):**
  - Rodar **CrystalDiskInfo** para verificar a integridade da controladora do SSD/HDD.
  - Rodar **MemTest86** em caso de upgrades de memória (pelo menos 1 ciclo sem erros).
  - Rodar **Cinebench / FurMark** monitorando o **HWMonitor** (Tempo mínimo: 15 minutos de estresse contínuo). A temperatura do processador não deve encostar no Thermal Throttling após a troca da pasta térmica.
- **Passo 3.2 (Testes de Software):**
  - Validação de Performance via Lighthouse (exigir Score de Performance e SEO acima de 95).
  - Teste destrutivo de formulários, banco de dados e fluxos de integração (APIs).
- **Passo 3.3:** Gerar laudo em PDF e atualizar status da OS para `Pronto`. Disparar **Template 3** (Notificação de Conclusão).

## 4. Onboarding de Cliente MSP (TI Gerenciada B2B)
**Objetivo:** Assumir o controle da infraestrutura do cliente B2B de forma silenciosa, invisível e proativa.
- **Passo 4.1:** Auditoria Inicial na rede física, roteadores e topologia lógica do cliente.
- **Passo 4.2:** Instalação do Agente RMM (MeshCentral, Tactical RMM, Atera ou similar) em todas as estações e servidores cobertos pelo contrato.
- **Passo 4.3:** Configuração da rotina de Backup Redundante 3-2-1. (Ex: Script de cópia local NAS + Espelhamento em Nuvem fria como S3/Backblaze B2 usando Duplicati ou Rclone).
- **Passo 4.4:** Criação do SLA (Acordo de Nível de Serviço) e canais de acesso rápido ao suporte (Ticket ou Grupo de WhatsApp). Disparo do **Template 5** (Termo de Contrato MSP).

## 5. Governança de Bancada, Técnicos Parceiros & Blindagem de Marca
**Objetivo:** Permitir a escala da assistência técnica com técnicos terceirizados/parceiros com total controle de qualidade, rastreabilidade interna e proteção institucional da marca IF Tech.

- **Regra 5.1 (Anonimato Institucional do Técnico perante o Cliente):**
  - O cliente final **NUNCA** tem acesso ao nome pessoal ou contato direto do técnico que executou a OS;
  - Toda comunicação no Portal do Cliente (`portal.html`), mensagens no WhatsApp, laudos técnicos e recibos térmicos é assinada institucionalmente como **"Engenharia Especializada // IF Tech"** ou **"Laboratório Central IF Tech"**;
  - A responsabilidade jurídica (CDC Art. 26) e a garantia legal são 100% da **IF Tech**. Internamente, o sistema mantém rastreabilidade forense completa de qual técnico executou cada etapa.
- **Regra 5.2 (Trava Rígida de WIP — Limite de 2 OSs Simultâneas por Técnico):**
  - Cada técnico parceiro pode ter no máximo **2 (duas) Ordens de Serviço simultâneas** no status `Na_Bancada` (em execução física);
  - Para puxar uma 3ª OS da fila, o técnico é obrigado a concluir a montagem e os testes térmicos de estresse QA (FurMark / AIDA64 de 15 min), avançando o equipamento para `Pronto`;
  - Isso impede o acúmulo de máquinas paradas na bancada e garante o cumprimento rigoroso dos prazos combinados.
- **Regra 5.3 (Modelo de Distribuição Híbrido):**
  - **Serviços Padrão / Rotina (Troca de SSD, Limpeza, Formatação):** Fila aberta com auto-atribuição (`[ ⚡ Puxar p/ Minha Bancada ]`);
  - **Serviços Críticos (Microeletrônica, Placa-Mãe, BGA, MacBook):** Atribuição direta e manual realizada exclusivamente pelo Lead Engineer / Gestor da IF Tech.
- **Regra 5.4 (Responsabilidade de RMA & Garantia Reversa):**
  - Equipamentos que retornarem dentro do prazo de garantia CDC de 90 dias com o mesmo vício oculto/defeito são direcionados compulsoriamente ao mesmo técnico responsável pela execução inicial;
  - O retrabalho em garantia não gera nova comissão de mão de obra, incentivando o técnico a aplicar o checklist de QA de 15 minutos com excelência na primeira intervenção.

