# Tasks: Admin CRM (leads + customers)

**Feature:** `005-admin-crm`
**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
**Status geral:** 100% concluído e em produção
**Depende de:** `004-admin-auth` · `003-lead-capture`

---

## Convenções

- `[x]` feito · `[ ]` pendente · `[~]` em progresso
- S = ≤ 1h · M = 2–4h · L = ≥ 4h

---

## 1. Banco de Dados

- [x] **T001** — Criar migration `2026_05_20_create_crm.sql` com tabela `customers` (id, nome, telefone unique, email, cpf, endereco JSONB, tags TEXT[], observacoes, origem_lead_id FK, deleted_at, audit fields). **M**
- [x] **T002** — `ALTER TABLE leads ADD COLUMN customer_id UUID FK → customers.id`. **S**
- [x] **T003** — Habilitar RLS em `customers`: `authenticated` full access (`SELECT, INSERT, UPDATE, DELETE`). **S**
- [x] **T004** — Criar índice full-text em `customers.nome` (GIN + `to_tsvector('portuguese', nome)`). **S**
- [x] **T005** — Criar índice em `customers(telefone)` WHERE `deleted_at IS NULL`. **S**
- [x] **T006** — Adicionar trigger de `updated_at` em `customers`. **S**

---

## 2. APIs Edge Functions

- [x] **T010** — Criar `api/admin/crm/leads.js`: `GET` com filtros `status`, `servico`, `urgencia`, `search` (textual), paginação `page`/`limit`. Retornar `{ leads, total, hasMore }`. **M**
- [x] **T011** — Criar `api/admin/crm/customers.js`: `GET` (busca + filtros), `POST` (criar), `PUT` (patch parcial), validação de autenticação em todos. **L**
- [x] **T012** — Criar `api/admin/crm/convert.js`: `POST` para converter lead → customer. Lógica: checar duplicata por telefone, criar ou vincular, atualizar `leads.customer_id` e `status='convertido'`. Retornar `{ customer_id, created }`. **M**

---

## 3. Frontend — Leads

- [x] **T020** — Criar `admin/leads/index.html`: layout admin shell + grid de cards mobile / tabela desktop. **M**
- [x] **T021** — Criar `assets/js/admin/leads.js`: fetch leads da API, renderização de cards e tabela, filtros por status e urgência, busca debounced (300ms). **L**
- [x] **T022** — Implementar scroll infinito via `IntersectionObserver` no final da lista (load more automático). **M**
- [x] **T023** — Botão "Responder no WhatsApp" gera URL `wa.me/55{telefone}` com template de mensagem pré-preenchido. **S**
- [x] **T024** — Drawer lateral de detalhes do lead: mostrar todos os campos, timeline de status, botão "Marcar como cliente". **M**
- [x] **T025** — Modal de conversão lead → customer: form pré-populado com dados do lead, verificação de duplicata, botão "Vincular ao existente" vs "Criar novo". **M**
- [x] **T026** — Fallback offline: `localStorage` com dados simulados quando API retorna erro. **S**

---

## 4. Frontend — Clientes

- [x] **T030** — Criar `admin/clientes/index.html`: estrutura análoga à listagem de leads. **M**
- [x] **T031** — Criar `assets/js/admin/clientes.js`: fetch customers, renderização com indicadores de OS ativas e valor total, filtros por tags/cidade. **L**
- [x] **T032** — Criar `admin/clientes/detalhes.html`: layout com header do cliente, seção OS, seção observações, seção leads históricos. **M**
- [x] **T033** — Criar `assets/js/admin/cliente-detalhes.js`: carregar dados via `GET /api/admin/crm/customers?id=`, edição inline de campos, auto-save debounced (500ms) em observações. **L**
- [x] **T034** — Botão "Nova OS" na ficha do cliente: redireciona para `/admin/os?novo=1&cliente_id=UUID`. **S**
- [x] **T035** — Soft delete do customer: dupla confirmação, chama `PUT` com `{ deleted_at: now() }`, redireciona para listagem. **S**

---

## 5. UX e Polimento

- [x] **T040** — Badges de status HSL dinâmicos para leads (novo=azul, contatado=amarelo, qualificado=verde, convertido=esmeralda, perdido=cinza). **S**
- [x] **T041** — Feedback visual "Salvando..." → "Salvo ✓" no auto-save das observações. **S**
- [x] **T042** — Estado de loading com skeleton cards durante fetch inicial. **S**
- [x] **T043** — Estado vazio com ilustração e CTA quando não há leads/clientes. **S**
- [x] **T044** — Garantir clean URLs sem `.html` via `vercel.json` rewrites. **S**

---

## 6. Testes

- [x] **T050** — Criar `tests/admin-crm.spec.js` com 9 testes (listagem, filtro, busca, WhatsApp, drawer, conversão, ficha, auto-save, soft delete). **L**
- [x] **T051** — Rodar testes em CI/Playwright local — todos passando (9/9). **S**
- [x] **T052** — Verificar axe-core sem violações `serious`/`critical` nas rotas `/admin/leads` e `/admin/clientes`. **S**

---

## 7. Deploy e Validação

- [x] **T060** — Push da branch `feat/005-admin-crm` → Vercel preview. **S**
- [x] **T061** — Testar conversão de lead em preview com dados reais. **M**
- [x] **T062** — Testar em iPhone real (Iago): listagem + drawer + ficha. **S**
- [x] **T063** — Merge para `main` → deploy em produção. **S**
- [x] **T064** — Atualizar `ROADMAP.md` marcando feature 005 como 100% pronto. **S**

---

## 8. Critério de Pronto (Atingido)

- [x] Tabela `customers` com RLS + audit + índices
- [x] ALTER `leads` com `customer_id` FK
- [x] Lead pode ser convertido em customer com 1 modal
- [x] Busca retorna em < 500ms até 1000 registros (índice GIN)
- [x] Mobile: listagem + ficha sem scroll horizontal em iPhone SE
- [x] Toda mutação gera linha em `audit_log`
- [x] Playwright `tests/admin-crm.spec.js` passando (9/9)
- [x] Iago operou fluxo completo em iPhone real sem fricção
