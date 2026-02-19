// ============================================================================
// Hook: useAlerts — Alert rules CRUD + history with acknowledge/resolve
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { AlertRule, AlertHistory, AlertRuleFormData } from "@/types/logs";

function rulesKey(workspaceId: string) {
  return ["alert-rules", workspaceId];
}

function historyKey(workspaceId: string) {
  return ["alert-history", workspaceId];
}

// --- Alert Rules ---
async function fetchRules(workspaceId: string): Promise<AlertRule[]> {
  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function createRule(workspaceId: string, userId: string, payload: AlertRuleFormData): Promise<AlertRule> {
  const { data, error } = await supabase
    .from("alert_rules")
    .insert({ ...payload, workspace_id: workspaceId, created_by: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function updateRule(id: string, payload: Partial<AlertRuleFormData & { is_active: boolean }>): Promise<AlertRule> {
  const { data, error } = await supabase
    .from("alert_rules")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function deleteRule(id: string): Promise<void> {
  const { error } = await supabase
    .from("alert_rules")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// --- Alert History ---
async function fetchHistory(workspaceId: string): Promise<AlertHistory[]> {
  const { data, error } = await supabase
    .from("alert_history")
    .select("*, alert_rule:alert_rules(name, condition_type)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
}

async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  await fetch(getEdgeFunctionUrl("alert-evaluator/acknowledge"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ alert_id: alertId, user_id: userId }),
  });
}

async function resolveAlert(alertId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  await fetch(getEdgeFunctionUrl("alert-evaluator/resolve"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ alert_id: alertId }),
  });
}

// --- Hooks ---
export function useAlertRules(workspaceId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: rulesKey(workspaceId),
    queryFn: () => fetchRules(workspaceId),
    enabled: !!workspaceId,
  });

  const createMut = useMutation({
    mutationFn: (payload: AlertRuleFormData) => createRule(workspaceId, user!.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rulesKey(workspaceId) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<AlertRuleFormData & { is_active: boolean }>) =>
      updateRule(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rulesKey(workspaceId) }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rulesKey(workspaceId) }),
  });

  return {
    rules: query.data || [],
    isLoading: query.isLoading,
    createRule: createMut.mutateAsync,
    isCreating: createMut.isPending,
    updateRule: updateMut.mutateAsync,
    isUpdating: updateMut.isPending,
    deleteRule: deleteMut.mutateAsync,
    isDeleting: deleteMut.isPending,
  };
}

export function useAlertHistory(workspaceId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: historyKey(workspaceId),
    queryFn: () => fetchHistory(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 15000,
  });

  const ackMut = useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert(alertId, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKey(workspaceId) }),
  });

  const resolveMut = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKey(workspaceId) }),
  });

  const unresolvedCount = (query.data || []).filter(
    (a) => a.status === "triggered" || a.status === "acknowledged"
  ).length;

  return {
    history: query.data || [],
    isLoading: query.isLoading,
    unresolvedCount,
    acknowledgeAlert: ackMut.mutateAsync,
    isAcknowledging: ackMut.isPending,
    resolveAlert: resolveMut.mutateAsync,
    isResolving: resolveMut.isPending,
  };
}
