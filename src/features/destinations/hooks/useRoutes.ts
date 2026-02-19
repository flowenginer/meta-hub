// ============================================================================
// Hook: useRoutes — Route CRUD with TanStack Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Route, RouteFormData } from "@/types/destinations";

function routesKey(workspaceId: string) {
  return ["routes", workspaceId];
}

async function fetchRoutes(workspaceId: string): Promise<Route[]> {
  const { data, error } = await supabase
    .from("routes")
    .select(`
      *,
      destination:destinations(id, name, url, is_active)
    `)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("priority", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function createRoute(
  workspaceId: string,
  userId: string,
  payload: RouteFormData
): Promise<Route> {
  const { data, error } = await supabase
    .from("routes")
    .insert({
      ...payload,
      workspace_id: workspaceId,
      created_by: userId,
      source_id: payload.source_id || null,
    })
    .select(`*, destination:destinations(id, name, url, is_active)`)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function updateRoute(
  id: string,
  payload: Partial<RouteFormData>
): Promise<Route> {
  const { data, error } = await supabase
    .from("routes")
    .update(payload)
    .eq("id", id)
    .select(`*, destination:destinations(id, name, url, is_active)`)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function deleteRoute(id: string): Promise<void> {
  const { error } = await supabase
    .from("routes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export function useRoutes(workspaceId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: routesKey(workspaceId),
    queryFn: () => fetchRoutes(workspaceId),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: RouteFormData) =>
      createRoute(workspaceId, user!.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routesKey(workspaceId) }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<RouteFormData>) =>
      updateRoute(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routesKey(workspaceId) }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routesKey(workspaceId) }),
  });

  return {
    routes: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createRoute: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateRoute: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteRoute: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    refetch: query.refetch,
  };
}
