// ============================================================================
// Hook: useInvite — Send workspace invites via Edge Function
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import type { SendInvitePayload, SendInviteResponse, Invite } from "@/types/auth";

function invitesKey(workspaceId: string) {
  return ["invites", workspaceId];
}

/** Send invite via Edge Function */
async function sendInvite(payload: SendInvitePayload): Promise<SendInviteResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("invite-flow/send-invite"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to send invite");
  }

  return data;
}

/** Fetch pending invites for a workspace */
async function fetchInvites(workspaceId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .is("deleted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/** Revoke (soft delete) an invite */
async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from("invites")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
}

export function useInvites(workspaceId: string) {
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: invitesKey(workspaceId),
    queryFn: () => fetchInvites(workspaceId),
    enabled: !!workspaceId,
  });

  const sendMutation = useMutation({
    mutationFn: sendInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitesKey(workspaceId) });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitesKey(workspaceId) });
    },
  });

  return {
    invites: invitesQuery.data || [],
    isLoading: invitesQuery.isLoading,
    error: invitesQuery.error,
    sendInvite: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    revokeInvite: revokeMutation.mutateAsync,
    isRevoking: revokeMutation.isPending,
    refetch: invitesQuery.refetch,
  };
}
