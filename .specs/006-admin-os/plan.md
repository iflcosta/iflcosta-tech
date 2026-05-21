# Plan: Admin OS & Portal de Rastreamento Avançado

**Feature:** `006-admin-os` (incluindo `006-admin-os-tracking-upgrade`)
**Spec:** [spec.md](./spec.md)
**Status:** Em Execução — backend e admin concluídos, portal público pendente
**Criada:** 2026-05-20
**Atualizada:** 2026-05-21
**Depende de:** `005-admin-crm` (customers) · `004-admin-auth`
**Bloqueia:** `007-admin-inventory`

---

## 1. Decisões de Arquitetura

### 1.1 Stack

| Critério | Decisão |
|----------|---------|
| Renderização | Zero-Build: HTML estático + JS ES Modules |
| API | Vercel Edge Functions em `api/admin/os/` |
| Banco | Supabase (PostgreSQL + Storage + RLS) |
| Portal público | Sem autenticação — acesso por `tracking_token` UUID de alta entropia |
| Segurança de dados | View de segurança SQL + higienização na API + RLS anônimo somente SELECT |

### 1.2 Estrutura de Arquivos

```
admin/os/
├── index.html                  # /admin/os (listagem)
└── detalhes.html               # /admin/os/detalhes?id=UUID

rastrear/
└── index.html                  # /rastrear?token=UUID (público)

api/admin/os/
├── index.js                    # GET (lista) + POST (cria OS)
├── status.js                   # POST (transição de status + public_notes)
└── tracking.js                 # GET público por tracking_token

assets/js/admin/
├── os.js                       # Lógica da listagem de OS
└── os-detalhes.js              # Lógica da ficha da OS

assets/js/
└── rastrear.js                 # Lógica do portal público do cliente

supabase/migrations/
├── 2026_05_20_create_os.sql              # Tabelas base (repairs, histórico, fotos, checklist)
├── 2026_05_20_create_service_orders.sql  # Triggers PL/pgSQL de status e garantia
└── 2026_05_21_create_tracking_upgrade.sql # Colunas extras + view pública + RLS
```

---

## 2. Banco de Dados

### 2.1 Tabelas Base (`2026_05_20_create_os.sql`)

**`public.repairs`** (Ordem de Serviço):
- `id` UUID PK, `customer_id` FK, `tracking_token` UUID UNIQUE DEFAULT
- `equipamento` JSONB (`{ tipo, marca, modelo, serial }`)
- `problema_reportado`, `laudo` TEXT
- `status` VARCHAR CHECK enum (rascunho → diagnóstico → aguardando_aprovacao → aprovado → aguardando_peca → em_conserto → pronto → entregue | cancelado)
- `prazo_prometido` TIMESTAMPTZ, `valor_cobrado`, `valor_custo_pecas`, `forma_pagamento`
- `garantia_dias` INT DEFAULT 90, `garantia_ate` TIMESTAMPTZ
- `garantia_de` UUID FK self (OS pai de garantia)
- `is_custom_pc` BOOLEAN DEFAULT FALSE *(tracking upgrade)*
- `payment_status` VARCHAR DEFAULT 'pendente' *(tracking upgrade)*
- `os_number` VARCHAR UNIQUE *(tracking upgrade — gerado por trigger)*
- `digital_warranty_code` VARCHAR *(tracking upgrade — gerado por trigger)*

**`public.os_status_history`**:
- `id`, `os_id` FK, `status`, `entered_at`, `exited_at`, `duration_seconds`
- `public_notes` TEXT *(tracking upgrade — notas exibidas ao cliente)*
- `private_notes` TEXT *(tracking upgrade — notas internas)*

**`public.repair_photos`**: `id`, `repair_id`, `url`, `tipo` (antes/durante/depois)

**`public.repair_checklist_items`**: `id`, `repair_id`, `label`, `checked` BOOLEAN, `order`

### 2.2 Triggers PL/pgSQL (`2026_05_20_create_service_orders.sql`)

**`handle_os_status_transition`**: Ao atualizar `status` em `repairs`:
1. Fecha o registro ativo em `os_status_history` preenchendo `exited_at` e calculando `duration_seconds`
2. Insere novo registro com o novo status e `entered_at = NOW()`
3. Se `status = 'entregue'`, calcula e preenche `garantia_ate = NOW() + garantia_dias`

