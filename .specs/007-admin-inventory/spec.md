# Spec: Admin Inventory (estoque + Custom PC builder)

**Feature:** `007-admin-inventory`
**Status:** Resumida (a expandir após 006 mergeado)
**Criada:** 2026-05-19
**Depende de:** `006-admin-os` (OS consome peças) · `004-admin-auth`
**Bloqueia:** `009-copilot-ia` (copilot consulta estoque)

---

## 1. Contexto

Iago vende e instala três tipos de coisa:
1. **Peças de reparo** — tela de celular, bateria, conector de carga, SSD.
2. **Acessórios** — película, capa, cabo, fonte.
3. **Componentes de Custom PC** — CPU, GPU, RAM, SSD M.2, placa-mãe, fonte.

Sem controle, Iago perde dinheiro: vende peça que não tem (atrasa OS), esquece de cobrar markup correto, não sabe margem real. Hoje vive em planilha.

Esta feature entrega: catálogo de produtos, controle de movimentação (entrada/saída ligada a OS), alerta de mínimo, e **builder de Custom PC** (pré-selecionar componentes pra cotação rápida).

---

## 2. Objetivos

1. **Cadastrar produto em ≤ 30s** — nome, categoria, custo, markup → preço calculado.
2. **Saber estoque em 1 toque** — listagem mostra qty atual, alerta se baixo.
3. **Movimentação automática via OS** — quando OS consome peça, qty decrementa.
4. **Custom PC builder funcional** — selecionar componentes pré-cadastrados, validar compatibilidade básica (CPU socket = motherboard socket), gerar orçamento.
5. **Margem real visível** — por produto, por categoria, por mês.

---

## 3. Cenários principais

### A. Compra de 10 telas de iPhone 12
Iago recebe peças do fornecedor. Abre `/admin/estoque/movimento` → "Entrada" → produto "Tela iPhone 12" → qty 10, custo unitário R$ 120, NF. Salva. Estoque agora tem 10 telas com custo médio.

### B. OS consome peça
Em `/admin/os/{id}` (feature 006), Iago adiciona peça "Tela iPhone 12". Sistema lista estoque atual (8), permite usar 1. Ao salvar OS como `entregue`, sistema decrementa estoque automaticamente. Custo da peça vira `valor_custo_peças` da OS.

### C. Alerta de estoque baixo
Configurado: tela iPhone 12 → mínimo 3. Quando qty cai pra 2, listagem mostra badge vermelho. Dashboard do admin (feature 004) mostra card "Estoque baixo: 1 item".

### D. Custom PC builder
João quer PC gamer R$ 4500. Iago abre `/admin/estoque/custom-pc-builder` → seleciona preset "Gamer R$ 4500" → componentes pré-selecionados (Ryzen 5 5600, RX 7600, 16GB, SSD 1TB, etc.) → ajusta o que quiser → vê total. Botão "Gerar orçamento" cria OS rascunho ou exporta texto pra WhatsApp.

### E. Margem do mês
Iago abre `/admin/estoque/relatorios` → vê:
- Total vendido em peças: R$ 3.200
- Custo de peças: R$ 1.800
- Margem bruta: R$ 1.400 (43%)
- Top 5 produtos por margem.

---

## 4. Requisitos Funcionais (resumidos)

### Schema

- **RF-1.** Tabela `products`: id, sku (text uniq nullable), nome, categoria (enum: peça/acessório/componente_pc), subcategoria (text), marca, modelo, custo_atual, preço_venda, markup_pct (computed), qty_atual (computed via movimentos), qty_minima, fornecedor (jsonb), specs (jsonb — pra componentes PC), is_active, created_at, audit fields.
- **RF-2.** Tabela `inventory_movements`: id, product_id FK, tipo (entrada/saída/ajuste), qty, custo_unitario (snapshot), repair_id (FK nullable, se saída por OS), nf (text nullable), observacao, created_at, actor.
- **RF-3.** View ou function `product_stock(product_id)` que soma entradas − saídas.
- **RF-4.** Tabela `pc_build_presets`: id, nome, descrição, faixa_preco_min, faixa_preco_max, components (array de `{ category, suggested_product_id, qty }`), is_active.

