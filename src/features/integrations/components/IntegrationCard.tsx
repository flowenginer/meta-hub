// ============================================================================
// Component: IntegrationCard — Single integration display
// ============================================================================

import type { Integration } from "@/types/integrations";

interface Props {
  integration: Integration;
  isSelected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  isRefreshing: boolean;
  isDisconnecting: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  connected: { label: "Conectado", color: "bg-green-100 text-green-800" },
  disconnected: { label: "Desconectado", color: "bg-gray-100 text-gray-800" },
  error: { label: "Erro", color: "bg-red-100 text-red-800" },
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
};

export function IntegrationCard({
  integration,
  isSelected,
  onSelect,
  onRefresh,
  onDisconnect,
  isRefreshing,
  isDisconnecting,
}: Props) {
  const status = statusConfig[integration.status] || statusConfig.pending;

  return (
    <div
      className={`bg-white border rounded-lg overflow-hidden transition-all ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onSelect}
      >
        <div className="flex items-center gap-4">
          {/* Meta icon */}
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>

          <div>
            <div className="font-medium text-gray-900">
              {integration.display_name || "Meta Account"}
            </div>
            <div className="text-xs text-gray-500">
              {integration.last_synced_at
                ? `Sincronizado: ${new Date(integration.last_synced_at).toLocaleString("pt-BR")}`
                : "Nunca sincronizado"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
            {status.label}
          </span>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50"
              title="Atualizar token"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <button
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50"
              title="Desconectar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>

          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
