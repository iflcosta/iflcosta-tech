# Plan: Admin Inventory (estoque + Custom PC builder)

**Feature:** `007-admin-inventory`
**Status:** Em Planejamento
**Criada:** 2026-05-20
**Depende de:** `006-admin-os` · `004-admin-auth`

Este plano detalha a implementação da gestão de estoque integrada com as Ordens de Serviço (OS), relatórios financeiros de peças e o módulo interativo de Custom PC Builder, seguindo a diretriz de desenvolvimento **Zero-Build** com CSS HSL puro e Vanilla JavaScript.

---

## 1. Arquitetura de Banco de Dados

### 1.1 Tabelas no Supabase

Implementaremos a estrutura em `supabase/migrations/2026_05_20_create_inventory.sql`:

#### Tabela `public.products` (Catálogo de Itens)
```sql
CREATE TABLE IF NOT EXISTS public.products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku             VARCHAR(100) UNIQUE, -- Código SKU ou de barras (opcional)
    nome            VARCHAR(250) NOT NULL,
    categoria       VARCHAR(50) NOT NULL CHECK (categoria IN ('peça', 'acessório', 'componente_pc')),
    subcategoria    VARCHAR(100), -- Ex: "Tela", "Placa de Vídeo", "Cabo"
    marca           VARCHAR(100),
    modelo          VARCHAR(100),
    custo_atual     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (custo_atual >= 0),
    preco_venda     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (preco_venda >= 0),
    qty_atual       INTEGER NOT NULL DEFAULT 0, -- Atualizado automaticamente via trigger
    qty_minima      INTEGER NOT NULL DEFAULT 0 CHECK (qty_minima >= 0),
    fornecedor      JSONB DEFAULT '{}'::jsonb, -- { nome, telefone, cnpj }
    specs           JSONB DEFAULT '{}'::jsonb, -- { socket, ram_type, form_factor, watts }
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at      TIMESTAMP WITH TIME ZONE -- Soft delete
);
```

#### Tabela `public.inventory_movements` (Histórico e Log de Movimentações)
```sql
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saída', 'ajuste')),
    qty             INTEGER NOT NULL CHECK (qty > 0), -- Quantidade absoluta
    custo_unitario  NUMERIC(10,2) NOT NULL CHECK (custo_unitario >= 0), -- Snapshot do custo no momento do movimento
    repair_id       UUID REFERENCES public.repairs(id) ON DELETE SET NULL, -- FK se associada a OS
    nf              VARCHAR(100), -- Nota Fiscal da entrada (opcional)
    observacao      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    actor           UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
```

