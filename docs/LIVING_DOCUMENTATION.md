# DOCUMENTACAO VIVA - IF Tech ERP / CRM / Portal
# Ultima Atualizacao: 2026-08-30T04:30:00-03:00
# Proposito: Memoria permanente e canonica do projeto. QUALQUER agente ou sessao deve ler este documento antes de fazer alteracoes.

---

## 1. ARQUITETURA DE ARQUIVOS

### 1.1. Arquivos Fonte (Codigo Executavel)

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| index.html | 912 | Landing Page institucional |
| admin.html | 6719 | Cockpit Admin/ERP (ARQUIVO MESTRE) |
| app.html | = admin.html | Copia identica (deploy alias) |
| app/index.html | = admin.html | Copia identica (deploy alias) |
| portal.html | 2750 | Portal do Cliente (ARQUIVO MESTRE) |
| status.html | = portal.html | Copia identica (deploy alias) |
| status/index.html | = portal.html | Copia identica (deploy alias) |
| assets/css/style.min.css | - | CSS Tailwind compilado |
| assets/js/main.js | ~100 | JS auxiliar (NAO importado atualmente) |
| vercel.json | 51 | Config Vercel (redirects, headers, CSP) |
| _redirects | 18 | Config Cloudflare/Netlify rewrites |
| scripts/db_exec.py | - | Executor SQL Supabase |

### 1.2. Regra de Triade (CRITICA)
REGRA: Apos QUALQUER edicao em admin.html, COPIAR para app.html e app/index.html.
REGRA: Apos QUALQUER edicao em portal.html, COPIAR para status.html e status/index.html.
VERIFICACAO: Hashes SHA-256 devem ser identicos dentro de cada triade.

### 1.3. Roteamento de Deploy
| URL Publica | Arquivo Real | Tipo |
|-------------|-------------|------|
| iflcosta.tech/ | index.html | Landing Page |
| iflcosta.tech/app | admin.html (via rewrite) | Cockpit Admin |
| iflcosta.tech/status | portal.html (via rewrite) | Portal Cliente |
| iflcosta.tech/status?token=UUID | portal.html | Magic Link |
| iflcosta.tech/os/:id | portal.html (via _redirects) | AVISO: Falta no vercel.json |
| iflcosta.tech/t/:token | portal.html (via _redirects) | AVISO: Falta no vercel.json |

---

## 2. MAQUINA DE ESTADOS DE OS (Ordem de Servico)

### 2.1. Enum de Status no Banco (os_status_enum)
Triagem -> Diagnostico_Concluido -> Orcamento_Aguardando_Aprovacao -> Aguardando_Sinal_Peca -> Peca_Encomendada -> Na_Bancada -> Teste_Estresse_QA -> Pronto -> Entregue -> Cancelado -> Recusado_Devolucao

### 2.2. Mapeamento Kanban (Cockpit admin.html)
| Coluna Kanban | Status Aceitos | Cor |
|---------------|---------------|-----|
| 01. Triagem | triagem | Verde (brand) |
| 02. Orcamento | orcamento, sinal, diagnostico, encomendada, fila, aprovad | Amarelo |
| 03. Bancada | bancada (mas NAO fila) | Cyan |
| 04. QA | qa, teste | Verde (brand) |
| 05. Pronto | else (TUDO que nao caiu antes) | Branco |
| BUG CK-003: Entregue e Cancelado caem no Pronto porque sao o else final |

### 2.3. Mapeamento Stepper (Portal portal.html)
| Etapa | Status Aceitos |
|-------|---------------|
| 01. Triagem | isTriagem = true quando nao e nenhum outro E sem itens |
| 02. Orcamento | isOrcamento = true quando hasBudget OU status contem orcamento/diagnostico/sinal |
| 03. Bancada | isBancada = na_bancada ou bancada sem fila |
| 04. QA | isQA = qa ou teste ou estresse |
| 05. Pronto/Entregue | isPronto ou isEntregue |

