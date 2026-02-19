// ============================================================================
// Types — Logs, Alerts, Alert Rules
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";
export type LogCategory =
  | "webhook" | "delivery" | "oauth" | "whatsapp"
  | "mapping" | "system" | "billing" | "auth" | "alert";

export type AlertConditionType =
  | "error_rate" | "dlq_threshold" | "latency_threshold"
  | "no_events" | "consecutive_fails" | "custom";

export type AlertStatus = "triggered" | "acknowledged" | "resolved";
export type NotifyChannel = "in_app" | "email" | "webhook" | "whatsapp";

export interface EventLog {
  id: string;
  workspace_id: string;
  level: LogLevel;
  category: LogCategory;
  action: string;
  message: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  user_id: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AlertRule {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  condition_type: AlertConditionType;
  condition_config: Record<string, unknown>;
  notify_channels: NotifyChannel[];
  notify_config: Record<string, unknown>;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  trigger_count: number;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertHistory {
  id: string;
  workspace_id: string;
  alert_rule_id: string;
  status: AlertStatus;
  message: string;
  condition_snapshot: Record<string, unknown>;
  notified_via: string[];
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  // Joined
  alert_rule?: Pick<AlertRule, "name" | "condition_type">;
}

export interface AlertRuleFormData {
  name: string;
  description?: string;
  condition_type: AlertConditionType;
  condition_config: Record<string, unknown>;
  notify_channels: NotifyChannel[];
  notify_config: Record<string, unknown>;
  cooldown_minutes: number;
}
