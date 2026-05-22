-- Corrige alertas de segurança do Supabase Advisor (2026-05-22)

-- 1. view_public_os_tracking: SECURITY INVOKER
--    Com SECURITY DEFINER a view rodava com permissão do criador, ignorando RLS.
--    Com SECURITY INVOKER, anon fica restrito pelas políticas existentes de tracking_token.
--    Service_role (usado pela API) bypassa RLS de qualquer forma — sem impacto na API.
ALTER VIEW public.view_public_os_tracking SET (security_invoker = true);

-- 2. handle_os_metadata_generation: revoga EXECUTE de anon e authenticated
--    Função de trigger interna — não deve ser chamável via /rest/v1/rpc/ publicamente.
REVOKE EXECUTE ON FUNCTION public.handle_os_metadata_generation() FROM anon, authenticated;
