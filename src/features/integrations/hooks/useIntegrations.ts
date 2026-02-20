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
  SyncResponse,
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

/** Sync Meta resources manually */
async function syncResources(integrationId: string): Promise<SyncResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("meta-oauth/sync"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ integration_id: integrationId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to sync resources");
  return data;
}

/** Save a manually-generated access token (e.g. from Graph API Explorer) */
async function saveManualToken(workspaceId: string, accessToken: string): Promise<{
  success: boolean;
  integration_id: string;
  meta_user: { id: string; name: string };
  scopes: string[];
  token_type: string;
  sync: unknown;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("meta-oauth/manual-token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ workspace_id: workspaceId, access_token: accessToken }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save manual token");
  return data;
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
      // Also invalidate meta resources since refresh re-syncs
      queryClient.invalidateQueries({ queryKey: ["meta-resources"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationsKey(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ["meta-resources"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncResources,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationsKey(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ["meta-resources"] });
    },
  });

  const manualTokenMutation = useMutation({
    mutationFn: (accessToken: string) => saveManualToken(workspaceId, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationsKey(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ["meta-resources"] });
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
    syncResources: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    lastSyncResult: syncMutation.data,
    saveManualToken: manualTokenMutation.mutateAsync,
    isSavingManualToken: manualTokenMutation.isPending,
    manualTokenResult: manualTokenMutation.data,
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
