# Tasks: Admin Inventory (estoque + Custom PC builder)

**Feature:** `007-admin-inventory`
**Status:** Não Iniciada (Pronta para Desenvolvimento)
**Criada:** 2026-05-20
**Depende de:** `006-admin-os` · `004-admin-auth`

Este checklist organiza a execução em pequenas tarefas atômicas e testáveis.

---

## checklist de Desenvolvimento

### Fase 1 — Infraestrutura de Dados & API

- [x] **T001 [M] — Banco de Dados: Migração SQL e Schema**
  * **Critério de Aceite:** Criar `supabase/migrations/2026_05_20_create_inventory.sql` com tabelas `products`, `inventory_movements`, `pc_build_presets` com RLS habilitada.
  * **Políticas RLS:** Administrador autenticado tem acesso `ALL`. Usuários anônimos não têm leitura (`RESTRICTED` a anon, público bloqueado).

- [x] **T002 [L] — Triggers de Banco de Dados**
  * **Critério de Aceite:** Implementar trigger PL/pgSQL `handle_inventory_movement_stock` para atualizar `qty_atual` na tabela `products` e `sync_repair_parts_cost` para recalcular `valor_custo_peças` de `repairs` a partir de movimentos associados a `repair_id`.

- [x] **T003 [M] — API: CRUD de Produtos (`/api/admin/inventory/products.js`)**
  * **Critério de Aceite:** Endpoint Vercel Edge Function com suporte a `GET` (lista/busca/filtros), `POST` (inserir), `PUT` (editar), e `DELETE` (soft-delete). Validar autenticação do administrador.

- [x] **T004 [S] — API: Movimentação de Estoque (`/api/admin/inventory/movements.js`)**
  * **Critério de Aceite:** Endpoint `POST` para registrar movimentos manuais ("entrada", "ajuste") e `GET` para auditoria e histórico de estoque.

- [x] **T005 [S] — API: Presets do Builder (`/api/admin/inventory/presets.js`)**
  * **Critério de Aceite:** Endpoints `GET`, `POST` e `PUT` para gerenciar os modelos pré-definidos de computadores customizados.

---

### Fase 2 — Frontend Administrativo (Zero-Build)

- [x] **T006 [L] — UI: Catálogo de Estoque (`/admin/estoque/index.html` e `/assets/js/admin/estoque.js`)**
  * **Critério de Aceite:** Listagem de produtos responsiva premium (cards de glassmorphism em viewport 360-393px, tabela no desktop). Exibição de alertas visuais brilhantes em HSL (vermelho se `qty_atual <= qty_minima`).

- [x] **T007 [M] — UI: Lançamento de Movimentos (Modais no Estoque)**
  * **Critério de Aceite:** Modais modernos para inserção rápida de Entrada (NF, fornecedor, quantidade e custo unitário) e Ajuste de Estoque (perdas/contagens).

- [ ] **T008 [L] — Integração: Adicionar Peças à OS (`/admin/os/detalhes.html`)**
  * **Critério de Aceite:** Novo painel "Peças de Reposição" na ficha da OS. Autocomplete nativo de produtos com saldo positivo. Ao adicionar peça, grava movimento de saída e atualiza custo/lucro em real-time na tela da OS.

- [ ] **T009 [L] — UI: Custom PC Builder (`/admin/estoque/builder.html` e `/assets/js/admin/builder.js`)**
  * **Critério de Aceite:** Grid interativa dividida em slots para montagem do PC. Dropdowns dinâmicos que listam componentes do estoque por categoria.

- [ ] **T010 [M] — Builder: Validação de Soquetes e Compatibilidade**
  * **Critério de Aceite:** Lógica frontend que extrai o soquete da CPU e da Placa-mãe do JSON `specs` e exibe aviso chamativo de alerta em HSL se houver incompatibilidade.

- [ ] **T011 [S] — Builder: Orçamentos para WhatsApp e OS Rascunho**
  * **Critério de Aceite:** Botão para copiar texto amigável com emojis para o WhatsApp do Iago e botão "Gerar OS Rascunho" que abre uma OS pré-preenchida com os itens selecionados.

- [ ] **T012 [M] — UI: Relatórios Canvas (`/admin/estoque/relatorios.html`)**
  * **Critério de Aceite:** Painel com cartões de margem financeira e top produtos de margem, além de um gráfico de linha interativo em `<canvas>` nativo (sem libs externas) para curva de estoque.

---

### Fase 3 — Validação e Testes E2E

- [ ] **T013 [M] — Testes E2E no Playwright (`tests/admin-inventory.spec.js`)**
  * **Critério de Aceite:** Suite abrangente com 5+ testes pontuando listagem, cadastro, entrada manual de estoque, consumo de peças em OS com recálculo automático de margem, e geração de PC no Builder. Rodar `npx playwright test tests/admin-inventory.spec.js` obtendo 100% verde.
