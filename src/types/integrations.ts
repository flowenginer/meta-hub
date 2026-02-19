// ============================================================================
// Types — Integrations & Meta Products
// ============================================================================

export interface Integration {
  id: string;
  workspace_id: string;
  provider: string;
  display_name: string | null;
  status: "connected" | "disconnected" | "error" | "pending";
  connected_by: string | null;
  settings: Record<string, unknown>;
  scopes_granted: string[];
  last_synced_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAccount {
  id: string;
  integration_id: string;
  meta_account_id: string;
  name: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface MetaWhatsAppNumber {
  id: string;
  integration_id: string;
  phone_number: string;
  phone_number_id: string;
  whatsapp_business_id: string;
  display_name: string | null;
  quality_rating: string | null;
  webhook_subscribed: boolean;
  status: string;
  created_at: string;
}

export interface MetaAdAccount {
  id: string;
  integration_id: string;
  ad_account_id: string;
  name: string | null;
  currency: string;
  timezone: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface MetaForm {
  id: string;
  integration_id: string;
  form_id: string;
  page_id: string | null;
  name: string | null;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface StartOAuthResponse {
  url: string;
  state: string;
}
