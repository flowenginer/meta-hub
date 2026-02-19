// ============================================================================
// Page: Routes — Map source channels to destinations
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useRoutes } from "@/features/destinations/hooks/useRoutes";
import { RouteForm } from "./RouteForm";
import type { Route } from "@/types/destinations";

const sourceLabels: Record<string, { label: string; emoji: string }> = {
  whatsapp: { label: "WhatsApp", emoji: "💬" },
  forms: { label: "Formulários", emoji: "📝" },
  ads: { label: "Ads", emoji: "📊" },
  webhook: { label: "Webhook", emoji: "🔗" },
};

export function RoutesPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { routes, isLoading, deleteRoute, isDeleting, updateRoute } = useRoutes(workspaceId!);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta rota?")) return;
    await deleteRoute(id);
  };

  const handleToggleActive = async (route: Route) => {
    await updateRoute({ id: route.id, is_active: !route.is_active });
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
        <h2 className="text-2xl font-bold text-gray-900">Rotas</h2>
        <button
          onClick={() => { setEditingRoute(null); setShowForm(true); }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Nova rota
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🔀</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma rota configurada
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Rotas definem para qual destino cada tipo de evento será encaminhado.
            Ex: "Formulários → Meu CRM" ou "WhatsApp → n8n".
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Criar rota
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => {
            const source = sourceLabels[route.source_type] || { label: route.source_type, emoji: "❓" };

            return (
              <div
                key={route.id}
                className={`bg-white border rounded-lg p-4 ${!route.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Source */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{source.emoji}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{source.label}</div>
                        {route.source_id && (
                          <div className="text-xs text-gray-500 truncate">{route.source_id}</div>
                        )}
                        {!route.source_id && (
                          <div className="text-xs text-gray-400">Todos</div>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>

                    {/* Destination */}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {route.destination?.name || "Destino removido"}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {route.destination?.url || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-gray-500">P:{route.priority}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        route.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {route.is_active ? "Ativo" : "Inativo"}
                    </span>

                    <button
                      onClick={() => handleToggleActive(route)}
                      className="p-1.5 text-gray-400 hover:text-yellow-600"
                    >
                      {route.is_active ? "⏸" : "▶"}
                    </button>

                    <button
                      onClick={() => { setEditingRoute(route); setShowForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDelete(route.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {route.name && (
                  <div className="text-xs text-gray-500 mt-2">{route.name}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RouteForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingRoute(null); }}
        workspaceId={workspaceId!}
        editingRoute={editingRoute}
      />
    </div>
  );
}
