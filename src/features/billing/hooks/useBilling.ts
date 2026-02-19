// ============================================================================
// Hook: useBilling — Plans, subscription, usage, invoices
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import type { Plan, Subscription, UsageSummary, Invoice } from "@/types/billing";

function plansKey() { return ["plans"]; }
function subKey(wsId: string) { return ["subscription", wsId]; }
function usageKey(wsId: string) { return ["usage-summary", wsId]; }
function invoicesKey(wsId: string) { return ["invoices", wsId]; }

async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch(getEdgeFunctionUrl("billing/plans"));
  const data = await res.json();
  return data.plans || [];
}

async function fetchSubscription(workspaceId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "trial", "past_due"])
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function fetchUsageSummary(workspaceId: string): Promise<UsageSummary | null> {
  const { data, error } = await supabase.rpc("get_usage_summary", {
    _workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

async function fetchInvoices(workspaceId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw new Error(error.message);
  return data || [];
}

async function subscribe(workspaceId: string, planSlug: string, cycle: string): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await fetch(getEdgeFunctionUrl("billing/subscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ workspace_id: workspaceId, plan_slug: planSlug, billing_cycle: cycle }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Subscribe failed");
  return data;
}

async function cancelSubscription(workspaceId: string): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await fetch(getEdgeFunctionUrl("billing/cancel"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ workspace_id: workspaceId }),
  });
  return res.json();
}

export function usePlans() {
  return useQuery({ queryKey: plansKey(), queryFn: fetchPlans, staleTime: 300000 });
}

export function useSubscription(workspaceId: string) {
  return useQuery({
    queryKey: subKey(workspaceId),
    queryFn: () => fetchSubscription(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useUsageSummary(workspaceId: string) {
  return useQuery({
    queryKey: usageKey(workspaceId),
    queryFn: () => fetchUsageSummary(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 60000,
  });
}

export function useInvoices(workspaceId: string) {
  return useQuery({
    queryKey: invoicesKey(workspaceId),
    queryFn: () => fetchInvoices(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useSubscribe(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planSlug, cycle }: { planSlug: string; cycle: string }) =>
      subscribe(workspaceId, planSlug, cycle),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subKey(workspaceId) });
      qc.invalidateQueries({ queryKey: usageKey(workspaceId) });
    },
  });
}

export function useCancelSubscription(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelSubscription(workspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: subKey(workspaceId) }),
  });
}
