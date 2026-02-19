// ============================================================================
// Component: AlertRuleForm — Create/Edit alert rule modal
// ============================================================================

import { useState, useEffect } from "react";
import { useAlertRules } from "@/features/logs/hooks/useAlerts";
import type { AlertRule, AlertConditionType, NotifyChannel } from "@/types/logs";

interface Props {
  workspaceId: string;
  rule: AlertRule | null;
  onClose: () => void;
}

const conditionOptions: { value: AlertConditionType; label: string; desc: string }[] = [
  { value: "error_rate", label: "Taxa de erro", desc: "% de entregas falhando em janela de tempo" },
  { value: "dlq_threshold", label: "Limiar DLQ", desc: "Quantidade de eventos na DLQ excede N" },
  { value: "latency_threshold", label: "Latência alta", desc: "Tempo médio de entrega > N ms" },
  { value: "no_events", label: "Sem eventos", desc: "Nenhum evento recebido em N minutos" },
  { value: "consecutive_fails", label: "Falhas consecutivas", desc: "N entregas consecutivas falharam" },
];

const channelOptions: { value: NotifyChannel; label: string }[] = [
  { value: "in_app", label: "📱 In-App" },
  { value: "email", label: "📧 Email" },
  { value: "webhook", label: "🔗 Webhook" },
];

export function AlertRuleForm({ workspaceId, rule, onClose }: Props) {
  const { createRule, isCreating, updateRule, isUpdating } = useAlertRules(workspaceId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionType, setConditionType] = useState<AlertConditionType>("error_rate");
  const [threshold, setThreshold] = useState(10);
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [channels, setChannels] = useState<NotifyChannel[]>(["in_app"]);
  const [email, setEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description || "");
      setConditionType(rule.condition_type);
      setThreshold((rule.condition_config.threshold as number) || (rule.condition_config.threshold_ms as number) || (rule.condition_config.minutes as number) || 10);
      setWindowMinutes((rule.condition_config.window_minutes as number) || 60);
      setChannels(rule.notify_channels);
      setEmail((rule.notify_config.email as string) || "");
      setWebhookUrl((rule.notify_config.webhook_url as string) || "");
      setCooldown(rule.cooldown_minutes);
    }
  }, [rule]);

  const buildConfig = (): Record<string, unknown> => {
    switch (conditionType) {
      case "error_rate":
        return { threshold, window_minutes: windowMinutes };
      case "dlq_threshold":
        return { threshold };
      case "latency_threshold":
        return { threshold_ms: threshold, window_minutes: windowMinutes };
      case "no_events":
        return { minutes: threshold };
      case "consecutive_fails":
        return { threshold };
      default:
        return {};
    }
  };

  const thresholdLabel = (): string => {
    switch (conditionType) {
      case "error_rate": return "Limiar (%)";
      case "dlq_threshold": return "Quantidade máxima";
      case "latency_threshold": return "Latência máxima (ms)";
      case "no_events": return "Minutos sem eventos";
      case "consecutive_fails": return "Falhas consecutivas";
      default: return "Limiar";
    }
  };

  const showWindow = ["error_rate", "latency_threshold"].includes(conditionType);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório"); return; }

    const notifyConfig: Record<string, unknown> = {};
    if (channels.includes("email") && email) notifyConfig.email = email;
    if (channels.includes("webhook") && webhookUrl) notifyConfig.webhook_url = webhookUrl;

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      condition_type: conditionType,
      condition_config: buildConfig(),
      notify_channels: channels,
      notify_config: notifyConfig,
      cooldown_minutes: cooldown,
    };

    try {
      if (rule) {
        await updateRule({ id: rule.id, ...payload });
      } else {
        await createRule(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleChannel = (ch: NotifyChannel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {rule ? "Editar regra" : "Nova regra de alerta"}
        </h3>

        {error && <div className="bg-red-50 text-red-700 p-2 rounded-md text-sm mb-4">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md" placeholder="Ex: Alerta DLQ alta" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md" placeholder="Opcional" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Condição</label>
            <select value={conditionType} onChange={(e) => setConditionType(e.target.value as AlertConditionType)}
              className="w-full px-3 py-2 text-sm border rounded-md">
              {conditionOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
              ))}
            </select>
          </div>

          <div className={`grid ${showWindow ? "grid-cols-2" : "grid-cols-1"} gap-4`}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{thresholdLabel()}</label>
              <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-md" min={1} />
            </div>
            {showWindow && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Janela (minutos)</label>
                <input type="number" value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border rounded-md" min={1} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Canais de notificação</label>
            <div className="flex gap-2">
              {channelOptions.map((ch) => (
                <button key={ch.value} onClick={() => toggleChannel(ch.value)}
                  className={`px-3 py-1.5 text-xs rounded-md border ${
                    channels.includes(ch.value) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white text-gray-600"
                  }`}>
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {channels.includes("email") && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email para alertas</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md" placeholder="admin@empresa.com" />
            </div>
          )}

          {channels.includes("webhook") && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
              <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md" placeholder="https://..." />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cooldown (minutos)</label>
            <input type="number" value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border rounded-md" min={1} />
            <p className="text-[10px] text-gray-400 mt-1">Tempo mínimo entre disparos da mesma regra</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isCreating || isUpdating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {isCreating || isUpdating ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
