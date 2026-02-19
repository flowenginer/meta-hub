// ============================================================================
// Component: RouteForm — Create or edit a route
// ============================================================================

import { useState, useEffect } from "react";
import { useRoutes } from "@/features/destinations/hooks/useRoutes";
import { useDestinations } from "@/features/destinations/hooks/useDestinations";
import type { Route, SourceType } from "@/types/destinations";

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

export function RouteForm({ isOpen, onClose, workspaceId, editingRoute }: Props) {
  const { createRoute, isCreating, updateRoute, isUpdating } = useRoutes(workspaceId);
  const { destinations } = useDestinations(workspaceId);

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("forms");
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
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
    } else {
      setName(""); setSourceType("forms"); setSourceId("");
      setDestinationId(""); setPriority(0); setIsActive(true); setDescription("");
    }
    setError(null);
  }, [editingRoute, isOpen]);

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

    const payload = {
      name: name.trim(),
      source_type: sourceType,
      source_id: sourceId.trim() || undefined,
      destination_id: destinationId,
      is_active: isActive,
      priority,
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
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
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Source ID (optional) */}
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
              Ex: form_id, phone_number_id, ad_account_id. Vazio = todos eventos deste tipo.
            </p>
          </div>

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
