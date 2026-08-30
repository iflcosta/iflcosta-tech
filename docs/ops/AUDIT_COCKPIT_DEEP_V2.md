# Auditoria Completa: Cockpit Administrativo (admin.html)

## 1. Maquina de Estados de OS

BUG-CK-001: Mapeamento de Status do Kanban Divergente (Teste_Estresse_QA)
- Arquivo: admin.html, Linha: 4703 / 1449
- Funcao: renderDetailActionButtons() e advanceOSStatus()
- Severidade: ALTO
- Descricao: O botao avanca o status invocando advanceOSStatus('Testes_QA'). Na select da OS, o valor esperado e Teste_Estresse_QA.
- Causa Raiz: Inconsistencia de nomenclatura string na UI contra a chave da funcao.
- Correcao: Alterar a chamada para advanceOSStatus('Teste_Estresse_QA').

BUG-CK-002: Status Invalido em Orcamento (Orcamento_Aguardando_Aprovacao)
- Arquivo: admin.html, Linha: 4935
- Funcao: handleSaveBudgetFromModal()
- Severidade: ALTO
- Descricao: O metodo define status para Orcamento_Aguardando_Aprovacao e propaga para o RPC. Este status NAO consta no select da UI.
- Causa Raiz: Novo status introduzido sem alterar os_status_enum e Select HTML.
- Correcao: Alinhar enum SQL/UI com Orcamento_Aguardando_Aprovacao.

## 2. Kanban Board

BUG-CK-003: Renderizacao Incorreta de OS Finalizadas (Entregue/Cancelado)
- Arquivo: admin.html, Linha: 2843
- Funcao: renderKanbanBoard()
- Severidade: MEDIO
- Descricao: OSs com status Cancelado ou Entregue ficam na coluna Pronto (else final).
- Correcao: Adicionar else if (s.includes('pronto')) e filtrar status finalizados.

## 3. Clientes/CRM

BUG-CK-004: Falta de Sincronizacao de CRM para o Supabase
- Arquivo: admin.html, Linha: ~5018
- Funcao: handleSaveClient()
- Severidade: CRITICO
- Descricao: Novo cliente e persistido apenas localmente. Nenhuma insercao Supabase.
- Correcao: Incluir chamada client.from('clients').insert(...).

## 4. Estoque/PDV

BUG-CK-005: PDV (Checkout) nao efetua baixa no Estoque em Cloud
- Arquivo: admin.html, Linha: ~3184
- Funcao: processPOSCheckout()
- Severidade: CRITICO
- Descricao: Estoque subtraido apenas da lista em memoria.
- Correcao: Adicionar RPC rpc_pos_checkout.

BUG-CK-006: Criacao de Produto orfao (Somente LocalStorage)
- Arquivo: admin.html, Linha: ~3431
- Funcao: handleSaveNewProduct()
- Severidade: CRITICO
- Descricao: Produto inserido salvo somente no localStorage.
- Correcao: Adicionar supabase.from('inventory').insert().

## 5. Software

BUG-CK-007: Criacao de Projeto de Software Falha com Null
- Arquivo: admin.html, Linha: ~3760
- Funcao: handleSaveNewSoftwareProject()
- Severidade: ALTO
- Descricao: RPC chamada com p_client_id: null, sem p_client_name e p_client_whatsapp.
- Correcao: Enviar dados literais do cliente para o RPC.

BUG-CK-008: Motor 2 do DRE lendo variavel Inexistente
- Arquivo: admin.html, Linha: 2576
- Funcao: renderFinancialDashboard()
- Severidade: MEDIO
- Descricao: Funcao usa p.contract_value mas a propriedade alimentada e total_budget.
- Correcao: Atualizar para parseFloat(p.total_budget || ...).

## 6. MSP

BUG-CK-009: Tickets MSP sem persistencia Supabase
- Arquivo: admin.html, Linha: ~4404
- Funcao: handleSaveNewMSPTicket()
- Severidade: CRITICO
- Descricao: Registro do chamado so existe via saveMSPStorage() (localStorage).
- Correcao: Integrar RPC de ingestao de Ticket MSP.

## 7. WhatsApp

BUG-CK-010: Fluxo Assincrono Bloqueador (Auto-Open)
- Arquivo: admin.html, Linha: 1934
- Funcao: openWhatsAppNotificationModal()
- Severidade: BAIXO
- Descricao: Modal invoca IMEDIATAMENTE sendWhatsAppMessage, forcando abertura do WhatsApp.
- Correcao: Remover chamada automatica e colocar no botao Enviar Agora.

## 8. Scanner/Barcode

BUG-CK-011: Busca EAN no PDV em Propriedade Inexistente
- Arquivo: admin.html, Linha: 5322
- Funcao: handleUniversalBarcodeScan()
- Severidade: ALTO
- Descricao: Scanner busca p.barcode === code, mas a definicao usa p.ean.
- Correcao: Alterar lookup para p.ean === code.