### 2.3 Tracking Upgrade (`2026_05_21_create_tracking_upgrade.sql`)

**Trigger `generate_os_metadata`** (BEFORE INSERT em `repairs`):
- Gera `os_number` sequencial anual: `OS-{YYYY}-{seq:04d}`
- Gera `digital_warranty_code`: `WARR-{YYYY}-{6 hex chars aleatórios}`

**View `public.view_public_os_tracking`**:
- Seleciona colunas permitidas de `repairs` JOIN `customers`
- Aplica máscaras LGPD: apenas primeiro nome do cliente, serial mascarado `ABCD****EF`
- **Não inclui:** custo de peças, markup, dados de contato completos, notas privadas

**RLS público:**
- `SELECT` anônimo na view restrito por `tracking_token`
- `SELECT` anônimo em `os_status_history` restrito por `os_id` com token válido
- Zero permissão de mutação para `anon`

---

## 3. APIs Edge Functions

### `GET /api/admin/os/index.js`

Parâmetros: `status`, `search` (cliente/equipamento/serial), `atrasado` (bool), `page`, `limit`

Retorna: lista de OS com cliente, equipamento, status badge, prazo, valor, indicador de atraso

### `POST /api/admin/os/index.js`

Body: `{ customer_id, equipamento: { tipo, marca, modelo, serial }, problema_reportado, prazo_prometido, valor_cobrado?, is_custom_pc?, payment_status? }`

Cria OS em `rascunho`. Trigger gera `os_number`, `digital_warranty_code` e `tracking_token`.

### `POST /api/admin/os/status.js`

Body: `{ os_id, new_status, public_notes?, private_notes?, notes? }`

Valida transições de máquina de estados. Grava `public_notes` e `private_notes` no `os_status_history`.

Transições válidas:
```
rascunho → diagnóstico
diagnóstico → aguardando_aprovacao | cancelado
aguardando_aprovacao → aprovado | cancelado
aprovado → aguardando_peca | em_conserto
aguardando_peca → em_conserto | cancelado
em_conserto → pronto
pronto → entregue
```

### `GET /api/admin/os/tracking.js` (Público)

Parâmetro: `?token=UUID`

1. Consulta `view_public_os_tracking` com `tracking_token = token`
2. Consulta `os_status_history` (somente colunas públicas: `status`, `entered_at`, `exited_at`, `duration_seconds`, `public_notes`)
3. Consulta `inventory_movements` de saída vinculados à OS para lista de peças (apenas `nome`, `qty`, `categoria` — sem `custo_unitario`)
4. Retorna payload higienizado. Nunca retorna: `private_notes`, `custo_unitario`, `markup`, dados completos de contato do cliente

---

## 4. Frontend Admin

### 4.1 Listagem de OS (`/admin/os`)

- Cards em mobile com badge de status HSL dinâmico
- Tabela em desktop com colunas: Cliente, Equipamento, Status, Prazo, Valor, Ações
- Filtros: status (multi-select), atrasadas (destaque vermelho pulsante)
- Busca: cliente, equipamento, serial
- Botão "Nova OS" → modal com seletor de cliente + form do equipamento

### 4.2 Ficha da OS (`/admin/os/detalhes?id=UUID`)

**Seções implementadas:**
- Header: número da OS (`os_number`), cliente (link), equipamento, status atual com badge
- **Controles de Upgrade:** switch `🖥️ Custom PC`, seletor de Situação Financeira (`payment_status`)
- Máquina de estados: seletor de novo status + textarea de **Nota Técnica Pública** (`public_notes`) + notas privadas
- Seção Fotos: upload com compressão client-side (canvas, max 1920px, JPEG q=80), galeria com lightbox
- Seção Checklist: presets por tipo (celular: bateria/wifi/câmera/alto-falante; PC: boot/drivers/antivírus) + itens customizados
- Seção Valores: valor cobrado, custo calculado de peças, lucro e margem bruta real-time (apenas admin)
- Seção Garantia: dias, data calculada, link para OS pai se garantia

