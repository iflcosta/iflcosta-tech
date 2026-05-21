-- =============================================================================
-- Migration: harden_db_functions
-- Feature:   007-admin-inventory (hardening retroativo das funções 003/005/006/007)
-- Data:      2026-05-21
-- Propósito: 1) Fixa search_path nas funções de trigger e SECURITY DEFINER
--               (todas as referências já são schema-qualified, search_path = ''
--               é seguro e elimina o vetor de search_path hijacking).
--            2) Revoga EXECUTE de PUBLIC/anon/authenticated nas funções
--               SECURITY DEFINER de trigger — não devem ser chamáveis via RPC.
-- Advisors resolvidos: function_search_path_mutable (8),
--                      anon/authenticated_security_definer_function_executable (6).
-- =============================================================================

-- 1. Fixa search_path = '' (resolve lint function_search_path_mutable)
ALTER FUNCTION public.log_lead_insert()                 SET search_path = '';
ALTER FUNCTION public.update_updated_at_column()        SET search_path = '';
ALTER FUNCTION public.process_customer_audit()          SET search_path = '';
ALTER FUNCTION public.handle_os_pre_save()              SET search_path = '';
ALTER FUNCTION public.handle_os_status_transition()     SET search_path = '';
ALTER FUNCTION public.process_repair_audit()            SET search_path = '';
ALTER FUNCTION public.handle_inventory_movement_stock() SET search_path = '';
ALTER FUNCTION public.sync_repair_parts_cost()          SET search_path = '';

-- 2. Revoga EXECUTE das funções SECURITY DEFINER de trigger (resolve lints 0028/0029).
--    Triggers continuam disparando normalmente — o mecanismo de trigger não
--    verifica privilégio EXECUTE; isto só impede a chamada direta via /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.process_customer_audit()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_os_status_transition()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_repair_audit()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_inventory_movement_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_repair_parts_cost()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                 FROM PUBLIC, anon, authenticated;
