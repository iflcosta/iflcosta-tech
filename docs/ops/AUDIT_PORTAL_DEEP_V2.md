# Auditoria Completa do Portal do Cliente (portal.html)

**Status do BUG CONHECIDO:** 
Validado. O problema em que `Orcamento_Aguardando_Aprovacao` ativava `isApproved` (devido a substring "aprovac") **foi corrigido**. Atualmente o codigo verifica `rawStatus.includes("aprovado")` e tambem implementa o interceptador `!isWaitingApproval`.

---

BUG-PT-001: Falso Positivo na Validacao de Orcamento via Itens
- Arquivo: portal.html, Linha: 1073 e 1084
- Funcao: renderWorkOrderData()
- Severidade: ALTO
- Descricao: Se o equipamento estiver na fase de Triagem ou com status inicial vazio, mas ja possuir itens cadastrados (itemsList.length > 0), o portal avanca erroneamente para a etapa Orcamento, pulando a etapa 1 de Triagem.
- Causa Raiz: A variavel hasBudget retorna true quando ha itens na OS (mesmo sem aprovacao).
- Correcao Sugerida: Alterar a condicao de isOrcamento para exigir que o status seja validado explicitamente.

BUG-PT-002: Inconsistencia na Classificacao de Mao de Obra e Pecas (Renderizacao vs Soma)
- Arquivo: portal.html, Linha: 1474 e 1063
- Funcao: renderWorkOrderData()
- Severidade: MEDIO
- Descricao: Discrepancia nos calculos. A soma valida item_type === 'Labor' OU descricao contiver 'mao'. A tabela visual verifica APENAS item.item_type === 'Labor'.
- Correcao Sugerida: Padronizar o filtro na tabela visual.

BUG-PT-003: Falha Silenciosa Enganosa no Botao de Copia do Pix
- Arquivo: portal.html, Linha: 1941
- Funcao: copyAsaasPixCode()
- Severidade: MEDIO
- Descricao: Caso clipboard.writeText() falhe, o catch exibe mensagem de sucesso em vez de erro.
- Correcao Sugerida: Mudar mensagem do catch para alerta de erro ou fallback execCommand.

BUG-PT-004: Fluxo de Peca Encomendada Quebrado Sem Total Monetario
- Arquivo: portal.html, Linha: 1114 e 1072
- Funcao: renderWorkOrderData()
- Severidade: BAIXO
- Descricao: Se status for Peca_Encomendada mas valor for R, a condicional pula o fluxo cyan.
- Correcao Sugerida: Verificar status antes de bloquear pelo valor monetario.

BUG-PT-005: Ticket de Suporte e Apenas um Mockup Frontend
- Arquivo: portal.html, Linha: 2718
- Funcao: handlePortalSaveTicket()
- Severidade: BAIXO
- Descricao: Nenhuma chamada ao banco Supabase e feita na criacao de ticket.
- Correcao Sugerida: Conectar ao backend via getSupabase() e RPC.
