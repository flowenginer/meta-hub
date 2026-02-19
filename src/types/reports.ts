// ============================================================================
// Types — Reports
// ============================================================================

export type ReportType = "ads_insights" | "ads_spend" | "forms_leads" | "forms_summary" | "combined";
export type ScheduleType = "manual" | "daily" | "weekly" | "monthly";
export type JobStatus = "idle" | "running" | "completed" | "failed";
export type OutputFormat = "json" | "csv";

export interface ReportJob {
  id: string;
  workspace_id: string;
  integration_id: string | null;
  name: string;
  description: string | null;
  report_type: ReportType;
  source_config: Record<string, unknown>;
  schedule_type: ScheduleType;
  schedule_config: Record<string, unknown>;
  next_run_at: string | null;
  last_run_at: string | null;
  status: JobStatus;
  last_error: string | null;
  run_count: number;
  is_active: boolean;
  output_format: OutputFormat;
  notify_on_complete: boolean;
  notify_email: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportSnapshot {
  id: string;
  job_id: string;
  workspace_id: string;
  status: "pending" | "completed" | "failed";
  data: unknown[] | null;
  row_count: number;
  summary: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  date_from: string | null;
  date_to: string | null;
  created_at: string;
}

export interface ReportJobFormData {
  name: string;
  description?: string;
  report_type: ReportType;
  integration_id?: string;
  source_config: Record<string, unknown>;
  schedule_type: ScheduleType;
  schedule_config: Record<string, unknown>;
  output_format: OutputFormat;
  notify_on_complete: boolean;
  notify_email?: string;
}
