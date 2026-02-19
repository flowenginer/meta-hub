// ============================================================================
// Types — Billing
// ============================================================================

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  max_events_month: number;
  max_destinations: number;
  max_routes: number;
  max_members: number;
  max_integrations: number;
  max_wa_conversations: number;
  max_report_jobs: number;
  has_dlq_management: boolean;
  has_alert_rules: boolean;
  has_custom_mappings: boolean;
  has_priority_support: boolean;
  price_monthly_cents: number;
  price_yearly_cents: number;
  overage_per_event_cents: number;
  features_list: string[];
  // Computed
  price_monthly?: number;
  price_yearly?: number;
}

export type SubscriptionStatus = "active" | "trial" | "past_due" | "cancelled" | "expired";
export type BillingCycle = "monthly" | "yearly";
export type InvoiceStatus = "draft" | "pending" | "paid" | "failed" | "cancelled" | "refunded";

export interface Subscription {
  id: string;
  workspace_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  gateway: string | null;
  created_at: string;
  // Joined
  plan?: Plan;
}

export interface UsageRecord {
  id: string;
  workspace_id: string;
  period_start: string;
  period_end: string;
  events_count: number;
  deliveries_success: number;
  deliveries_failed: number;
  wa_messages_in: number;
  wa_messages_out: number;
  api_calls: number;
  overage_events: number;
  overage_cost_cents: number;
  plan_slug: string | null;
  plan_limit: number | null;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  subscription_id: string | null;
  subtotal_cents: number;
  overage_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  status: InvoiceStatus;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  line_items: Array<{ description: string; amount_cents: number }>;
  created_at: string;
}

export interface UsageSummary {
  events_count: number;
  events_limit: number;
  usage_pct: number;
  plan_slug: string;
  plan_name: string;
  days_remaining: number;
}
