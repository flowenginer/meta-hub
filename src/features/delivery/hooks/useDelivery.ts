// ============================================================================
// Hook: useDelivery — Delivery events, DLQ, stats with TanStack Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import type { DeliveryEvent, DeliveryAttempt, DeliveryStatus } from "@/types/destinations";

function deliveryKey(workspaceId: string, filter?: string) {
  return ["delivery", workspaceId, filter];
}

function dlqKey(workspaceId: string) {
  return ["dlq", workspaceId];
}

function statsKey(workspaceId: string) {
  return ["delivery-stats", workspaceId];
}

interface DeliveryFilters {
  status?: DeliveryStatus;
  limit?: number;
  offset?: number;
}

async function fetchDeliveryEvents(
  workspaceId: string,
  filters: DeliveryFilters = {}
): Promise<DeliveryEvent[]> {
  let query = supabase
    .from("delivery_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(filters.limit || 50);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchDlqEvents(workspaceId: string): Promise<DeliveryEvent[]> {
  const { data, error } = await supabase
    .from("delivery_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "dlq")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchEventAttempts(eventId: string): Promise<DeliveryAttempt[]> {
  const { data, error } = await supabase
    .from("delivery_attempts")
    .select("*")
    .eq("event_id", eventId)
    .order("attempt_number", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchDeliveryStats(workspaceId: string) {
  const { data, error } = await supabase.rpc("get_delivery_stats", {
    _workspace_id: workspaceId,
    _hours: 24,
  });

  if (error) throw new Error(error.message);
  return data?.[0] || { total: 0, delivered: 0, failed: 0, pending: 0, dlq: 0, avg_duration_ms: 0 };
}

async function resendEvent(eventId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("delivery-worker/resend"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ event_id: eventId }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Resend failed");
  }
}

async function resendBulk(eventIds: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of eventIds) {
    try {
      await resendEvent(id);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

async function cancelEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from("delivery_events")
    .update({ status: "cancelled" })
    .eq("id", eventId)
    .in("status", ["pending", "failed", "dlq"]);

  if (error) throw new Error(error.message);
}

export function useDeliveryEvents(workspaceId: string, filters: DeliveryFilters = {}) {
  return useQuery({
    queryKey: deliveryKey(workspaceId, JSON.stringify(filters)),
    queryFn: () => fetchDeliveryEvents(workspaceId, filters),
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });
}

export function useDlqEvents(workspaceId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dlqKey(workspaceId),
    queryFn: () => fetchDlqEvents(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 15000,
  });

  const resendMut = useMutation({
    mutationFn: resendEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dlqKey(workspaceId) });
      queryClient.invalidateQueries({ queryKey: statsKey(workspaceId) });
    },
  });

  const resendBulkMut = useMutation({
    mutationFn: resendBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dlqKey(workspaceId) });
      queryClient.invalidateQueries({ queryKey: statsKey(workspaceId) });
    },
  });

  const cancelMut = useMutation({
    mutationFn: cancelEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dlqKey(workspaceId) });
      queryClient.invalidateQueries({ queryKey: statsKey(workspaceId) });
    },
  });

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    resendEvent: resendMut.mutateAsync,
    isResending: resendMut.isPending,
    resendBulk: resendBulkMut.mutateAsync,
    isResendingBulk: resendBulkMut.isPending,
    cancelEvent: cancelMut.mutateAsync,
    isCancelling: cancelMut.isPending,
    refetch: query.refetch,
  };
}

export function useEventAttempts(eventId: string | null) {
  return useQuery({
    queryKey: ["event-attempts", eventId],
    queryFn: () => fetchEventAttempts(eventId!),
    enabled: !!eventId,
  });
}

export function useDeliveryStats(workspaceId: string) {
  return useQuery({
    queryKey: statsKey(workspaceId),
    queryFn: () => fetchDeliveryStats(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}
