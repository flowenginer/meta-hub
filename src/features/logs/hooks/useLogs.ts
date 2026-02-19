// ============================================================================
// Hook: useLogs — Event logs with filtering and pagination
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EventLog, LogLevel, LogCategory } from "@/types/logs";

export interface LogFilters {
  level?: LogLevel;
  category?: LogCategory;
  search?: string;
  limit?: number;
  offset?: number;
}

function logsKey(workspaceId: string, filters: LogFilters) {
  return ["logs", workspaceId, JSON.stringify(filters)];
}

async function fetchLogs(workspaceId: string, filters: LogFilters = {}): Promise<EventLog[]> {
  let query = supabase
    .from("event_logs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(filters.limit || 100);

  if (filters.level) query = query.eq("level", filters.level);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.search) query = query.ilike("message", `%${filters.search}%`);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export function useLogs(workspaceId: string, filters: LogFilters = {}) {
  return useQuery({
    queryKey: logsKey(workspaceId, filters),
    queryFn: () => fetchLogs(workspaceId, filters),
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });
}
