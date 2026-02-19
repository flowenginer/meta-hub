// ============================================================================
// Page: Destinations — List and manage webhook destinations
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useDestinations } from "@/features/destinations/hooks/useDestinations";
import { DestinationForm } from "./DestinationForm";
import { TestWebhookButton } from "./TestWebhookButton";
import type { Destination } from "@/types/destinations";

export function DestinationsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const {
    destinations,
    isLoading,
    deleteDestination,
    isDeleting,
    updateDestination,
  } = useDestinations(workspaceId!);
  const [showForm, setShowForm] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este destino? Rotas associadas serão desativadas.")) return;
    await deleteDestination(id);
  };

  const handleToggleActive = async (dest: Destination) => {
    await updateDestination({ id: dest.id, is_active: !dest.is_active });
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
        <h2 className="text-2xl font-bold text-gray-900">Destinos</h2>
        <button
          onClick={() => { setEditingDest(null); setShowForm(true); }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Novo destino
        </button>
      </div>

      {destinations.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum destino configurado
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Destinos são URLs webhook para onde os eventos do Meta serão encaminhados.
            Configure seu primeiro destino para começar.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Criar destino
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className={`bg-white border rounded-lg p-4 ${!dest.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{dest.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        dest.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {dest.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {dest.method}
                    </span>
                    {dest.auth_type !== "none" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {dest.auth_type.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">{dest.url}</p>
                  {dest.description && (
                    <p className="text-xs text-gray-400 mt-1">{dest.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <TestWebhookButton destinationId={dest.id} workspaceId={workspaceId!} />

                  <button
                    onClick={() => handleToggleActive(dest)}
                    className="p-1.5 text-gray-400 hover:text-yellow-600"
                    title={dest.is_active ? "Desativar" : "Ativar"}
                  >
                    {dest.is_active ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => { setEditingDest(dest); setShowForm(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleDelete(dest.id)}
                    disabled={isDeleting}
                    className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit form */}
      <DestinationForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingDest(null); }}
        workspaceId={workspaceId!}
        editingDestination={editingDest}
      />
    </div>
  );
}
