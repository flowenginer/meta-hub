// ============================================================================
// Component: ReportJobForm — Create/Edit report job modal
// ============================================================================

import { useState, useEffect } from "react";
import { useReportJobs } from "@/features/reports/hooks/useReports";
import type { ReportJob, ReportType, ScheduleType } from "@/types/reports";

interface Props {
  workspaceId: string;
  job: ReportJob | null;
  onClose: () => void;
}

const reportTypes: { value: ReportType; label: string; emoji: string }[] = [
  { value: "ads_insights", label: "Ads Insights — métricas de campanhas", emoji: "📊" },
  { value: "ads_spend", label: "Ads Spend — resumo de gastos", emoji: "💰" },
  { value: "forms_leads", label: "Forms Leads — leads de formulários", emoji: "📝" },
  { value: "forms_summary", label: "Forms Summary — performance de forms", emoji: "📋" },
  { value: "combined", label: "Combinado — Ads + Forms", emoji: "🔗" },
];

const scheduleTypes: { value: ScheduleType; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

export function ReportJobForm({ workspaceId, job, onClose }: Props) {
  const { createJob, isCreating, updateJob } = useReportJobs(workspaceId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState<ReportType>("ads_insights");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("manual");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  // Source config
  const [adAccountId, setAdAccountId] = useState("");
  const [level, setLevel] = useState("campaign");
  const [datePreset, setDatePreset] = useState("last_7d");
  const [formIds, setFormIds] = useState("");
  // Notify
  const [notifyOnComplete, setNotifyOnComplete] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job) {
      setName(job.name);
      setDescription(job.description || "");
      setReportType(job.report_type);
      setScheduleType(job.schedule_type);
      setScheduleTime((job.schedule_config.time as string) || "08:00");
      setDayOfWeek((job.schedule_config.day_of_week as number) || 1);
      setDayOfMonth((job.schedule_config.day_of_month as number) || 1);
      setAdAccountId((job.source_config.ad_account_id as string) || "");
      setLevel((job.source_config.level as string) || "campaign");
      setDatePreset((job.source_config.date_preset as string) || "last_7d");
      setFormIds(((job.source_config.form_ids as string[]) || []).join(", "));
      setNotifyOnComplete(job.notify_on_complete);
      setNotifyEmail(job.notify_email || "");
    }
  }, [job]);

  const isAdsType = ["ads_insights", "ads_spend", "combined"].includes(reportType);
  const isFormsType = ["forms_leads", "forms_summary", "combined"].includes(reportType);

  const buildSourceConfig = (): Record<string, unknown> => {
    const config: Record<string, unknown> = {};
    if (isAdsType) {
      config.ad_account_id = adAccountId.trim();
      config.level = level;
      config.date_preset = datePreset;
      config.fields = [
        "campaign_name", "adset_name", "ad_name",
        "impressions", "clicks", "spend", "cpc", "cpm", "ctr", "reach", "actions",
      ];
    }
    if (isFormsType) {
      config.form_ids = formIds.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return config;
  };

  const buildScheduleConfig = (): Record<string, unknown> => {
    if (scheduleType === "manual") return {};
    const config: Record<string, unknown> = {
      time: scheduleTime,
      timezone: "America/Sao_Paulo",
    };
    if (scheduleType === "weekly") config.day_of_week = dayOfWeek;
    if (scheduleType === "monthly") config.day_of_month = dayOfMonth;
    return config;
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    if (isAdsType && !adAccountId.trim()) { setError("Ad Account ID é obrigatório"); return; }
    if (isFormsType && !formIds.trim()) { setError("Form IDs são obrigatórios"); return; }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      report_type: reportType,
      source_config: buildSourceConfig(),
      schedule_type: scheduleType,
      schedule_config: buildScheduleConfig(),
      output_format: "json" as const,
      notify_on_complete: notifyOnComplete,
      notify_email: notifyEmail.trim() || undefined,
    };

    try {
      if (job) {
        await updateJob({ id: job.id, ...payload });
      } else {
        await createJob(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {job ? "Editar relatório" : "Novo relatório"}
        </h3>

        {error && <div className="bg-red-50 text-red-700 p-2 rounded-md text-sm mb-4">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md" placeholder="Ex: Relatório semanal de Ads" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md" placeholder="Opcional" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de relatório</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2 text-sm border rounded-md">
              {reportTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>

          {/* Ads Config */}
          {isAdsType && (
            <div className="bg-blue-50 p-3 rounded-lg space-y-3">
              <div className="text-xs font-medium text-blue-700">📊 Configuração Ads</div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ad Account ID</label>
                <input type="text" value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border rounded-md" placeholder="act_123456789" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Nível</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border rounded-md">
                    <option value="campaign">Campanha</option>
                    <option value="adset">Conjunto</option>
                    <option value="ad">Anúncio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Período</label>
                  <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border rounded-md">
                    <option value="today">Hoje</option>
                    <option value="yesterday">Ontem</option>
                    <option value="last_3d">Últimos 3 dias</option>
                    <option value="last_7d">Últimos 7 dias</option>
                    <option value="last_14d">Últimos 14 dias</option>
                    <option value="last_30d">Últimos 30 dias</option>
                    <option value="this_month">Este mês</option>
                    <option value="last_month">Mês passado</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Forms Config */}
          {isFormsType && (
            <div className="bg-green-50 p-3 rounded-lg space-y-3">
              <div className="text-xs font-medium text-green-700">📝 Configuração Forms</div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Form IDs (separados por vírgula)</label>
                <input type="text" value={formIds} onChange={(e) => setFormIds(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border rounded-md" placeholder="123456, 789012" />
              </div>
            </div>
          )}

          {/* Schedule */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agendamento</label>
            <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
              className="w-full px-3 py-2 text-sm border rounded-md">
              {scheduleTypes.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {scheduleType !== "manual" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Horário</label>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border rounded-md" />
              </div>
              {scheduleType === "weekly" && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Dia da semana</label>
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border rounded-md">
                    <option value={1}>Segunda</option>
                    <option value={2}>Terça</option>
                    <option value={3}>Quarta</option>
                    <option value={4}>Quinta</option>
                    <option value={5}>Sexta</option>
                    <option value={6}>Sábado</option>
                    <option value={7}>Domingo</option>
                  </select>
                </div>
              )}
              {scheduleType === "monthly" && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Dia do mês</label>
                  <input type="number" value={dayOfMonth} min={1} max={28}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border rounded-md" />
                </div>
              )}
            </div>
          )}

          {/* Notification */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={notifyOnComplete}
                onChange={(e) => setNotifyOnComplete(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Notificar ao completar</span>
            </label>
          </div>

          {notifyOnComplete && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Email de notificação</label>
              <input type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border rounded-md" placeholder="relatorios@empresa.com" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {isCreating ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
