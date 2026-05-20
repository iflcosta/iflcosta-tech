# Spec: Admin CRM (leads + customers)

**Feature:** `005-admin-crm`
**Status:** Resumida (a expandir após 004 mergeado)
**Criada:** 2026-05-19
**Depende de:** `004-admin-auth` · `003-lead-capture` (tabela leads)
**Bloqueia:** `006-admin-os`

---

## 1. Contexto

O Iago hoje gerencia clientes no Notion: nome, telefone, histórico de problemas, valor pago. Não escala — busca lenta, sem filtro de status, sem visão de pipeline.

Esta feature transforma a tabela `leads` (vinda da 003) em CRM básico operável solo, e cria a entidade `customers` (cliente confirmado). O fluxo:

1. **Lead chega** pelo formulário da landing → entra em `leads` com status `novo`.
2. **Iago triagem** pelo admin: vê lead → responde no WhatsApp manualmente (próximas features automatizam) → marca como `contatado`, `qualificado`, `convertido`, ou `perdido`.
3. **Conversão**: lead vira `customer`. Daqui pra frente OS, vendas e histórico ficam ligados ao customer.

---

## 2. Objetivos

1. **Listagem de leads em 1 toque** — abrir `/admin/leads`, ver todos, filtrar status.
2. **Conversão lead → customer em ≤ 30s** — clicar no lead, "Marcar como cliente", customer criado.
3. **Ficha de cliente única** — toda info num lugar: dados, histórico de OS, valor total, observações.
4. **Busca instantânea** — digitar nome/telefone, resultados em < 500ms.
5. **Mobile-first** — Iago opera no celular entre atendimentos.

---

## 3. Cenários principais

### A. Triagem do dia
Iago abre `/admin/leads`, vê 5 leads novos. Toca o primeiro: ficha mostra nome, serviço pedido, mensagem, timestamp, link WhatsApp. Toca "Responder no WhatsApp" → abre Evolution com mensagem template. Volta no admin, marca como "contatado".

### B. Lead vira cliente
Lead da Maria foi atendido — vai consertar o celular. Iago abre o lead, toca "Marcar como cliente". Modal: confirma dados (nome, telefone, opcionalmente CPF, endereço). Confirma. Lead status = `convertido`, customer criado, redireciona pra `/admin/clientes/{id}`.

### C. Busca por cliente existente
Cliente liga: "Iago, é a Maria do iPhone". Iago abre `/admin/clientes`, digita "Maria" → resultado em < 500ms. Toca → ficha completa: 2 OS anteriores, 1 em andamento, R$ 780 total.

### D. Edição rápida no celular
Customer ligou trocando endereço. Iago abre ficha no celular, toca campo endereço → input expande → salva. Toda mudança vai pro audit_log.

---

## 4. Requisitos Funcionais (resumidos)

### Tabelas Supabase

- **RF-1.** Reutilizar `leads` (já criada em 003). Adicionar campo `customer_id` (FK nullable) para ligar lead convertido.
- **RF-2.** Criar `customers`: id, created_at, nome, telefone (uniq), email, cpf (nullable), endereco (jsonb), tags (array text), observacoes (text), origem (id do lead), audit fields. RLS authenticated full.

### Listagem `/admin/leads`

- **RF-10.** Tabela responsiva (desktop) / cards (mobile). Colunas: nome, serviço, status, urgência, timestamp, ação rápida (WhatsApp).
- **RF-11.** Filtros: status (multi-select), serviço, faixa de data, urgência.
- **RF-12.** Busca textual no nome + telefone + mensagem.
- **RF-13.** Paginação infinita (load more).
- **RF-14.** Ações em lote: marcar status, deletar (com confirm).

### Ficha do lead

- **RF-20.** Painel lateral (desktop) ou tela cheia (mobile) com todos os campos do lead + timeline de mudanças de status.
- **RF-21.** Botão "Responder no WhatsApp" → abre `wa.me/{telefone}` com mensagem template ("Oi {nome}, sou o Iago…").
- **RF-22.** Botão "Marcar como cliente" → modal conversão.
- **RF-23.** Editar campos inline.

### Listagem `/admin/clientes`

- **RF-30.** Idem listagem de leads, mas para customers.
- **RF-31.** Indicador: nº de OS ativas, valor total gasto.
- **RF-32.** Filtros: tags, cidade, com OS ativa.

### Ficha do customer

- **RF-40.** Header: nome grande, telefone clicável (`tel:`), WhatsApp (`wa.me`), tags.
- **RF-41.** Seção "OS" — lista de ordens de serviço (vazia até feature 006), botão "Nova OS".
- **RF-42.** Seção "Histórico de leads" — todos os leads que viraram esse customer.
- **RF-43.** Seção "Observações" — textarea livre.
- **RF-44.** Botão deletar customer — confirma duas vezes, soft delete (campo `deleted_at`).

### Audit

- **RF-50.** Toda mutação grava em `audit_log` com `before`/`after` JSONs.

---

## 5. Fora de Escopo

- ❌ Funil/Kanban visual — listagem com filtros basta nessa fase.
- ❌ Pipeline com probabilidade/valor estimado.
- ❌ Integração com email marketing.
- ❌ Score de lead automático (talvez na 009 via IA).
- ❌ Exportar CSV — pode ser hotfix se necessário, não bloqueia.

---

## 6. Critérios de Pronto

- [ ] Tabela `customers` criada com RLS authenticated full + audit trigger
- [ ] Lead pode ser convertido em customer com 1 modal
- [ ] Busca por nome/telefone retorna em < 500ms até 1000 registros
- [ ] Mobile: listagem + ficha sem scroll horizontal em iPhone SE
- [ ] Toda mutação gera linha em `audit_log`
- [ ] Playwright smoke: listagem carrega + filtro + conversão
- [ ] Iago opera fluxo completo em iPhone real sem fricção

---

## 7. Notas para o plan.md

- Decidir: paginação infinita via Intersection Observer ou cursor com botão?
- Decidir: filtros via query string (deep link) ou state local?
- Avaliar índice composto `customers(telefone, deleted_at)` pra busca.
- Schema da `tags`: array text simples ou tabela `tags` + `customer_tags`? **Recomendação:** array text simples, YAGNI.
- Migration vai criar `customers` + ALTER `leads` adicionando `customer_id` FK.

**Próximo:** detalhar `plan.md` após `004-admin-auth` mergeado e Supabase RLS comprovadamente funcionando para `authenticated`.
