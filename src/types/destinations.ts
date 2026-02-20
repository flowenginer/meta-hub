// ============================================================================
// Types — Destinations, Routes, Delivery
// ============================================================================

export type AuthType = "none" | "hmac" | "bearer" | "basic" | "api_key";
export type HttpMethod = "POST" | "PUT" | "PATCH";
export type SourceType = "whatsapp" | "forms" | "ads" | "webhook";
export type DeliveryStatus = "pending" | "processing" | "delivered" | "failed" | "dlq" | "cancelled";

export type WhatsAppEventType = "messages" | "status_sent" | "status_delivered" | "status_read" | "status_failed";

export interface FilterRules {
  event_types?: WhatsAppEventType[];
}

export interface Destination {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  auth_type: AuthType;
  auth_config: Record<string, string>;
  is_active: boolean;
  timeout_ms: number;
  description: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  workspace_id: string;
  name: string;
  source_type: SourceType;
  source_id: string | null;
  destination_id: string;
  is_active: boolean;
  priority: number;
  filter_rules: FilterRules | null;
  mapping_id: string | null;
  description: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  destination?: Pick<Destination, "id" | "name" | "url" | "is_active">;
}

export interface DeliveryEvent {
  id: string;
  workspace_id: string;
  route_id: string;
  destination_id: string;
  source_type: string;
  source_event_id: string | null;
  payload: Record<string, unknown>;
  transformed_payload: Record<string, unknown> | null;
  status: DeliveryStatus;
  attempts_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DeliveryAttempt {
  id: string;
  event_id: string;
  destination_id: string;
  attempt_number: number;
  request_url: string;
  request_method: string;
  status_code: number | null;
  response_body: string | null;
  error_message: string | null;
  duration_ms: number | null;
  attempted_at: string;
}

export interface TestWebhookResult {
  success: boolean;
  status_code?: number;
  response_body?: string;
  error?: string;
  duration_ms: number;
}

export interface DestinationFormData {
  name: string;
  url: string;
  method: HttpMethod;
  auth_type: AuthType;
  auth_config: Record<string, string>;
  headers: Record<string, string>;
  timeout_ms: number;
  description?: string;
}

export interface RouteFormData {
  name: string;
  source_type: SourceType;
  source_id?: string;
  destination_id: string;
  is_active: boolean;
  priority: number;
  filter_rules?: FilterRules | null;
  description?: string;
}
