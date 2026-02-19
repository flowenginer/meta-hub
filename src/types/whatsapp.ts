// ============================================================================
// Types — WhatsApp Conversations, Messages, Templates
// ============================================================================

export type WaConversationStatus = "open" | "closed" | "expired";
export type WaMessageDirection = "inbound" | "outbound";
export type WaMessageType =
  | "text" | "image" | "video" | "audio" | "document"
  | "sticker" | "location" | "contacts" | "reaction"
  | "interactive" | "button" | "template" | "system";
export type WaMessageStatus = "accepted" | "sent" | "delivered" | "read" | "failed" | "deleted";

export interface WaConversation {
  id: string;
  workspace_id: string;
  phone_number_id: string;
  contact_wa_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  status: WaConversationStatus;
  last_message_at: string | null;
  last_message_text: string | null;
  last_direction: string | null;
  unread_count: number;
  assigned_to: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  window_expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaMessage {
  id: string;
  conversation_id: string;
  workspace_id: string;
  wamid: string | null;
  direction: WaMessageDirection;
  msg_type: WaMessageType;
  text_body: string | null;
  caption: string | null;
  media_id: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  interactive_data: Record<string, unknown> | null;
  context_message_id: string | null;
  status: WaMessageStatus;
  status_updated_at: string | null;
  error_code: string | null;
  error_message: string | null;
  timestamp_wa: string | null;
  sent_by: string | null;
  created_at: string;
}

export interface WaTemplate {
  id: string;
  workspace_id: string;
  integration_id: string | null;
  template_name: string;
  language: string;
  category: string | null;
  status: string;
  components: unknown[];
  meta_template_id: string | null;
  created_at: string;
}

export interface SendMessagePayload {
  workspace_id: string;
  phone_number_id: string;
  to: string;
  type?: string;
  text?: string;
  media_url?: string;
  media_id?: string;
  caption?: string;
  filename?: string;
  context_message_id?: string;
}
