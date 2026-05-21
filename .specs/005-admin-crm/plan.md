# Plan: Admin CRM (leads + customers)

**Feature:** `005-admin-crm`
**Spec:** [spec.md](./spec.md)
**Status:** Concluído e em produção
**Criada:** 2026-05-19
**Depende de:** `004-admin-auth` · `003-lead-capture` (tabela `leads`)
**Bloqueia:** `006-admin-os`

---

## 1. Decisões de Arquitetura

### 1.1 Stack e Abordagem

| Critério | Decisão |
|----------|---------|
| Renderização | Zero-Build: HTML estático + JS ES Modules |
| Comunicação API | `fetch()` para Edge Functions no Vercel (`/api/admin/crm/*`) |
| Autenticação | Cookie `sb-access-token` validado no middleware Vercel |
| Estilo | Design System compartilhado (`assets/css/`) + `admin.css` |
| Estado local | `localStorage` com fallback offline completo |

### 1.2 Estrutura de Arquivos Implementada

```
admin/
├── leads/
│   └── index.html              # /admin/leads
├── clientes/
│   ├── index.html              # /admin/clientes
│   └── detalhes.html           # /admin/clientes/detalhes?id=UUID

api/admin/crm/
├── leads.js                    # GET leads (filtros, paginação, busca)
├── customers.js                # GET/POST/PUT/DELETE customers
└── convert.js                  # POST converte lead → customer

assets/js/admin/
├── leads.js                    # Lógica da listagem de leads
├── clientes.js                 # Lógica da listagem de clientes
└── cliente-detalhes.js         # Lógica da ficha do cliente

supabase/migrations/
└── 2026_05_20_create_crm.sql   # Tabela customers + ALTER leads
```

---

## 2. Banco de Dados

### 2.1 Migration `2026_05_20_create_crm.sql`

**Tabela `public.customers`:**
- `id` UUID PK, `created_at`, `updated_at`
- `nome` VARCHAR(200) NOT NULL
- `telefone` VARCHAR(20) UNIQUE NOT NULL
- `email` VARCHAR(200) NULLABLE
- `cpf` VARCHAR(14) NULLABLE
- `endereco` JSONB (logradouro, numero, complemento, bairro, cidade, uf, cep)
- `tags` TEXT[] (array simples — YAGNI, sem tabela separada)
- `observacoes` TEXT
- `origem_lead_id` UUID FK → `leads.id` NULLABLE
- `deleted_at` TIMESTAMPTZ (soft delete)
- `audit` fields: `created_by`, `updated_by`
- RLS: `authenticated` full access

**ALTER `public.leads`:**
- Adicionado `customer_id` UUID FK → `customers.id` NULLABLE
- Quando lead é convertido, `customer_id` é preenchido e `status` vira `'convertido'`

### 2.2 Índices criados

```sql
CREATE INDEX idx_customers_telefone ON public.customers(telefone) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_nome ON public.customers USING gin(to_tsvector('portuguese', nome));
```

---

## 3. APIs Edge Functions

### `GET /api/admin/crm/leads`

Parâmetros de query:
- `status`: filtro por enum (`novo`, `contatado`, `qualificado`, `convertido`, `perdido`)
- `servico`: filtro por tipo de serviço
- `search`: busca textual em `nome + telefone + mensagem`
- `page`, `limit`: paginação (default limit=20)
- `urgencia`: filtro por urgência

Retorno: `{ leads: [...], total, page, hasMore }`

### `GET /api/admin/crm/customers`

Parâmetros:
- `search`: busca em `nome + telefone`
- `tags`: filtro por tags (array)
- `com_os_ativa`: boolean
- `page`, `limit`

Retorno: `{ customers: [...], total, page, hasMore }`

### `GET/POST/PUT /api/admin/crm/customers?id=UUID`

- `GET`: retorna ficha completa com histórico de OS vinculadas
- `POST`: cria novo customer
- `PUT`: atualiza campos (todos opcionais, patch parcial)

### `POST /api/admin/crm/convert`

Body: `{ lead_id: UUID, customer_data: { nome, telefone, email?, cpf?, endereco? } }`

