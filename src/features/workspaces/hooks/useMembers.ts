// ============================================================================
// Hook: useMembers — Workspace Members CRUD with TanStack Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { WorkspaceMember, Role } from "@/types/auth";

function membersKey(workspaceId: string) {
  return ["workspace-members", workspaceId];
}

/** Fetch members for a workspace (with user details) */
async function fetchMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      *,
      user:users(id, email, full_name, avatar_url)
    `
    )
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/** Update a member's role */
async function updateMemberRole(
  memberId: string,
  role: Role
): Promise<WorkspaceMember> {
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Remove a member (soft delete) */
async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .update({ deleted_at: new Date().toISOString(), status: "inactive" as string })
    .eq("id", memberId);

  if (error) throw new Error(error.message);
}

export function useMembers(workspaceId: string) {
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: membersKey(workspaceId),
    queryFn: () => fetchMembers(workspaceId),
    enabled: !!workspaceId,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(workspaceId) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(workspaceId) });
    },
  });

  return {
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    removeMember: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    refetch: membersQuery.refetch,
  };
}
