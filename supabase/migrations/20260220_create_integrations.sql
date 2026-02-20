-- ============================================================================
-- Migration: Create integration tables for Meta OAuth
-- Tables: integrations, meta_whatsapp_numbers, meta_ad_accounts, meta_forms
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. integrations — provider connections per workspace
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta',
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  connected_by UUID REFERENCES auth.users(id),
  settings JSONB NOT NULL DEFAULT '{}',
  scopes_granted TEXT[] NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integrations_workspace ON public.integrations(workspace_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_integrations_provider ON public.integrations(workspace_id, provider)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. meta_whatsapp_numbers — WhatsApp phone numbers linked to integration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  whatsapp_business_id TEXT NOT NULL,
  display_name TEXT,
  quality_rating TEXT,
  webhook_subscribed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, phone_number_id)
);

CREATE INDEX idx_wa_numbers_integration ON public.meta_whatsapp_numbers(integration_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. meta_ad_accounts — Meta Ads accounts linked to integration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  name TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'active',
  data JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, ad_account_id)
);

CREATE INDEX idx_ad_accounts_integration ON public.meta_ad_accounts(integration_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 4. meta_forms — Lead Gen forms from Meta Pages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  form_id TEXT NOT NULL,
  page_id TEXT,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  details JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, form_id)
);

CREATE INDEX idx_forms_integration ON public.meta_forms(integration_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 5. RLS Policies
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_forms ENABLE ROW LEVEL SECURITY;

-- integrations: users can read integrations of their workspaces
CREATE POLICY integrations_select ON public.integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = integrations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
  );

-- meta_whatsapp_numbers: users can read via integration → workspace membership
CREATE POLICY wa_numbers_select ON public.meta_whatsapp_numbers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.integrations i
      JOIN public.workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = meta_whatsapp_numbers.integration_id
        AND wm.user_id = auth.uid()
        AND i.deleted_at IS NULL
        AND wm.deleted_at IS NULL
    )
  );

-- meta_ad_accounts: users can read via integration → workspace membership
CREATE POLICY ad_accounts_select ON public.meta_ad_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.integrations i
      JOIN public.workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = meta_ad_accounts.integration_id
        AND wm.user_id = auth.uid()
        AND i.deleted_at IS NULL
        AND wm.deleted_at IS NULL
    )
  );

-- meta_forms: users can read via integration → workspace membership
CREATE POLICY forms_select ON public.meta_forms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.integrations i
      JOIN public.workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = meta_forms.integration_id
        AND wm.user_id = auth.uid()
        AND i.deleted_at IS NULL
        AND wm.deleted_at IS NULL
    )
  );