---

## 5. Portal Público do Cliente (`/rastrear`) — **PENDENTE**

Esta é a única parte ainda não implementada da Feature 006.

### 5.1 Fluxo

1. Cliente recebe link via WhatsApp: `https://iflcosta.tech/rastrear?token=UUID`
2. JS lê o token da query string
3. `fetch(/api/admin/os/tracking?token=UUID)` → payload sanitizado
4. Renderiza interface mobile-first premium

### 5.2 Componentes da Interface

**Header de Identificação:**
- Número da OS em destaque (`#OS-2026-0045`)
- Saudação com primeiro nome do cliente (LGPD)
- Dados do equipamento com serial mascarado
- Badge pulsante `🖥️ CUSTOM PC` se `is_custom_pc = true`

**Status Ativo:**
- Card glassmorphic com o status atual em destaque
- Contador de tempo ativo: "Há X horas e Y minutos nesta etapa" (atualizado a cada 60s via `setInterval`)

**Timeline de Status:**
- Lista vertical com marcadores (check verde = concluído, pulse violeta = ativo, cinza = futuro)
- Cada etapa exibe: label do status, data/hora de entrada, duração se concluído
- Nota Técnica Pública (`public_notes`) em destaque itálico com ícone 💡

**Módulo Condicional de Peças/Hardware:**
- Se `is_custom_pc = false`: tabela limpa de peças de reposição (nome + qty, sem preços)
- Se `is_custom_pc = true`: grid de cards de hardware por categoria (CPU, GPU, RAM, SSD, Motherboard) com specs detalhadas e badges de estágio

**Garantia Digital & Financeiro:**
- Código de garantia copiável (`digital_warranty_code`)
- Prazo de validade (`warranty_dias` dias)
- Badge discreto de situação de pagamento

**CTA WhatsApp:**
- Botão fixo no rodapé abrindo `wa.me/5511919691542` com mensagem contextualizada da OS

### 5.3 Design System

```css
/* Fundo base */
background: linear-gradient(135deg, hsl(222, 47%, 4%) 0%, hsl(250, 47%, 8%) 100%);

/* Glass container */
.glass {
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1.25rem;
}

/* Status colors (HSL dinâmico) */
--status-ativo: hsl(260, 80%, 65%);   /* violeta */
--status-pronto: hsl(142, 70%, 45%);  /* verde */
--status-espera: hsl(32, 95%, 60%);   /* âmbar */
```

---

## 6. Testes Playwright (`tests/admin-os.spec.js`)

### Testes já implementados (12/12 passando):
- T01 Listagem · T02 Filtro · T03 Criar OS · T04 Ficha · T05 Margens
- T06 Checklist · T07 Transição · T08 LGPD nome · T09 LGPD serial
- T10 Timeline · T11 WhatsApp link · T12 Segurança de dados

### Testes a adicionar para o portal novo (pendentes):
- T13 — Portal exibe `os_number` legível no cabeçalho
- T14 — `public_notes` aparecem na timeline quando cadastradas pelo admin
- T15 — Layout Custom PC renderiza grid de hardware quando `is_custom_pc = true`
- T16 — Layout Clássico renderiza lista de peças simples quando `is_custom_pc = false`
- T17 — Garantia digital exibe código copiável com botão funcional
- T18 — Badge de `payment_status` exibe texto correto para cada enum

---

## 7. Definição de Pronto

- [x] Migrations `2026_05_20_create_os.sql` + `2026_05_20_create_service_orders.sql` aplicadas
- [x] Migration `2026_05_21_create_tracking_upgrade.sql` aplicada (os_number, view pública, RLS)
- [x] APIs `index.js`, `status.js`, `tracking.js` implementadas e validadas
- [x] UI admin (`os/index.html`, `os/detalhes.html`, `os.js`, `os-detalhes.js`) completa com upgrade
- [x] Playwright admin (T01–T12) passando 12/12
- [ ] Portal público `/rastrear` (HTML + JS) com glassmorphism HSL, timeline com notas, Showcase Custom PC, garantia copiável, badges financeiros
- [ ] Playwright portal (T13–T18) passando 6/6
