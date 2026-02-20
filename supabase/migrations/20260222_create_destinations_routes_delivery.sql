-- ============================================================================
-- Migration: Create destinations, routes, delivery_events, delivery_attempts
-- Tables for webhook forwarding pipeline
-- Idempotent: safe to re-run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. destinations — webhook URLs where events are forwarded
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST' CHECK (method IN ('POST', 'PUT', 'PATCH')),
  headers JSONB NOT NULL DEFAULT '{}',
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'hmac', 'bearer', 'basic', 'api_key')),
  auth_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destinations_workspace ON public.destinations(workspace_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. routes — map source channels to destinations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('whatsapp', 'forms', 'ads', 'webhook')),
  source_id TEXT,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  filter_rules JSONB NOT NULL DEFAULT '[]',
  mapping_id UUID,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routes_workspace ON public.routes(workspace_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_routes_source ON public.routes(workspace_id, source_type)
  WHERE deleted_at IS NULL AND is_active = true;

-- ---------------------------------------------------------------------------
-- 3. delivery_events — each forwarded payload
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  transformed_payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'dlq', 'cancelled')),
  attempts_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_workspace ON public.delivery_events(workspace_id)
  WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_delivery_events_status ON public.delivery_events(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_events_pending ON public.delivery_events(status, next_retry_at)
  WHERE status IN ('pending', 'failed');

-- ---------------------------------------------------------------------------
-- 4. delivery_attempts — individual HTTP attempts per event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.delivery_events(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  request_url TEXT NOT NULL,
  request_method TEXT NOT NULL DEFAULT 'POST',
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_event ON public.delivery_attempts(event_id);

-- ---------------------------------------------------------------------------
-- 5. RLS Policies (drop if exists to make idempotent)
-- ---------------------------------------------------------------------------

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

-- destinations
DROP POLICY IF EXISTS destinations_select ON public.destinations;
CREATE POLICY destinations_select ON public.destinations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = destinations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS destinations_insert ON public.destinations;
CREATE POLICY destinations_insert ON public.destinations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = destinations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS destinations_update ON public.destinations;
CREATE POLICY destinations_update ON public.destinations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = destinations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

-- routes
DROP POLICY IF EXISTS routes_select ON public.routes;
CREATE POLICY routes_select ON public.routes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = routes.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS routes_insert ON public.routes;
CREATE POLICY routes_insert ON public.routes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = routes.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS routes_update ON public.routes;
CREATE POLICY routes_update ON public.routes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = routes.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

-- delivery_events
DROP POLICY IF EXISTS delivery_events_select ON public.delivery_events;
CREATE POLICY delivery_events_select ON public.delivery_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = delivery_events.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS delivery_events_update ON public.delivery_events;
CREATE POLICY delivery_events_update ON public.delivery_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = delivery_events.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

-- delivery_attempts
DROP POLICY IF EXISTS delivery_attempts_select ON public.delivery_attempts;
CREATE POLICY delivery_attempts_select ON public.delivery_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.delivery_events de
      JOIN public.workspace_members wm ON wm.workspace_id = de.workspace_id
      WHERE de.id = delivery_attempts.event_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Service role INSERT policies for Edge Functions
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS delivery_events_service_insert ON public.delivery_events;
CREATE POLICY delivery_events_service_insert ON public.delivery_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS delivery_attempts_service_insert ON public.delivery_attempts;
CREATE POLICY delivery_attempts_service_insert ON public.delivery_attempts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS delivery_events_service_update ON public.delivery_events;
CREATE POLICY delivery_events_service_update ON public.delivery_events
  FOR UPDATE USING (true);

-- ---------------------------------------------------------------------------
-- 7. RPC: get_delivery_stats — aggregated stats for dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_delivery_stats(
  _workspace_id UUID,
  _hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total BIGINT,
  delivered BIGINT,
  failed BIGINT,
  pending BIGINT,
  dlq BIGINT,
  avg_duration_ms NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT AS delivered,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending,
    COUNT(*) FILTER (WHERE status = 'dlq')::BIGINT AS dlq,
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (delivered_at - created_at)) * 1000
    ) FILTER (WHERE status = 'delivered'), 0)::NUMERIC AS avg_duration_ms
  FROM public.delivery_events
  WHERE workspace_id = _workspace_id
    AND created_at >= now() - (_hours || ' hours')::INTERVAL;
$$;
