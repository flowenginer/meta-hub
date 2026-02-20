// ============================================================================
// Hook: useIntegrations — Integration management with TanStack Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import type {
  Integration,
  MetaWhatsAppNumber,
  MetaAdAccount,
  MetaForm,
  StartOAuthResponse,
} from "@/types/integrations";

function integrationsKey(workspaceId: string) {
  return ["integrations", workspaceId];
}

function metaResourcesKey(integrationId: string) {
  return ["meta-resources", integrationId];
}

/** Fetch integrations for a workspace */
async function fetchIntegrations(workspaceId: string): Promise<Integration[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/** Start OAuth flow */
async function startOAuth(workspaceId: string): Promise<StartOAuthResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("meta-oauth/start"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ workspace_id: workspaceId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start OAuth");
  return data;
}

/** Refresh integration token */
async function refreshIntegration(integrationId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("meta-oauth/refresh"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ integration_id: integrationId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to refresh");
}

/** Disconnect integration */
async function disconnectIntegration(integrationId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("meta-oauth/disconnect"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ integration_id: integrationId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to disconnect");
}

/** Fetch Meta resources (WhatsApp, Ads, Forms) for an integration */
async function fetchMetaResources(integrationId: string) {
  const [waNumbers, adAccounts, forms] = await Promise.all([
    supabase
      .from("meta_whatsapp_numbers")
      .select("*")
      .eq("integration_id", integrationId)
      .is("deleted_at", null)
      .order("created_at"),
    supabase
      .from("meta_ad_accounts")
      .select("*")
      .eq("integration_id", integrationId)
      .is("deleted_at", null)
      .order("created_at"),
    supabase
      .from("meta_forms")
      .select("*")
      .eq("integration_id", integrationId)
      .is("deleted_at", null)
      .order("created_at"),
  ]);

  return {
    whatsappNumbers: (waNumbers.data || []) as MetaWhatsAppNumber[],
    adAccounts: (adAccounts.data || []) as MetaAdAccount[],
    forms: (forms.data || []) as MetaForm[],
  };
}

export function useIntegrations(workspaceId: string) {
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: integrationsKey(workspaceId),
    queryFn: () => fetchIntegrations(workspaceId),
    enabled: !!workspaceId,
  });

  const startOAuthMutation = useMutation({
    mutationFn: () => startOAuth(workspaceId),
    onSuccess: (data) => {
      // Redirect to Meta OAuth in the same window
      window.location.href = data.url;
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationsKey(workspaceId) });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationsKey(workspaceId) });
    },
  });

  return {
    integrations: integrationsQuery.data || [],
    isLoading: integrationsQuery.isLoading,
    error: integrationsQuery.error,
    startOAuth: startOAuthMutation.mutateAsync,
    isStartingOAuth: startOAuthMutation.isPending,
    refreshIntegration: refreshMutation.mutateAsync,
    isRefreshing: refreshMutation.isPending,
    disconnectIntegration: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
    refetch: integrationsQuery.refetch,
  };
}

export function useMetaResources(integrationId: string) {
  const query = useQuery({
    queryKey: metaResourcesKey(integrationId),
    queryFn: () => fetchMetaResources(integrationId),
    enabled: !!integrationId,
  });

  return {
    whatsappNumbers: query.data?.whatsappNumbers || [],
    adAccounts: query.data?.adAccounts || [],
    forms: query.data?.forms || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
