-- ============================================================================
-- Migration: Create event_logs table for application logging
-- Used by the Logs page to display webhook reception, delivery, errors, etc.
-- Idempotent: safe to re-run
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  category TEXT NOT NULL DEFAULT 'system'
    CHECK (category IN ('webhook', 'delivery', 'oauth', 'whatsapp', 'mapping', 'system', 'billing', 'auth', 'alert')),
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_workspace ON public.event_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_level ON public.event_logs(workspace_id, level);
CREATE INDEX IF NOT EXISTS idx_event_logs_category ON public.event_logs(workspace_id, category);

-- RLS
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- Users can read logs from their workspace
DROP POLICY IF EXISTS event_logs_select ON public.event_logs;
CREATE POLICY event_logs_select ON public.event_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = event_logs.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

-- Service role (Edge Functions) can insert logs
DROP POLICY IF EXISTS event_logs_service_insert ON public.event_logs;
CREATE POLICY event_logs_service_insert ON public.event_logs
  FOR INSERT WITH CHECK (true);

-- Auto-cleanup: delete logs older than 30 days (optional, run via cron)
-- SELECT cron.schedule('cleanup-old-logs', '0 3 * * *', $$
--   DELETE FROM public.event_logs WHERE created_at < now() - interval '30 days';
-- $$);
