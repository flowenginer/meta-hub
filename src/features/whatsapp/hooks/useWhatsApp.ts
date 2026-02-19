// ============================================================================
// Hook: useWhatsApp — Conversations, messages, send, templates
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import type { WaConversation, WaMessage, WaTemplate, SendMessagePayload } from "@/types/whatsapp";

function conversationsKey(workspaceId: string) {
  return ["wa-conversations", workspaceId];
}

function messagesKey(conversationId: string) {
  return ["wa-messages", conversationId];
}

function templatesKey(workspaceId: string) {
  return ["wa-templates", workspaceId];
}

// --- Conversations ---
async function fetchConversations(workspaceId: string): Promise<WaConversation[]> {
  const { data, error } = await supabase
    .from("wa_conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
}

// --- Messages ---
async function fetchMessages(conversationId: string): Promise<WaMessage[]> {
  const { data, error } = await supabase
    .from("wa_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return data || [];
}

// --- Send ---
async function sendMessage(payload: SendMessagePayload): Promise<{ wamid: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("whatsapp/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Send failed");
  return data;
}

// --- Mark read ---
async function markRead(params: {
  workspace_id: string;
  phone_number_id: string;
  wamid: string;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  await fetch(getEdgeFunctionUrl("whatsapp/mark-read"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });
}

// --- Templates ---
async function fetchTemplates(workspaceId: string): Promise<WaTemplate[]> {
  const { data, error } = await supabase
    .from("wa_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("template_name");

  if (error) throw new Error(error.message);
  return data || [];
}

async function syncTemplates(workspaceId: string, wabaId: string): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("whatsapp/sync-templates"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ workspace_id: workspaceId, waba_id: wabaId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Sync failed");
  return data.synced || 0;
}

// --- Hooks ---
export function useConversations(workspaceId: string) {
  return useQuery({
    queryKey: conversationsKey(workspaceId),
    queryFn: () => fetchConversations(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 5000,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: messagesKey(conversationId || ""),
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 3000,
  });
}

export function useSendMessage(workspaceId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: conversationsKey(workspaceId) });
      // Invalidate messages for any active conversation
      queryClient.invalidateQueries({ queryKey: ["wa-messages"] });
    },
  });

  return {
    sendMessage: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  };
}

export function useMarkRead(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsKey(workspaceId) });
    },
  });
}

export function useTemplates(workspaceId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: templatesKey(workspaceId),
    queryFn: () => fetchTemplates(workspaceId),
    enabled: !!workspaceId,
  });

  const syncMut = useMutation({
    mutationFn: ({ wabaId }: { wabaId: string }) => syncTemplates(workspaceId, wabaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(workspaceId) }),
  });

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    syncTemplates: syncMut.mutateAsync,
    isSyncing: syncMut.isPending,
  };
}