### 2.4. Fluxo de Transicoes (Cockpit -> Supabase -> Portal)
handleSaveIntake() -> status: Triagem -> localStorage + RPC rpc_create_work_order_atomic
handleSaveBudgetFromModal() -> status: Orcamento_Aguardando_Aprovacao -> localStorage + RPC rpc_save_budget_atomic
[Portal] renderWorkOrderData() -> isOrcamento=true, isApproved=false -> Stepper Etapa 2 amarelo -> Botao Aprovar
[Portal] Botao aprovar -> Supabase .update({status: Na_Bancada})
advanceOSStatus(Teste_Estresse_QA) -> Supabase .update({status: Teste_Estresse_QA})
advanceOSStatus(Pronto) -> Supabase .update({status: Pronto})
advanceOSStatus(Entregue) -> Supabase .update({status: Entregue})

---

## 3. FUNCOES DO COCKPIT (admin.html) - MAPA COMPLETO

### 3.1. Infraestrutura e Utilidades (L1823-2060)
| Funcao | Linha | Proposito | Supabase? |
|--------|-------|-----------|-----------|
| getSupabase() | 1823 | Singleton Supabase client | - |
| generateUUIDToken() | 1836 | Gera UUID v4 para magic link | - |
| generateNextOSNumber() | 1846 | Gera numero MMYYNNN | - |
| getCleanPhoneForWhatsApp() | 1871 | Remove DDI e formata DDD+numero | - |
| sendWhatsAppMessage() | 1881 | Copia msg + abre wa.me | - |
| openWhatsAppNotificationModal() | 1900 | Gera template + abre WA | Auto-abre (BUG CK-010) |
| formatOSNumber() | 1937 | Formata para exibicao | - |
| escapeHtml() | 1956 | Sanitiza XSS | - |

### 3.2. Autenticacao (L1966-2230)
| Funcao | Linha | Proposito |
|--------|-------|-----------|
| switchAuthMode() | 1974 | Alterna aba Supabase/PIN |
| unlockAdminCockpit() | 2036 | Desbloqueia UI e carrega dados |
| checkAdminAuthSession() | 2074 | Verifica sessao Supabase/PIN |
| handleAdminEmailLogin() | 2106 | Login email+senha via Supabase Auth |
| handleAdminPinLogin() | 2176 | Login via PIN master (982601) |
| handleAdminLogout() | 2206 | Sign out |

### 3.3. Financeiro DRE (L2535-2738)
| Funcao | Linha | Bug? |
|--------|-------|------|
| renderFinancialDashboard() | 2535 | CK-008: le contract_value em vez de total_budget |
| updateBreakevenSimulator() | 2716 | OK |

### 3.4. Kanban OS (L2739-2870)
| Funcao | Linha | Bug? |
|--------|-------|------|
| renderKanbanBoard() | 2739 | CK-003: Entregue/Cancelado no Pronto |

### 3.5. Estoque PDV (L2878-3470)
| Funcao | Linha | Supabase? | Bug? |
|--------|-------|-----------|------|
| renderPOSGrid() | 2920 | NAO | - |
| processPOSCheckout() | 3161 | NAO | CK-005: sem baixa cloud |
| renderInventoryCatalogTable() | 3262 | NAO | - |
| handleSaveNewProduct() | 3385 | NAO | CK-006: so localStorage |

### 3.6. Software (L3545-3960)
| Funcao | Linha | Supabase? | Bug? |
|--------|-------|-----------|------|
| renderSoftwareProjectsDashboard() | 3571 | NAO | - |
| handleSaveNewSoftwareProject() | ~3760 | RPC com null | CK-007 |
| openSoftwareProjectDetail() | 3779 | NAO | - |

### 3.7. MSP (L3960-4535)
| Funcao | Linha | Supabase? | Bug? |
|--------|-------|-----------|------|
| renderMSPDashboard() | 4013 | NAO | - |
| handleSaveNewMSPTicket() | 4363 | NAO | CK-009: sem Supabase |

### 3.8. Intake OS (L4535-4763)
| Funcao | Linha | Supabase? |
|--------|-------|-----------|
| handleSaveIntake() | 4549 | SIM rpc_create_work_order_atomic |
| openOSDetailModal() | 4648 | - |
| advanceOSStatus() | 4729 | SIM .update() |