#### Tabela `public.pc_build_presets` (Modelos de Custom PC Builder)
```sql
CREATE TABLE IF NOT EXISTS public.pc_build_presets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(150) NOT NULL UNIQUE,
    descricao       TEXT,
    faixa_preco_min NUMERIC(10,2),
    faixa_preco_max NUMERIC(10,2),
    components      JSONB NOT NULL, -- Array de { category: 'CPU', SUG_product_id: UUID, qty: 1 }
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 1.2 Triggers e Funções PL/pgSQL

Para garantir a integridade dos dados e evitar drifts, criaremos duas triggers essenciais:

#### 1. `handle_inventory_movement_stock` (Atualiza `qty_atual` em tempo real)
* **Ação:** AFTER INSERT OR UPDATE OR DELETE em `inventory_movements`.
* **Lógica:** Calcula a quantidade em estoque para o produto modificado com base no saldo de movimentos (Entradas como `+qty`, Saídas e Ajustes como `-qty`). Atualiza a coluna `qty_atual` correspondente na tabela `products`.

#### 2. `sync_repair_parts_cost` (Sincroniza custos da OS automaticamente)
* **Ação:** AFTER INSERT OR UPDATE OR DELETE em `inventory_movements`.
* **Lógica:** Se o movimento de saída estiver vinculado a um `repair_id`, soma o custo de todos os movimentos vinculados a essa OS (`SUM(qty * custo_unitario)`) e atualiza o campo `valor_custo_peças` correspondente em `repairs`. O banco de dados recalculará automaticamente a coluna de lucro (`valor_lucro = valor_cobrado - valor_custo_peças`).

---

## 2. API Endpoints (Vercel Edge Functions)

Criaremos endpoints dedicados sob a autenticação de administrador:

### 2.1 `/api/admin/inventory/products`
* `GET`: Lista produtos com paginação, busca e filtros (`categoria`, `status_baixo_estoque`, `is_active`).
* `POST`: Cadastra novos itens. Calcula markup sugerido se omitido.
* `PUT`: Atualiza propriedades do produto.
* `DELETE`: Aplica soft delete (`deleted_at = now()`).

### 2.2 `/api/admin/inventory/movements`
* `GET`: Histórico cronológico de movimentações, com filtro por data, tipo e produto.
* `POST`: Cria uma movimentação manual ("Entrada" de fornecedor ou "Ajuste" físico).

### 2.3 `/api/admin/inventory/presets`
* `GET`: Lista presets de computadores do builder.
* `POST`/`PUT`: Registra novos presets ou os atualiza.

---

## 3. Interfaces do Admin (Zero-Build Frontend)

Seguindo o design system premium e responsivo (dogma de viewports de 360px a 393px):

### 3.1 Painel de Estoque (`/admin/estoque/index.html`)
* **Visualização:** Tabela robusta no desktop e cartões de glassmorphism no mobile.
* **Componentes:**
  * Indicadores dinâmicos no topo (Custo Total em Estoque, Itens Abaixo do Mínimo, Categorias mais vendidas).
  * Lista de produtos com badges HSL estilizados para estoque baixo (Alerta visual vermelho se `qty_atual <= qty_minima`).
  * Botões de atalho: "Novo Produto", "Registrar Entrada", "PC Builder".
  * Lógica em `/assets/js/admin/estoque.js`.

### 3.2 Ficha de Movimentação (`/admin/estoque/movimento.html` ou Modal)
* Formulário unificado para lançar entradas (fornecedor, NF, custo unitário e quantidade) ou ajustes de perda/quebra.

### 3.3 Custom PC Builder (`/admin/estoque/builder.html`)
* **Interface:** Visualizador em slots para montar o computador passo a passo.
* **Slots fixos:** CPU, Placa-mãe, RAM, Armazenamento (SSD), Placa de Vídeo, Fonte, Gabinete, Refrigeração.
* **Lógica frontend:**
  * Permite selecionar um preset (ex: "Gamer Entrada R$ 3.500") que preenche automaticamente os slots.
  * O usuário pode alterar qualquer item do slot, exibindo opções compatíveis (com base no campo `specs.socket` do processador e da placa-mãe).
  * Exibe avisos em tempo real se soquetes forem incompatíveis (ex: Intel LGA1700 na placa-mãe AM5).
  * Totaliza automaticamente em tempo real (custo total + preço sugerido com margem e markup).
  * **Ações de CTA:**
    * "Gerar Orçamento": Cria OS rascunho com o checklist de peças anexado e direciona para a ficha.
    * "Enviar WhatsApp": Copia um texto refinado, formatado com emojis, para envio rápido ao cliente pelo WhatsApp do Iago Lopes.

---

## 4. Integração com a Ficha da OS (Feature 006)

Adicionaremos à ficha `/admin/os/detalhes` um bloco "Peças de Reposição":
* Um autocomplete dinâmico de produtos com `qty_atual > 0`.
* Ao adicionar uma peça na OS, o sistema grava em `inventory_movements` um registro de `saída` com `repair_id = os_id`.
* Ao remover uma peça da OS, remove o movimento de saída correspondente, devolvendo a peça ao estoque.
* Os cálculos de custos e lucros são instantaneamente atualizados de ponta a ponta.

---

## 5. Plano de Verificação e Testes

### 5.1 Testes Unitários e Banco de Dados
* Testar os triggers PL/pgSQL simulando:
  * Entradas sucessivas acumulando saldo correto.
  * Saídas decrementando estoque e gerando exceção se estoque ficar negativo (opcional, ou apenas permitir para não travar a OS, reportando aviso).
  * Recálculo do custo total de reparo na OS.

### 5.2 Testes E2E (Playwright)
Criação do arquivo `tests/admin-inventory.spec.js` validando:
* **T01 — Estoque:** Renderiza grid de produtos e mostra badge de estoque baixo.
* **T02 — Cadastro:** Abre formulário, valida obrigatoriedade de campos e insere produto com sucesso.
* **T03 — Movimentação:** Registra entrada manual e verifica incremento de saldo.
* **T04 — Integração OS:** Associa peça a uma OS e valida decremento no estoque e cálculo do valor de custo da OS.
* **T05 — Builder:** Seleciona preset de PC, troca placa de vídeo, confere total dinâmico e gera texto de orçamento para WhatsApp.
