// ============================================================================
// Component: RouteForm — Create or edit a route
// ============================================================================

import { useState, useEffect } from "react";
import { useRoutes } from "@/features/destinations/hooks/useRoutes";
import { useDestinations } from "@/features/destinations/hooks/useDestinations";
import { useIntegrations, useMetaResources } from "@/features/integrations/hooks/useIntegrations";
import type { Route, SourceType, WhatsAppEventType, FilterRules } from "@/types/destinations";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  editingRoute: Route | null;
}

const sourceOptions: { value: SourceType; label: string }[] = [
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "forms", label: "📝 Formulários (Lead Gen)" },
  { value: "ads", label: "📊 Ads" },
  { value: "webhook", label: "🔗 Webhook genérico" },
];

const eventTypeOptions: { value: WhatsAppEventType; label: string; description: string }[] = [
  { value: "messages", label: "Mensagens", description: "Mensagens recebidas de contatos" },
  { value: "status_sent", label: "Status: Enviado", description: "Confirmação de envio" },
  { value: "status_delivered", label: "Status: Entregue", description: "Confirmação de entrega" },
  { value: "status_read", label: "Status: Lido", description: "Confirmação de leitura" },
];

export function RouteForm({ isOpen, onClose, workspaceId, editingRoute }: Props) {
  const { createRoute, isCreating, updateRoute, isUpdating } = useRoutes(workspaceId);
  const { destinations } = useDestinations(workspaceId);
  const { integrations } = useIntegrations(workspaceId);

  // Find connected Meta integration to load resources
  const metaIntegration = integrations.find(
    (i) => i.provider === "meta" && i.status === "connected"
  );
  const { whatsappNumbers, forms } = useMetaResources(metaIntegration?.id || "");

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("forms");
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [eventTypes, setEventTypes] = useState<WhatsAppEventType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRoute) {
      setName(editingRoute.name);
      setSourceType(editingRoute.source_type);
      setSourceId(editingRoute.source_id || "");
      setDestinationId(editingRoute.destination_id);
      setPriority(editingRoute.priority);
      setIsActive(editingRoute.is_active);
      setDescription(editingRoute.description || "");
      // Load filter_rules
      const rules = editingRoute.filter_rules as FilterRules | null;
      setEventTypes(rules?.event_types || []);
    } else {
      setName(""); setSourceType("forms"); setSourceId("");
      setDestinationId(""); setPriority(0); setIsActive(true); setDescription("");
      setEventTypes([]);
    }
    setError(null);
  }, [editingRoute, isOpen]);

  const handleEventTypeToggle = (eventType: WhatsAppEventType) => {
    setEventTypes((prev) =>
      prev.includes(eventType)
        ? prev.filter((t) => t !== eventType)
        : [...prev, eventType]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    if (!destinationId) {
      setError("Selecione um destino");
      return;
    }

    // Build filter_rules
    const filterRules: FilterRules | null =
      sourceType === "whatsapp" && eventTypes.length > 0
        ? { event_types: eventTypes }
        : null;

    const payload = {
      name: name.trim(),
      source_type: sourceType,
      source_id: sourceId.trim() || undefined,
      destination_id: destinationId,
      is_active: isActive,
      priority,
      filter_rules: filterRules,
      description: description.trim() || undefined,
    };

    try {
      if (editingRoute) {
        await updateRoute({ id: editingRoute.id, ...payload });
      } else {
        await createRoute(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const activeDestinations = destinations.filter((d) => d.is_active);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingRoute ? "Editar rota" : "Nova rota"}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>
        )}

        {activeDestinations.length === 0 && (
          <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md mb-4 text-sm">
            Crie um destino primeiro antes de configurar rotas.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da rota</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Forms → CRM, WhatsApp → n8n"
            />
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origem (source)</label>
            <select
              value={sourceType}
              onChange={(e) => {
                setSourceType(e.target.value as SourceType);
                setSourceId("");
                setEventTypes([]);
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Source ID — Dynamic based on source_type */}
          {sourceType === "whatsapp" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número WhatsApp
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os números</option>
                {whatsappNumbers.map((num) => (
                  <option key={num.phone_number_id} value={num.phone_number_id}>
                    {num.display_name || num.phone_number} ({num.phone_number})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecione um número específico ou deixe "Todos" para capturar de todos os números.
              </p>
            </div>
          )}

          {sourceType === "forms" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formulário
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os formulários</option>
                {forms.map((form) => (
                  <option key={form.form_id} value={form.form_id}>
                    {form.name || form.form_id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecione um formulário específico ou deixe "Todos" para capturar de todos.
              </p>
            </div>
          )}

          {sourceType !== "whatsapp" && sourceType !== "forms" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID específico (opcional)
              </label>
              <input
                type="text"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Deixe vazio para capturar todos do tipo"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ex: ad_account_id. Vazio = todos eventos deste tipo.
              </p>
            </div>
          )}

          {/* Event Type Filter — WhatsApp only */}
          {sourceType === "whatsapp" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipos de evento
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Selecione quais eventos encaminhar. Vazio = todos os eventos.
              </p>
              <div className="space-y-2 bg-gray-50 rounded-md p-3">
                {eventTypeOptions.map((opt) => (
                  <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventTypes.includes(opt.value)}
                      onChange={() => handleEventTypeToggle(opt.value)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm text-gray-900">{opt.label}</span>
                      <span className="text-xs text-gray-500 ml-1">— {opt.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecionar destino...</option>
              {activeDestinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name} ({dest.url})
                </option>
              ))}
            </select>
          </div>

          {/* Priority + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                min={0}
                max={100}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Rota ativa</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição da rota"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating || activeDestinations.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating || isUpdating ? "Salvando..." : editingRoute ? "Salvar" : "Criar rota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