### 3.9. Orcamento (L4766-4995)
| Funcao | Linha | Supabase? |
|--------|-------|-----------|
| openBudgetModal() | 4766 | - |
| handleSaveBudgetFromModal() | 4891 | SIM rpc_save_budget_atomic |

### 3.10. Clientes CRM (L4996-5710)
| Funcao | Linha | Supabase? | Bug? |
|--------|-------|-----------|------|
| handleSaveClient() | 4996 | NAO | CK-004: sem Supabase |
| openClientDetailModal() | 5181 | - | - |
| renderClientsTable() | 5281 | - | - |

### 3.11. Impressao (L5024-5112)
| Funcao | Linha |
|--------|-------|
| printThermalDeviceLabel() | 5024 |
| printThermalCustomerReceipt() | 5064 |

### 3.12. Scanner (L5310-5475)
| Funcao | Linha | Bug? |
|--------|-------|------|
| handleUniversalBarcodeScan() | 5320 | CK-011: busca barcode em vez de ean |

---

## 4. FUNCOES DO PORTAL (portal.html) - MAPA COMPLETO

| Funcao | Linha | Bug? |
|--------|-------|------|
| getSupabase() | 856 | - |
| formatOSNumber() | 870 | - |
| escapeHtml() | 890 | - |
| formatChecklistHTML() | 901 | - |
| setStepVisual() | 962 | - |
| updateMobileStickyBar() | 1005 | - |
| renderWorkOrderData() | 1021 | PT-001, PT-002 |
| renderPhotoGallery() | 1519 | - |
| switchPayMethod() | 1808 | - |
| openAsaasPaymentModal() | 1829 | - |
| copyAsaasPixCode() | 1923 | PT-003 |
| processAsaasCardPayment() | 2031 | - |
| submitTrackingForm() | 2053 | - |
| renderSoftwareProjectData() | 2115 | - |
| openHomologationModal() | 2256 | - |
| setupPortalRealtime() | 2357 | - |
| downloadWarrantyPDF() | 2616 | - |
| handlePortalSaveTicket() | 2708 | PT-005: sem Supabase |

---

## 5. RPCs SUPABASE (Backend PostgreSQL)

| RPC | Parametros | Proposito | Chamada de |
|-----|-----------|-----------|------------|
| rpc_create_work_order_atomic | p_client_name, p_client_whatsapp, p_service_type, p_device_brand, p_device_model, p_reported_defect, p_pickup_fee, p_items, p_device_serial, p_device_access_pin | Cria OS + Cliente atomicamente | handleSaveIntake() |
| rpc_save_budget_atomic | p_os_number, p_work_order_id, p_service_type, p_technical_diagnosis, p_total_labor, p_total_parts, p_items, p_status | Salva orcamento + itens | handleSaveBudgetFromModal() |
| rpc_update_work_order_budget | p_os_number, p_service_type, p_diagnosis, p_items | Fallback de orcamento | handleSaveBudgetFromModal() (fallback) |
| rpc_track_work_order | p_os_number, p_phone | Busca OS no portal | submitTrackingForm() |
| rpc_track_work_order_by_number | p_os_number | Busca apenas por numero | submitTrackingForm() |

---

## 6. TABELAS SUPABASE

### Core
- clients: CRM unificado (B2C/B2B)
- work_orders: Ordens de Servico
- work_order_items: Itens de peca/mao de obra vinculados a OS
- work_order_photos: Fotos do checklist

### Estoque/PDV
- inventory_products: Catalogo de produtos
- inventory_movements: Kardex de movimentacoes
- pos_sales: Vendas PDV
- pos_sale_items: Itens de cada venda

### Software
- software_projects: Projetos web/software
- software_milestones: Marcos de pagamento 50/50
- software_timesheet: Registros de horas

### MSP
- msp_contracts: Contratos de suporte gerenciado
- msp_devices: Parque de maquinas do cliente
- msp_tickets: Chamados de suporte
- msp_ticket_messages: Mensagens do ticket
- msp_visits: Visitas preventivas agendadas
- msp_snitch: Dead Man Snitch (monitoramento)

