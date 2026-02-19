// ============================================================================
// Types — Payload Mappings (matches migration 00009)
// ============================================================================

export type MappingMode = "field_map" | "template";
export type MappingSourceType = "whatsapp" | "forms" | "ads" | "webhook" | "any";

export type TransformType =
  | "uppercase"
  | "lowercase"
  | "trim"
  | "number"
  | "boolean"
  | "string"
  | "date_iso"
  | "json_parse"
  | "json_stringify"
  | "array_first"
  | "array_last"
  | "array_join"
  | "phone_clean"
  | "email_lower";

export interface MappingRule {
  source_path: string;
  target_path: string;
  transform?: TransformType;
  default_value?: unknown;
  condition?: string;
}

export interface Mapping {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  source_type: MappingSourceType;
  rules: MappingRule[];
  static_fields: Record<string, unknown>;
  mode: MappingMode;
  template: string | null;
  pass_through: boolean;
  is_active: boolean;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MappingTestRun {
  id: string;
  mapping_id: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  run_by: string | null;
  created_at: string;
}

export interface MappingFormData {
  name: string;
  description?: string;
  source_type: MappingSourceType;
  rules: MappingRule[];
  static_fields: Record<string, unknown>;
  mode: MappingMode;
  template?: string;
  pass_through: boolean;
}

export interface PreviewResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  duration_ms?: number;
}
