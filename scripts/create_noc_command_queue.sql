CREATE TABLE IF NOT EXISTS public.noc_command_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    result JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_noc_command_status ON public.noc_command_queue(status, created_at ASC);
ALTER TABLE public.noc_command_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_noc_command_queue ON public.noc_command_queue;
CREATE POLICY allow_all_noc_command_queue ON public.noc_command_queue FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
