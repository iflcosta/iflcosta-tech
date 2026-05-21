# Plan — Feature 010: Painel Financeiro

**Status:** Aprovado  
**Criado:** 2026-05-21

---

## 1. Arquitetura

```
api/admin/financeiro.js          ← Edge Function (GET)
admin/financeiro/index.html      ← Página do painel
assets/js/admin/financeiro.js    ← Módulo JS (cards, gráfico, tabela)
```

Nenhuma migration SQL necessária — todos os campos já existem em `repairs`.

---

## 2. API — `GET /api/admin/financeiro`

### Query params
| Param | Valores | Default |
|-------|---------|---------|
| `periodo` | `este_mes`, `mes_anterior`, `este_ano`, `custom` | `este_mes` |
| `date_from` | ISO date | — (requerido se `periodo=custom`) |
| `date_to` | ISO date | — (requerido se `periodo=custom`) |

### Response shape
```json
{
  "ok": true,
  "periodo": { "from": "2026-05-01", "to": "2026-05-31" },
  "resumo": {
    "receita": 3200.00,
    "lucro": 1850.00,
    "ticket_medio": 533.33,
    "os_count": 6
  },
  "a_receber": {
    "total": 750.00,
    "lista": [
      { "id": "uuid", "os_number": "OS-2026-0003", "customer_nome": "João", "equipamento": "iPhone 12", "valor_cobrado": 450.00, "payment_status": "pendente" }
    ]
  },
  "grafico": [
    { "mes": "2025-12", "label": "Dez/25", "receita": 1800.00, "lucro": 950.00 },
    { "mes": "2026-01", "label": "Jan/26", "receita": 2100.00, "lucro": 1200.00 },
    ...
  ]
}
```

### Lógica SQL (via Supabase JS)
- **resumo**: `SELECT SUM(valor_cobrado), SUM(valor_lucro), AVG(valor_cobrado), COUNT(*) FROM repairs WHERE status = 'entregue' AND entregue_at BETWEEN :from AND :to AND deleted_at IS NULL`
- **a_receber**: `SELECT ... FROM repairs WHERE payment_status IN ('pendente','parcial') AND status NOT IN ('entregue','cancelado','cliente_desistiu') AND deleted_at IS NULL ORDER BY valor_cobrado DESC`
- **grafico**: 6 queries mensais (ou uma query com `DATE_TRUNC` via `execute_sql` se necessário)

---

## 3. Frontend — `admin/financeiro/index.html`

### Layout (mobile-first)
```
┌─────────────────────────────────────┐
│  Painel Financeiro    [filtro ▼]    │
├──────────┬──────────┬──────────┬────┤
│ Receita  │ Lucro    │A Receber │Tkt │
│ R$3.200  │ R$1.850  │ R$750    │R$533│
├─────────────────────────────────────┤
│  Gráfico de Tendência (6 meses)     │
│  ████░░ ██████ ████░░ (canvas)      │
├─────────────────────────────────────┤
│  A Receber                          │
│  OS-0003 · João · iPhone · R$450 →  │
│  OS-0007 · Ana  · Notebook · R$300→ │
└─────────────────────────────────────┘
```

### Componentes JS
- `loadFinanceiro(periodo)` — fetch da API, atualiza todos os elementos
- `renderCards(resumo)` — preenche os 4 cards com animação de contagem
- `renderGrafico(grafico)` — desenha barras no `<canvas>` via Context2D
- `renderAReceber(lista)` — monta tabela com links para OS

---

## 4. Integração com componentes existentes

### Sidebar (`assets/js/admin/layout.js`)
Adicionar item "💰 Financeiro" entre Estoque e eventual próximo módulo.

### Dashboard (`admin/index.html`)
Substituir card WhatsApp "Em breve" por card Financeiro clicável com receita do mês — ou adicionar 5º card. Decisão: **adicionar como 5º card** para não remover o WhatsApp.

---

## 5. Sequência de implementação

```
T001 specs (este arquivo)
T002 API /api/admin/financeiro.js
T003 admin/financeiro/index.html (estrutura + CSS)
T004 assets/js/admin/financeiro.js (lógica completa)
T005 Sidebar + Dashboard card
```