Lógica:
1. Verifica se já existe customer com mesmo telefone → se sim, apenas linka
2. Caso contrário, cria novo customer
3. Atualiza `leads.customer_id` e `leads.status = 'convertido'`
4. Retorna `{ customer_id, created: boolean }`

---

## 4. Frontend

### 4.1 Listagem de Leads (`/admin/leads`)

**Comportamento implementado:**
- Cards em mobile (< 768px) com badge de status HSL e botão direto de WhatsApp
- Tabela em desktop (≥ 768px) com colunas: Nome, Serviço, Status, Urgência, Data, Ações
- Filtros por status (multi-select chips), urgência e data de entrada
- Busca em tempo real (debounce 300ms) em nome + telefone + mensagem
- Scroll infinito (IntersectionObserver) com `load more` automático
- Ação rápida: "Responder no WhatsApp" abre `wa.me/55{telefone}` com template pré-preenchido
- Drawer lateral de detalhes do lead com botão "Marcar como cliente" (modal de conversão)
- Fallback offline: `localStorage` simula dados quando API não responde

### 4.2 Listagem de Clientes (`/admin/clientes`)

- Estrutura análoga à listagem de leads
- Indicadores: contagem de OS ativas por cliente, valor total gasto
- Filtros por tags, cidade, com OS ativa

### 4.3 Ficha do Cliente (`/admin/clientes/detalhes?id=UUID`)

- Header com nome, telefone clicável (`tel:`), WhatsApp (`wa.me`)
- Seção "Ordens de Serviço": lista OS vinculadas com status e link para detalhes
- Seção "Observações": textarea com auto-save debounced (500ms)
- Seção "Histórico de leads": leads que originaram esse customer
- Edição inline de campos (nome, telefone, email, endereço)
- Botão "Deletar" com dupla confirmação → soft delete (preenche `deleted_at`)
- Botão "Nova OS" → redireciona para `/admin/os?novo=1&cliente_id=UUID`

---

## 5. UX / Comportamentos Especiais

### Auto-save debounced

O campo de observações do cliente usa debounce de 500ms — cada keystroke reinicia o timer, e o `PUT` só dispara 500ms após o último caractere digitado. Indicador visual "Salvando..." → "Salvo ✓".

### Conversão Lead → Customer

Modal em 2 passos:
1. Confirma dados do lead (preenche form com dados existentes do lead)
2. Verifica se telefone já existe como customer → se sim, oferece "Vincular ao existente" vs "Criar duplicata"

Após confirmação: redireciona para `/admin/clientes/detalhes?id=UUID` do customer.

### Clean URLs

Todas as rotas usam URLs sem `.html`:
- `/admin/leads` → `admin/leads/index.html`
- `/admin/clientes/detalhes?id=UUID` → `admin/clientes/detalhes.html`

Configurado via `vercel.json` com rewrites.

---

## 6. Testes (Playwright `tests/admin-crm.spec.js`)

Testes implementados:
- **T01** Listagem de leads carrega com cards em mobile
- **T02** Filtro de status oculta leads não correspondentes
- **T03** Busca em tempo real filtra por nome
- **T04** Botão WhatsApp abre URL correta
- **T05** Drawer de detalhes do lead abre com dados corretos
- **T06** Modal de conversão cria customer e redireciona para ficha
- **T07** Ficha do customer exibe nome, telefone e seção de OS
- **T08** Auto-save de observações dispara PUT após 500ms
- **T09** Soft delete remove customer da listagem

---

## 7. Variáveis de Ambiente (Reutilizadas)

Todas as variáveis já existiam das features 003/004:
- `SUPABASE_URL` (server)
- `SUPABASE_SERVICE_ROLE_KEY` (server)
- `IFL_SUPABASE_URL` (window — cliente)
- `IFL_SUPABASE_ANON_KEY` (window — cliente)

---

## 8. Definição de Pronto (como entregue)

- [x] Tabela `customers` criada com RLS + audit trigger
- [x] ALTER `leads` com `customer_id` FK
- [x] APIs de leads, customers e convert implementadas
- [x] Listagem de leads com filtros, busca e scroll infinito
- [x] Conversão lead → customer com modal de deduplicação
- [x] Ficha do cliente com auto-save, histórico de OS e edição inline
- [x] Playwright `tests/admin-crm.spec.js` passando
- [x] Deploy em produção validado
