// ============================================================================
// Page: Mappings — List and manage payload transformation mappings
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMappings } from "@/features/mappings/hooks/useMappings";
import { MappingEditor } from "./MappingEditor";
import type { Mapping } from "@/types/mappings";

const sourceLabels: Record<string, string> = {
  whatsapp: "💬 WhatsApp",
  forms: "📝 Formulários",
  ads: "📊 Ads",
  webhook: "🔗 Webhook",
  any: "🌐 Qualquer",
};

export function MappingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { mappings, isLoading, deleteMapping, isDeleting, updateMapping } =
    useMappings(workspaceId!);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este mapeamento?")) return;
    await deleteMapping(id);
  };

  const handleToggle = async (m: Mapping) => {
    await updateMapping({ id: m.id, is_active: !m.is_active });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Full-screen editor when editing/creating
  if (showEditor) {
    return (
      <MappingEditor
        workspaceId={workspaceId!}
        mapping={editingMapping}
        onClose={() => { setShowEditor(false); setEditingMapping(null); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mapeamentos</h2>
        <button
          onClick={() => { setEditingMapping(null); setShowEditor(true); }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Novo mapeamento
        </button>
      </div>

      {mappings.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum mapeamento configurado
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Mapeamentos transformam o payload recebido do Meta antes de enviar ao destino.
            Mapeie campos, aplique transformações e adicione dados estáticos.
          </p>
          <button
            onClick={() => setShowEditor(true)}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Criar mapeamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {mappings.map((m) => (
            <div
              key={m.id}
              className={`bg-white border rounded-lg p-4 ${!m.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{m.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                    }`}>
                      {m.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                      {m.mode === "template" ? "Template" : "Field Map"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {sourceLabels[m.source_type] || m.source_type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {m.rules.length} regra{m.rules.length !== 1 ? "s" : ""}
                    {Object.keys(m.static_fields).length > 0 &&
                      ` • ${Object.keys(m.static_fields).length} campo${Object.keys(m.static_fields).length !== 1 ? "s" : ""} estático${Object.keys(m.static_fields).length !== 1 ? "s" : ""}`}
                    {m.pass_through && " • Pass-through"}
                  </div>
                  {m.description && (
                    <div className="text-xs text-gray-400 mt-1">{m.description}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggle(m)}
                    className="p-1.5 text-gray-400 hover:text-yellow-600"
                    title={m.is_active ? "Desativar" : "Ativar"}
                  >
                    {m.is_active ? "⏸" : "▶"}
                  </button>
                  <button
                    onClick={() => { setEditingMapping(m); setShowEditor(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
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
    </div>
  );
}
