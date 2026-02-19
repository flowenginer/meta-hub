// ============================================================================
// Page: Delivery — Dashboard with stats, recent events, and DLQ management
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useDeliveryEvents,
  useDeliveryStats,
  useDlqEvents,
} from "@/features/delivery/hooks/useDelivery";
import { EventDetailPanel } from "./EventDetailPanel";
import type { DeliveryEvent, DeliveryStatus } from "@/types/destinations";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendente", color: "text-yellow-800", bg: "bg-yellow-100" },
  processing: { label: "Processando", color: "text-blue-800", bg: "bg-blue-100" },
  delivered: { label: "Entregue", color: "text-green-800", bg: "bg-green-100" },
  failed: { label: "Falhou", color: "text-orange-800", bg: "bg-orange-100" },
  dlq: { label: "DLQ", color: "text-red-800", bg: "bg-red-100" },
  cancelled: { label: "Cancelado", color: "text-gray-800", bg: "bg-gray-100" },
};

type TabView = "all" | "dlq";

export function DeliveryPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [tab, setTab] = useState<TabView>("all");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "">("");
  const [selectedEvent, setSelectedEvent] = useState<DeliveryEvent | null>(null);

  const stats = useDeliveryStats(workspaceId!);
  const events = useDeliveryEvents(workspaceId!, {
    status: statusFilter || undefined,
    limit: 50,
  });
  const dlq = useDlqEvents(workspaceId!);

  const statData = stats.data || { total: 0, delivered: 0, failed: 0, pending: 0, dlq: 0 };

  const handleResendAll = async () => {
    if (!dlq.events.length) return;
    if (!confirm(`Reenviar ${dlq.events.length} eventos da DLQ?`)) return;
    const ids = dlq.events.map((e) => e.id);
    await dlq.resendBulk(ids);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Entregas</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total (24h)", value: statData.total, color: "text-gray-900" },
          { label: "Entregues", value: statData.delivered, color: "text-green-600" },
          { label: "Pendentes", value: statData.pending, color: "text-yellow-600" },
          { label: "Falhas", value: statData.failed, color: "text-orange-600" },
          { label: "DLQ", value: statData.dlq, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setTab("all")}
          className={`pb-2 text-sm font-medium border-b-2 ${
            tab === "all" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          Todos os eventos
        </button>
        <button
          onClick={() => setTab("dlq")}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-1 ${
            tab === "dlq" ? "border-red-600 text-red-600" : "border-transparent text-gray-500"
          }`}
        >
          DLQ
          {statData.dlq > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">
              {statData.dlq}
            </span>
          )}
        </button>
      </div>

      {/* All Events Tab */}
      {tab === "all" && (
        <div>
          {/* Filter */}
          <div className="flex items-center gap-2 mb-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | "")}
              className="px-3 py-1.5 text-xs border rounded-md"
            >
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="delivered">Entregue</option>
              <option value="failed">Falhou</option>
              <option value="dlq">DLQ</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <span className="text-xs text-gray-500">
              {events.data?.length || 0} eventos
            </span>
          </div>

          <EventTable
            events={events.data || []}
            isLoading={events.isLoading}
            onSelect={setSelectedEvent}
            selectedId={selectedEvent?.id}
          />
        </div>
      )}

      {/* DLQ Tab */}
      {tab === "dlq" && (
        <div>
          {dlq.events.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">
                {dlq.events.length} evento{dlq.events.length !== 1 ? "s" : ""} na DLQ
              </span>
              <button
                onClick={handleResendAll}
                disabled={dlq.isResendingBulk}
                className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {dlq.isResendingBulk ? "Reenviando..." : "🔄 Reenviar todos"}
              </button>
            </div>
          )}

          <EventTable
            events={dlq.events}
            isLoading={dlq.isLoading}
            onSelect={setSelectedEvent}
            selectedId={selectedEvent?.id}
            showActions
            onResend={(id) => dlq.resendEvent(id)}
            onCancel={(id) => dlq.cancelEvent(id)}
            isResending={dlq.isResending}
          />
        </div>
      )}

      {/* Detail Panel */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onResend={
            ["failed", "dlq"].includes(selectedEvent.status)
              ? () => dlq.resendEvent(selectedEvent.id)
              : undefined
          }
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: EventTable
// ---------------------------------------------------------------------------
interface EventTableProps {
  events: DeliveryEvent[];
  isLoading: boolean;
  onSelect: (event: DeliveryEvent) => void;
  selectedId?: string;
  showActions?: boolean;
  onResend?: (id: string) => void;
  onCancel?: (id: string) => void;
  isResending?: boolean;
}

function EventTable({
  events,
  isLoading,
  onSelect,
  selectedId,
  showActions,
  onResend,
  onCancel,
  isResending,
}: EventTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500 text-sm">
        Nenhum evento encontrado
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Origem</th>
            <th className="text-left px-4 py-2">Tentativas</th>
            <th className="text-left px-4 py-2">Erro</th>
            <th className="text-left px-4 py-2">Criado</th>
            {showActions && <th className="text-right px-4 py-2">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {events.map((event) => {
            const st = statusConfig[event.status] || statusConfig.pending;
            return (
              <tr
                key={event.id}
                onClick={() => onSelect(event)}
                className={`cursor-pointer hover:bg-gray-50 text-sm ${
                  selectedId === event.id ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.color}`}>
                    {st.label}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-700">{event.source_type}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  {event.attempts_count}/{event.max_attempts}
                </td>
                <td className="px-4 py-2.5 text-gray-500 truncate max-w-[200px]">
                  {event.error_message || "—"}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {new Date(event.created_at).toLocaleString("pt-BR")}
                </td>
                {showActions && (
                  <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {onResend && (
                        <button
                          onClick={() => onResend(event.id)}
                          disabled={isResending}
                          className="text-xs px-2 py-1 text-orange-700 bg-orange-50 rounded hover:bg-orange-100 disabled:opacity-50"
                        >
                          Reenviar
                        </button>
                      )}
                      {onCancel && (
                        <button
                          onClick={() => onCancel(event.id)}
                          className="text-xs px-2 py-1 text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
