// ============================================================================
// Hook: useReports — Report jobs CRUD, snapshots, run/preview
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getEdgeFunctionUrl } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ReportJob, ReportSnapshot, ReportJobFormData } from "@/types/reports";

function jobsKey(workspaceId: string) { return ["report-jobs", workspaceId]; }
function snapshotsKey(jobId: string) { return ["report-snapshots", jobId]; }

async function fetchJobs(workspaceId: string): Promise<ReportJob[]> {
  const { data, error } = await supabase
    .from("report_jobs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function createJob(workspaceId: string, userId: string, payload: ReportJobFormData): Promise<ReportJob> {
  const { data, error } = await supabase
    .from("report_jobs")
    .insert({ ...payload, workspace_id: workspaceId, created_by: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateJob(id: string, payload: Partial<ReportJobFormData & { is_active: boolean }>): Promise<ReportJob> {
  const { data, error } = await supabase
    .from("report_jobs").update(payload).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase
    .from("report_jobs").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

async function runJob(jobId: string): Promise<{ success: boolean; snapshot_id?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await fetch(getEdgeFunctionUrl("report-scheduler/run"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ job_id: jobId }),
  });
  return res.json();
}

async function fetchSnapshots(jobId: string): Promise<ReportSnapshot[]> {
  const { data, error } = await supabase
    .from("report_snapshots")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data || [];
}

export function useReportJobs(workspaceId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: jobsKey(workspaceId),
    queryFn: () => fetchJobs(workspaceId),
    enabled: !!workspaceId,
  });

  const createMut = useMutation({
    mutationFn: (p: ReportJobFormData) => createJob(workspaceId, user!.id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobsKey(workspaceId) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...p }: { id: string } & Partial<ReportJobFormData & { is_active: boolean }>) => updateJob(id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobsKey(workspaceId) }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: jobsKey(workspaceId) }),
  });

  const runMut = useMutation({
    mutationFn: runJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: jobsKey(workspaceId) }),
  });

  return {
    jobs: query.data || [],
    isLoading: query.isLoading,
    createJob: createMut.mutateAsync,
    isCreating: createMut.isPending,
    updateJob: updateMut.mutateAsync,
    deleteJob: deleteMut.mutateAsync,
    runJob: runMut.mutateAsync,
    isRunning: runMut.isPending,
    runResult: runMut.data,
  };
}

export function useSnapshots(jobId: string | null) {
  return useQuery({
    queryKey: snapshotsKey(jobId || ""),
    queryFn: () => fetchSnapshots(jobId!),
    enabled: !!jobId,
    refetchInterval: 10000,
  });
}
