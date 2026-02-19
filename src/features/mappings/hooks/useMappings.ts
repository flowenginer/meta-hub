// ============================================================================
// Hook: useMappings — Mapping CRUD + test/preview with TanStack Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Mapping, MappingFormData, PreviewResult, MappingRule } from "@/types/mappings";

function mappingsKey(workspaceId: string) {
  return ["mappings", workspaceId];
}

async function fetchMappings(workspaceId: string): Promise<Mapping[]> {
  const { data, error } = await supabase
    .from("mappings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function createMapping(
  workspaceId: string,
  userId: string,
  payload: MappingFormData
): Promise<Mapping> {
  const { data, error } = await supabase
    .from("mappings")
    .insert({ ...payload, workspace_id: workspaceId, created_by: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function updateMapping(
  id: string,
  payload: Partial<MappingFormData & { is_active: boolean }>
): Promise<Mapping> {
  const { data, error } = await supabase
    .from("mappings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function deleteMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from("mappings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

async function testMapping(
  mappingId: string,
  payload: unknown
): Promise<PreviewResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("payload-transform/test"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ mapping_id: mappingId, payload }),
  });

  return res.json();
}

async function previewMapping(params: {
  rules: MappingRule[];
  payload: unknown;
  static_fields?: Record<string, unknown>;
  mode?: string;
  template?: string;
  pass_through?: boolean;
}): Promise<PreviewResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(getEdgeFunctionUrl("payload-transform/preview"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });

  return res.json();
}

export function useMappings(workspaceId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: mappingsKey(workspaceId),
    queryFn: () => fetchMappings(workspaceId),
    enabled: !!workspaceId,
  });

  const createMut = useMutation({
    mutationFn: (payload: MappingFormData) =>
      createMapping(workspaceId, user!.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mappingsKey(workspaceId) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<MappingFormData & { is_active: boolean }>) =>
      updateMapping(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mappingsKey(workspaceId) }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMapping,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mappingsKey(workspaceId) }),
  });

  const testMut = useMutation({
    mutationFn: ({ mappingId, payload }: { mappingId: string; payload: unknown }) =>
      testMapping(mappingId, payload),
  });

  const previewMut = useMutation({ mutationFn: previewMapping });

  return {
    mappings: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createMapping: createMut.mutateAsync,
    isCreating: createMut.isPending,
    updateMapping: updateMut.mutateAsync,
    isUpdating: updateMut.isPending,
    deleteMapping: deleteMut.mutateAsync,
    isDeleting: deleteMut.isPending,
    testMapping: testMut.mutateAsync,
    isTesting: testMut.isPending,
    testResult: testMut.data,
    previewMapping: previewMut.mutateAsync,
    isPreviewing: previewMut.isPending,
    previewResult: previewMut.data,
    refetch: query.refetch,
  };
}
