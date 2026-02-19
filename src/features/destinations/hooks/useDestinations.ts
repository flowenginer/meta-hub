// ============================================================================
// Hook: useDestinations — Destination CRUD with TanStack Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Destination, DestinationFormData, TestWebhookResult } from "@/types/destinations";

function destinationsKey(workspaceId: string) {
  return ["destinations", workspaceId];
}

async function fetchDestinations(workspaceId: string): Promise<Destination[]> {
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function createDestination(
  workspaceId: string,
  userId: string,
  payload: DestinationFormData
): Promise<Destination> {
  const { data, error } = await supabase
    .from("destinations")
    .insert({ ...payload, workspace_id: workspaceId, created_by: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function updateDestination(
  id: string,
  payload: Partial<DestinationFormData & { is_active: boolean }>
): Promise<Destination> {
  const { data, error } = await supabase
    .from("destinations")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function deleteDestination(id: string): Promise<void> {
  const { error } = await supabase
    .from("destinations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

async function testWebhook(destinationId: string): Promise<TestWebhookResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("delivery-worker/test"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ destination_id: destinationId }),
  });

  return res.json();
}

export function useDestinations(workspaceId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: destinationsKey(workspaceId),
    queryFn: () => fetchDestinations(workspaceId),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: DestinationFormData) =>
      createDestination(workspaceId, user!.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: destinationsKey(workspaceId) }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<DestinationFormData & { is_active: boolean }>) =>
      updateDestination(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: destinationsKey(workspaceId) }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDestination,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: destinationsKey(workspaceId) }),
  });

  const testMutation = useMutation({ mutationFn: testWebhook });

  return {
    destinations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createDestination: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateDestination: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteDestination: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    testWebhook: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
    testResult: testMutation.data,
    refetch: query.refetch,
  };
}
