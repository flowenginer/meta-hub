// ============================================================================
// Page: Reports — Ads/Forms report jobs with snapshots
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useReportJobs, useSnapshots } from "@/features/reports/hooks/useReports";
import { ReportJobForm } from "./ReportJobForm";
import type { ReportJob } from "@/types/reports";

const typeLabels: Record<string, { label: string; emoji: string }> = {
  ads_insights: { label: "Ads Insights", emoji: "📊" },
  ads_spend: { label: "Ads Spend", emoji: "💰" },
  forms_leads: { label: "Forms Leads", emoji: "📝" },
  forms_summary: { label: "Forms Summary", emoji: "📋" },
  combined: { label: "Combinado", emoji: "🔗" },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: "Idle", color: "text-gray-600", bg: "bg-gray-100" },
  running: { label: "Rodando", color: "text-blue-700", bg: "bg-blue-100" },
  completed: { label: "OK", color: "text-green-700", bg: "bg-green-100" },
  failed: { label: "Falhou", color: "text-red-700", bg: "bg-red-100" },
};

const scheduleLabels: Record<string, string> = {
  manual: "Manual",
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

export function ReportsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { jobs, isLoading, runJob, isRunning, deleteJob, updateJob } = useReportJobs(workspaceId!);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<ReportJob | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const snapshots = useSnapshots(selectedJobId);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este relatório?")) return;
    await deleteJob(id);
  };

  const handleRun = async (id: string) => {
    await runJob(id);
    setSelectedJobId(id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
        <button
          onClick={() => { setEditingJob(null); setShowForm(true); }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Novo relatório
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum relatório configurado</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Crie relatórios para buscar insights de Ads, leads de formulários, ou dados combinados do Meta.
          </p>
          <button onClick={() => setShowForm(true)}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Criar relatório
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-2 space-y-3">
            {jobs.map((job) => {
              const tp = typeLabels[job.report_type] || { label: job.report_type, emoji: "📄" };
              const st = statusConfig[job.status] || statusConfig.idle;
              const isSelected = selectedJobId === job.id;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(isSelected ? null : job.id)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected ? "ring-2 ring-blue-500" : "hover:bg-gray-50"
                  } ${!job.is_active ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{tp.emoji}</span>
                        <h3 className="font-medium text-gray-900">{job.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${st.bg} ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">
                          {scheduleLabels[job.schedule_type]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {tp.label}
                        {job.run_count > 0 && ` · ${job.run_count} execuções`}
                        {job.last_run_at && ` · Último: ${new Date(job.last_run_at).toLocaleString("pt-BR")}`}
                      </div>
                      {job.last_error && (
                        <div className="text-xs text-red-500 mt-1 truncate">{job.last_error}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRun(job.id)}
                        disabled={isRunning || job.status === "running"}
                        className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
                      >
                        {job.status === "running" ? "⏳" : "▶"} Executar
                      </button>
                      <button
                        onClick={() => updateJob({ id: job.id, is_active: !job.is_active })}
                        className="p-1.5 text-gray-400 hover:text-yellow-600"
                      >
                        {job.is_active ? "⏸" : "▶"}
                      </button>
                      <button
                        onClick={() => { setEditingJob(job); setShowForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600"
                      >
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(job.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Snapshots Panel */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {selectedJobId ? "Histórico de execuções" : "Selecione um relatório"}
            </h3>

            {!selectedJobId ? (
              <p className="text-xs text-gray-400 text-center py-8">
                Clique em um relatório para ver o histórico
              </p>
            ) : snapshots.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              </div>
            ) : !snapshots.data || snapshots.data.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Nenhuma execução ainda</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {snapshots.data.map((snap) => (
                  <details key={snap.id} className="border rounded-lg">
                    <summary className="px-3 py-2 cursor-pointer text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          snap.status === "completed" ? "bg-green-500" :
                          snap.status === "failed" ? "bg-red-500" : "bg-yellow-500"
                        }`} />
                        <span>{new Date(snap.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <span className="text-gray-400">
                        {snap.row_count} rows · {snap.duration_ms || "—"}ms
                      </span>
                    </summary>
                    <div className="px-3 pb-3">
                      {snap.error_message && (
                        <div className="text-xs text-red-500 mb-2">{snap.error_message}</div>
                      )}
                      {snap.summary && Object.keys(snap.summary).length > 0 && (
                        <div className="mb-2">
                          <div className="text-[10px] font-medium text-gray-500 mb-1">Resumo</div>
                          <pre className="text-[10px] bg-gray-50 p-2 rounded overflow-auto max-h-20 whitespace-pre-wrap">
                            {JSON.stringify(snap.summary, null, 2)}
                          </pre>
                        </div>
                      )}
                      {snap.data && (
                        <div>
                          <div className="text-[10px] font-medium text-gray-500 mb-1">
                            Dados ({snap.row_count} registros)
                          </div>
                          <pre className="text-[10px] bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                            {JSON.stringify(snap.data.slice(0, 5), null, 2)}
                            {snap.row_count > 5 && `\n... +${snap.row_count - 5} registros`}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <ReportJobForm
          workspaceId={workspaceId!}
          job={editingJob}
          onClose={() => { setShowForm(false); setEditingJob(null); }}
        />
      )}
    </div>
  );
}
