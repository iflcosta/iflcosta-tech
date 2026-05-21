# Spec — Feature 010: Painel Financeiro

**Status:** Aprovado  
**Criado:** 2026-05-21  
**Autor:** Claude (revisado por Iago Lopes)  
**Depende de:** 006-admin-os (repairs + payment_status), 007-admin-inventory (inventory_movements)

---

## 1. Contexto

O sistema de admin já registra receita (`valor_cobrado`), custo de peças (`valor_custo_peças`), lucro (`valor_lucro`) e situação financeira (`payment_status`) em cada OS. Porém, não existe nenhuma tela que consolide esses dados em visão gerencial.

Iago opera solo e precisa saber, de relance: quanto entrou no mês, quanto lucrou, quem ainda deve, e se o negócio está crescendo. Hoje ele não tem essa visão sem exportar dados manualmente.

---

## 2. Objetivos

1. Dar visibilidade financeira do negócio em uma única tela, sem planilhas.
2. Identificar rapidamente OS com pagamento pendente (contas a receber).
3. Visualizar tendência de receita e lucro dos últimos 6 meses.
4. Não introduzir complexidade contábil — escopo estritamente operacional.

---

## 3. Cenários

**Cenário A — Fechamento do mês**  
Iago abre `/admin/financeiro/` no último dia do mês e vê: receita total, lucro bruto, quantas OS foram fechadas e qual o ticket médio. Filtra por "Este mês".

**Cenário B — Cobrar clientes**  
Iago vê a tabela "A Receber" com 3 OS pendentes. Clica em uma e vai direto para a OS para registrar o pagamento ou enviar mensagem no WhatsApp.

**Cenário C — Análise de tendência**  
Iago quer saber se o negócio cresceu nos últimos 6 meses. Olha o gráfico de barras de receita e lucro mês a mês.

---

## 4. Requisitos Funcionais

### RF01 — Cards de resumo (4 métricas)
| Card | Definição |
|------|-----------|
| Receita | `SUM(valor_cobrado)` das OS entregues no período |
| Lucro Bruto | `SUM(valor_lucro)` das OS entregues no período |
| A Receber | `SUM(valor_cobrado)` das OS ativas com `payment_status IN ('pendente','parcial')` |
| Ticket Médio | `AVG(valor_cobrado)` das OS entregues no período, excluindo R$ 0,00 |

### RF02 — Filtro de período
Opções: **Este mês** (padrão) · **Mês anterior** · **Este ano** · **Personalizado** (date range)

### RF03 — Tabela "A Receber"
Colunas: OS # · Cliente · Aparelho · Valor · Situação (Pendente/Parcial) · Ação (link para OS)  
Ordenação: maior valor primeiro  
Escopo: todas as OS ativas (não entregues/canceladas) com pagamento pendente ou parcial — sem filtro de período, pois é dívida acumulada.

### RF04 — Gráfico de tendência (últimos 6 meses)
- Barras agrupadas: Receita (azul) + Lucro (verde) por mês
- Eixo Y em R$, eixo X mês/ano abreviado
- Renderizado via `<canvas>` vanilla (sem biblioteca externa)
- Sempre mostra 6 meses independentemente do filtro de período

### RF05 — Navegação
- Link "Financeiro" no sidebar do admin (entre Estoque e próximo item)
- Card no dashboard (`admin/index.html`) mostrando receita do mês atual

---

## 5. Requisitos Não-Funcionais

- **Segurança:** endpoint usa `service_role` + validação de sessão (padrão do projeto)
- **Performance:** query única com agregação SQL-side; resposta < 500ms
- **Mobile:** layout responsivo 360px+; cards em coluna única no mobile
- **Zero build:** HTML + CSS tokens existentes + JS ES modules vanilla

---

## 6. Fora de Escopo

- Despesas fixas (aluguel, energia, ferramentas) — sem tabela de expenses
- NF-e / DAS / impostos — responsabilidade do contador
- Contas a pagar
- Fluxo de caixa projetado
- Exportação para CSV/PDF (pode vir em T012/T013 da feature)
- Múltiplos usuários / multi-tenant

---

## 7. Critérios de Pronto

- [ ] Página `/admin/financeiro/` carrega e exibe os 4 cards com dados reais
- [ ] Filtro de período altera os cards em tempo real
- [ ] Tabela A Receber lista OS com pagamento pendente/parcial com link funcional
- [ ] Gráfico de 6 meses renderiza corretamente em desktop e mobile
- [ ] Card no dashboard mostra receita do mês
- [ ] Sidebar tem link para Financeiro
- [ ] Validado em viewport 360px e 1280px

---

## 8. Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| OS sem `valor_cobrado` preenchido distorcem métricas | Alta (OS em rascunho) | Filtrar por `status = 'entregue'` para receita/lucro |
| `valor_lucro` desatualizado se peças foram adicionadas depois | Média | Exibir aviso inline se `valor_lucro` < 0 |
| Gráfico canvas não renderiza em alguns browsers antigos | Baixa | Fallback de texto com os valores |
