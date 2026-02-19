// ============================================================================
// Hook: useWorkspaces — Workspace CRUD with TanStack Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Workspace } from "@/types/auth";
import type { CreateWorkspaceFormData } from "@/lib/schemas";

const WORKSPACES_KEY = ["workspaces"];

/** Fetch all workspaces the current user is a member of */
async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/** Create a new workspace and add owner as member (via SECURITY DEFINER RPC) */
async function createWorkspace(
  payload: CreateWorkspaceFormData,
  userId: string
): Promise<Workspace> {
  const { data: workspaceId, error } = await supabase.rpc(
    "create_workspace_with_owner",
    {
      _name: payload.name,
      _slug: payload.slug,
      _user_id: userId,
    }
  );

  if (error) throw new Error(error.message);

  // Fetch the created workspace
  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  return workspace;
}

/** Delete workspace (soft delete) */
async function deleteWorkspace(workspaceId: string): Promise<void> {
  const { error } = await supabase
    .from("workspaces")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", workspaceId);

  if (error) throw new Error(error.message);
}

/** Update workspace */
async function updateWorkspace(
  workspaceId: string,
  payload: Partial<Pick<Workspace, "name" | "slug" | "settings">>
): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .update(payload)
    .eq("id", workspaceId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export function useWorkspaces() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const workspacesQuery = useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: fetchWorkspaces,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkspaceFormData) =>
      createWorkspace(payload, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: string } & Partial<Pick<Workspace, "name" | "slug" | "settings">>) =>
      updateWorkspace(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });

  return {
    workspaces: workspacesQuery.data || [],
    isLoading: workspacesQuery.isLoading,
    error: workspacesQuery.error,
    createWorkspace: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateWorkspace: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteWorkspace: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    refetch: workspacesQuery.refetch,
  };
}