### Financeiro
- financial_ledger: Lancamentos contabeis (DRE)
- nps_surveys: Pesquisa de satisfacao

---

## 7. INTEGRACOES EXTERNAS

| Servico | Proposito | Status |
|---------|-----------|--------|
| Supabase | Backend PostgreSQL, Auth, Realtime, RPC | Integrado |
| WhatsApp API | Envio de mensagens via wa.me link | Integrado |
| Asaas | Cobranca Pix e Cartao (sandbox) | Parcial |
| Telegram | Notificacoes (CSP permite) | Nao implementado |
| QRious | Geracao de QR Code para Pix | Integrado |
| Lucide Icons | Icones SVG | Integrado |

---

## 8. BUGS CONSOLIDADOS (21 bugs encontrados em 2026-08-30)

### Severidade CRITICO (4)
| ID | Modulo | Resumo |
|----|--------|--------|
| CK-004 | CRM | handleSaveClient() nao sincroniza com Supabase |
| CK-005 | PDV | processPOSCheckout() nao faz baixa em cloud |
| CK-006 | Estoque | handleSaveNewProduct() so grava em localStorage |
| CK-009 | MSP | handleSaveNewMSPTicket() nao persiste em Supabase |

### Severidade ALTO (6)
| ID | Modulo | Resumo |
|----|--------|--------|
| CK-001 | Status | advanceOSStatus(Testes_QA) - nomenclatura errada |
| CK-002 | Status | Orcamento_Aguardando_Aprovacao nao existe no select HTML |
| CK-007 | Software | RPC chamada com p_client_id: null |
| CK-011 | Scanner | Busca por barcode em vez de ean |
| PT-001 | Portal | hasBudget avanca Triagem para Orcamento sem status explicito |
| LP-002 | Landing | Imagem Open Graph ausente |

### Severidade MEDIO (5)
| ID | Modulo | Resumo |
|----|--------|--------|
| CK-003 | Kanban | Entregue/Cancelado caem na coluna Pronto |
| CK-008 | DRE | Le contract_value em vez de total_budget |
| PT-002 | Portal | Classificacao de mao de obra inconsistente na tabela visual |
| PT-003 | Portal | copyAsaasPixCode() catch mostra sucesso em vez de erro |
| LP-004 | Assets | ~7MB de imagens nao utilizadas |

### Severidade BAIXO (6)
| ID | Modulo | Resumo |
|----|--------|--------|
| CK-010 | WhatsApp | Modal auto-abre WA sem preview |
| PT-004 | Portal | Peca Encomendada com valor R exibe visual errado |
| PT-005 | Portal | Ticket de suporte e mockup frontend |
| LP-001 | Landing | main.js nao importado |
| LP-003 | Vercel | Falta rewrites para /os/:id e /t/:token |
| LP-005 | Docs | SPECIFICATION.md desatualizado |

---

## 9. DESIGN SYSTEM

| Elemento | Valor |
|----------|-------|
| Padrao Visual | Neobrutalismo Tech / Industrial |
| Cor Fundo | #0a0a0c (Carbon Dark) |
| Cor Primaria | #ccff00 (Lime / Verde Fosforo) |
| Cor Secundaria | Escala Zinc (zinc-800, zinc-900) |
| Tipografia Titulos | Inter (Extrabold-Black) |
| Tipografia Mono | JetBrains Mono |
| Bordas | Quinas retas, border-2 border-zinc-800 |
| Sombras | Hard-Shadow sem blur |
| Icones | Lucide Icons via CDN (unpkg) |

---

## 10. REGRAS PARA AGENTES FUTUROS

1. SEMPRE leia este documento antes de fazer qualquer alteracao
2. NUNCA edite apenas 1 arquivo da triade - edite o mestre e copie para os aliases
3. SEMPRE rode fast_syntax_check.js e super_audit_runner.py antes de commitar
4. SEMPRE verifique hash de paridade entre os arquivos da triade apos edicoes
5. Ao criar novo status: atualizar enum SQL + select HTML + kanban board + portal stepper
6. Ao criar nova RPC: documentar aqui na Secao 5
7. Ao adicionar persistencia Supabase: atualizar a coluna Supabase na Secao 3