### Catálogo `/admin/estoque/produtos`

- **RF-10.** Listagem com filtros: categoria, marca, em estoque, abaixo mínimo, ativo.
- **RF-11.** Busca por nome/sku/modelo.
- **RF-12.** Card de produto: foto (opcional, bucket `product-photos`), nome, qty atual, preço venda, custo atual, margem %.
- **RF-13.** CRUD completo. Soft delete.

### Movimentações `/admin/estoque/movimentos`

- **RF-20.** Form de entrada: produto, qty, custo unitário, NF, observação.
- **RF-21.** Form de ajuste: produto, qty (pode ser negativa), motivo (perda, devolução, contagem).
- **RF-22.** Saídas são automáticas via OS (feature 006).
- **RF-23.** Listagem cronológica filtrável por produto, tipo, faixa de data.

### Custom PC builder `/admin/estoque/custom-pc-builder`

- **RF-30.** Lista de presets (Gamer R$ 3k / Gamer R$ 4.5k / Workstation R$ 6k / Produtividade R$ 2.5k).
- **RF-31.** Selecionar preset → expande componentes sugeridos por categoria.
- **RF-32.** Cada slot (CPU, GPU, RAM, SSD, MB, fonte, gabinete, watercooler) pode ser trocado por outro produto da categoria.
- **RF-33.** Validação básica: CPU socket = MB socket (warning se mismatch). Esse check vem dos `specs` jsonb.
- **RF-34.** Total dinâmico atualiza em real-time. Mostra custo total + preço sugerido (com markup default 25%).
- **RF-35.** Botões: "Salvar como OS rascunho" (cria OS pra customer já selecionado) ou "Copiar pro WhatsApp" (texto formatado).

### Relatórios `/admin/estoque/relatorios`

- **RF-40.** Cards: total vendido (mês corrente), custo, margem bruta, % margem.
- **RF-41.** Tabela top 10 produtos por margem absoluta / margem %.
- **RF-42.** Curva de estoque dos últimos 30 dias (gráfico simples — `<canvas>` puro, sem chart.js).

---

## 5. Fora de Escopo

- ❌ Integração com NFe / ERP — manual nessa fase.
- ❌ Código de barras / scanner — usável depois.
- ❌ Marketplace online — Iago é serviço, não e-commerce.
- ❌ Custom PC builder com 3D preview — apenas seleção textual.
- ❌ Múltiplos fornecedores por produto com cotação — campo único basta.

---

## 6. Critérios de Pronto

- [ ] Tabelas `products`, `inventory_movements`, `pc_build_presets` com RLS + audit
- [ ] Bucket `product-photos` no Storage
- [ ] CRUD de produtos funciona em mobile
- [ ] Entrada de estoque registra movimento + atualiza qty
- [ ] Saída via OS decrementa qty e snapshot do custo
- [ ] Alerta de estoque baixo visível na listagem + dashboard
- [ ] Custom PC builder gera orçamento texto pro WhatsApp
- [ ] Relatórios mensais com cálculo correto
- [ ] Margem por produto computada e exibida

---

## 7. Notas para o plan.md

- Decidir: qty_atual como coluna materializada (denormalizada) ou computed via view? **Recomendação:** computed via function pra evitar drift. Cache em coluna se performance virar problema.
- Custo unitário: usar custo médio ponderado (CMP) ou snapshot por movimento? **Recomendação:** CMP. Padrão contábil.
- Specs de componentes PC: jsonb livre ou enum por categoria? **Recomendação:** jsonb com convenção documentada (campos `socket`, `tdp_w`, `vram_gb`, etc.).
- Validação de compatibilidade: regras hardcoded ou tabela `compatibility_rules`? **Recomendação:** hardcoded por enquanto (CPU↔MB socket), expandir se necessário.
- Gráfico de curva: `<canvas>` manual ou lib leve? **Recomendação:** manual, ~60 linhas, evita dependência.

**Próximo:** detalhar `plan.md` após `006-admin-os` operável.
