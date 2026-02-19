// ============================================================================
// Page: Alerts — Alert rules + triggered alerts history
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAlertRules, useAlertHistory } from "@/features/logs/hooks/useAlerts";
import { AlertRuleForm } from "./AlertRuleForm";
import type { AlertRule } from "@/types/logs";

const conditionLabels: Record<string, string> = {
  error_rate: "Taxa de erro",
  dlq_threshold: "Limiar DLQ",
  latency_threshold: "Latência alta",
  no_events: "Sem eventos",
  consecutive_fails: "Falhas consecutivas",
  custom: "Custom",
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  triggered: { label: "Disparado", color: "text-red-700", bg: "bg-red-50" },
  acknowledged: { label: "Visto", color: "text-yellow-700", bg: "bg-yellow-50" },
  resolved: { label: "Resolvido", color: "text-green-700", bg: "bg-green-50" },
};

type TabView = "rules" | "history";

export function AlertsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [tab, setTab] = useState<TabView>("rules");
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const rules = useAlertRules(workspaceId!);
  const history = useAlertHistory(workspaceId!);

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Excluir esta regra de alerta?")) return;
    await rules.deleteRule(id);
  };

  const handleToggleRule = async (rule: AlertRule) => {
    await rules.updateRule({ id: rule.id, is_active: !rule.is_active });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Alertas</h2>
        {tab === "rules" && (
          <button
            onClick={() => { setEditingRule(null); setShowForm(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            + Nova regra
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setTab("rules")}
          className={`pb-2 text-sm font-medium border-b-2 ${
            tab === "rules" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          Regras ({rules.rules.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-1 ${
            tab === "history" ? "border-red-600 text-red-600" : "border-transparent text-gray-500"
          }`}
        >
          Histórico
          {history.unresolvedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">
              {history.unresolvedCount}
            </span>
          )}
        </button>
      </div>

      {/* Rules Tab */}
      {tab === "rules" && (
        <div className="space-y-3">
          {rules.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : rules.rules.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center">
              <div className="text-3xl mb-2">🔔</div>
              <p className="text-sm text-gray-500 mb-4">
                Nenhuma regra de alerta configurada. Crie regras para monitorar erros, DLQ, latência e mais.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Criar regra
              </button>
            </div>
          ) : (
            rules.rules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white border rounded-lg p-4 ${!rule.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{rule.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rule.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                      }`}>
                        {rule.is_active ? "Ativo" : "Inativo"}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                        {conditionLabels[rule.condition_type]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {rule.description || JSON.stringify(rule.condition_config)}
                      {" · "}Cooldown: {rule.cooldown_minutes}min
                      {rule.trigger_count > 0 && ` · ${rule.trigger_count}× disparado`}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {rule.notify_channels.map((ch) => (
                        <span key={ch} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">
                          {ch === "in_app" ? "📱" : ch === "email" ? "📧" : ch === "webhook" ? "🔗" : "💬"} {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => handleToggleRule(rule)} className="p-1.5 text-gray-400 hover:text-yellow-600">
                      {rule.is_active ? "⏸" : "▶"}
                    </button>
                    <button
                      onClick={() => { setEditingRule(rule); setShowForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div>
          {history.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : history.history.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-500">
              Nenhum alerta disparado
            </div>
          ) : (
            <div className="space-y-2">
              {history.history.map((alert) => {
                const st = statusConfig[alert.status] || statusConfig.triggered;
                return (
                  <div key={alert.id} className={`bg-white border rounded-lg p-4 ${st.bg}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.color}`}>
                            {st.label}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {alert.alert_rule?.name || "Regra removida"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        {alert.notified_via.length > 0 && (
                          <div className="text-[10px] text-gray-400 mt-1">
                            Notificado via: {alert.notified_via.join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {alert.status === "triggered" && (
                          <button
                            onClick={() => history.acknowledgeAlert(alert.id)}
                            disabled={history.isAcknowledging}
                            className="text-xs px-3 py-1 text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200 disabled:opacity-50"
                          >
                            👁 Visto
                          </button>
                        )}
                        {(alert.status === "triggered" || alert.status === "acknowledged") && (
                          <button
                            onClick={() => history.resolveAlert(alert.id)}
                            disabled={history.isResolving}
                            className="text-xs px-3 py-1 text-green-700 bg-green-100 rounded-md hover:bg-green-200 disabled:opacity-50"
                          >
                            ✅ Resolver
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Condition Snapshot */}
                    {Object.keys(alert.condition_snapshot).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-gray-500 cursor-pointer">Ver snapshot</summary>
                        <pre className="text-[10px] bg-gray-900 text-green-400 p-2 rounded mt-1 overflow-auto max-h-20 whitespace-pre-wrap">
                          {JSON.stringify(alert.condition_snapshot, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <AlertRuleForm
          workspaceId={workspaceId!}
          rule={editingRule}
          onClose={() => { setShowForm(false); setEditingRule(null); }}
        />
      )}
    </div>
  );
}
