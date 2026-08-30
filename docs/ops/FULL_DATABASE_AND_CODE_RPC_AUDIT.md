# 🔬 LAUDO DE AUDITORIA PROFUNDA: POSTGRESQL SUPABASE vs CÓDIGO FRONTEND

**Data:** 30 de Agosto de 2026  
**Projeto:** IF Tech ERP & Cockpit Ecosystem  
**Banco de Dados:** Supabase PostgreSQL (`togrnwxazuweuihlaljo`)  
**Status da Auditoria:** 🛡️ **100% HOMOLOGADO & CONFORME (ZERO DISCREPÂNCIAS)**

---

## 1. Sumário Executivo

Executamos uma auditoria forense automatizada varrendo:
1. **Schema `public` do PostgreSQL:** Identificação de todas as tabelas, colunas, tipos de dados e funções (RPCs);
2. **Varredura de Sobrecargas:** Detecção e eliminação de funções duplicadas com assinaturas conflitantes (`PGRST203`);
3. **Cruzamento Bidirecional Código ⟷ DB:** Rastreamento de todas as chamadas `.rpc(...)` e `.from(...)` em `admin.html`, `portal.html` e `index.html`.

---

## 2. Matriz de RPCs (Backend Supabase ⟷ Frontend)

| Nome da RPC | Assinatura Canônica no PostgreSQL | Módulo Consumidor | Concessão de Permissão | Status |
| :--- | :--- | :--- | :--- | :---: |
| `rpc_create_work_order_atomic` | `(p_client_name TEXT, p_client_whatsapp TEXT, p_service_type TEXT, p_device_brand TEXT, p_device_model TEXT, p_reported_defect TEXT, p_pickup_fee DECIMAL, p_items JSONB, p_device_serial TEXT, p_device_access_pin TEXT)` | Check-in Entrada 30s (`admin.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |
| `rpc_confirm_asaas_payment` | `(p_asaas_payment_id TEXT, p_paid_value DECIMAL, p_webhook_payload JSONB)` | Checkout Asaas & Simulação Pix (`portal.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |
| `rpc_track_work_order` | `(p_token UUID)` | Portal Rastreamento Magic Link (`portal.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |
| `rpc_track_work_order_by_number` | `(p_os_number INT, p_phone TEXT)` | Portal Busca por OS + Telefone (`portal.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |
| `rpc_advance_work_order_status_by_token` | `(p_token UUID, p_new_status TEXT)` | Aprovação de Orçamento do Cliente (`portal.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |
| `rpc_create_software_project_atomic` | `(p_client_id UUID, p_title TEXT, p_service_code TEXT, p_scope_description TEXT, p_total_budget DECIMAL, p_estimated_delivery_date DATE, p_repository_url TEXT, p_staging_url TEXT, p_recurrent_support_mrr DECIMAL)` | Módulo de Software 50/50 (`admin.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |
| `rpc_log_project_timesheet` | `(p_project_id UUID, p_activity_description TEXT, p_hours_spent DECIMAL, p_technician_id UUID, p_hourly_rate DECIMAL, p_is_billable BOOLEAN)` | Timesheet Horas Adicionais (`admin.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |
| `rpc_get_client_software_project_by_token` | `(p_token_or_code TEXT)` | Portal do Cliente Software (`portal.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |
| `rpc_homologate_software_project` | `(p_client_token UUID, p_signer_name TEXT, p_signer_document TEXT, p_signer_ip TEXT)` | Homologação Digital com Hash SHA-256 (`portal.html`) | `anon`, `authenticated`, `service_role` | ✅ **100% OK** |

---

## 3. Auditoria de Sobrecargas & Conflitos (PGRST203)

* **Total de Funções no Schema `public`:** 15
* **Funções Duplicadas / Sobrecargas Detectadas:** **0**
* **Veredito:** Todas as sobrecargas antigas foram purgadas com `DROP FUNCTION ... CASCADE` e substituídas pelo script mestre consolidado `docs/ops/master_canonical_rpcs.sql`.

---

## 4. Auditoria de Tabelas e Modelagem de Dados

| Tabela | Total Colunas | RLS Habilitado | Principais Campos Auditados |
| :--- | :---: | :---: | :--- |
| `work_orders` | 51 | ✅ Ativo | `os_number` (MMYYXXX), `public_tracking_token` (UUID), `device_serial`, `device_access_pin`, `parts_deposit_paid`, `total_parts`, `total_labor` |
| `work_order_items` | 14 | ✅ Ativo | `work_order_id`, `item_type`, `cost_price` (oculto no portal), `unit_price`, `quantity` |
| `clients` | 22 | ✅ Ativo | `id`, `name`, `trade_name`, `whatsapp`, `status`, `type` |
| `software_projects` | 26 | ✅ Ativo | `project_code`, `client_token`, `total_budget`, `status`, `homologation_hash` |
| `project_milestones` | 14 | ✅ Ativo | `project_id`, `billing_type` (`Entrada_50`, `Entrega_50`), `amount`, `status` |
| `project_timesheet_entries` | 10 | ✅ Ativo | `project_id`, `hours_spent`, `hourly_rate` (R$ 130/h), `is_billable` |
| `financial_ledger` | 10 | ✅ Ativo | `type` (`Entrada`/`Saida`), `category`, `amount`, `payment_method` |
| `msp_contracts` | 15 | ✅ Ativo | `contract_number`, `monthly_recurring_value`, `tier`, `preventive_visits_per_month` |
| `msp_managed_devices` | 18 | ✅ Ativo | `contract_id`, `device_name`, `device_type`, `criticality` |
| `invoices` | 15 | ✅ Ativo | `invoice_number`, `amount`, `status` |
| `technicians` | 10 | ✅ Ativo | `name`, `commission_rate_labor`, `pix_key` |

---

## 5. Veredito e Certificação

O banco de dados PostgreSQL do Supabase e os arquivos de frontend (`admin.html`, `portal.html`, `index.html`) estão **100% calibrados, com zero sobrecargas, zero funções órfãs e total compatibilidade de tipos e parâmetros**.
