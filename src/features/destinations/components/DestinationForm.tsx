// ============================================================================
// Component: DestinationForm — Create or edit a webhook destination
// ============================================================================

import { useState, useEffect } from "react";
import { useDestinations } from "@/features/destinations/hooks/useDestinations";
import type { Destination, AuthType, HttpMethod } from "@/types/destinations";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  editingDestination: Destination | null;
}

const authTypes: { value: AuthType; label: string }[] = [
  { value: "none", label: "Nenhuma" },
  { value: "hmac", label: "HMAC-SHA256" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
  { value: "api_key", label: "API Key" },
];

export function DestinationForm({ isOpen, onClose, workspaceId, editingDestination }: Props) {
  const { createDestination, isCreating, updateDestination, isUpdating } = useDestinations(workspaceId);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<HttpMethod>("POST");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [authConfig, setAuthConfig] = useState<Record<string, string>>({});
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingDestination) {
      setName(editingDestination.name);
      setUrl(editingDestination.url);
      setMethod(editingDestination.method);
      setAuthType(editingDestination.auth_type);
      setAuthConfig(editingDestination.auth_config || {});
      setTimeoutMs(editingDestination.timeout_ms);
      setDescription(editingDestination.description || "");
    } else {
      setName(""); setUrl(""); setMethod("POST"); setAuthType("none");
      setAuthConfig({}); setTimeoutMs(5000); setDescription("");
    }
    setError(null);
  }, [editingDestination, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !url.trim()) {
      setError("Nome e URL são obrigatórios");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("URL inválida");
      return;
    }

    const payload = {
      name: name.trim(),
      url: url.trim(),
      method,
      auth_type: authType,
      auth_config: authType === "none" ? {} : authConfig,
      headers: {},
      timeout_ms: timeoutMs,
      description: description.trim() || undefined,
    };

    try {
      if (editingDestination) {
        await updateDestination({ id: editingDestination.id, ...payload });
      } else {
        await createDestination(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingDestination ? "Editar destino" : "Novo destino"}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Meu CRM, n8n Webhook"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/webhook"
            />
          </div>

          {/* Method + Timeout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                min={1000}
                max={30000}
                step={1000}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Auth Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Autenticação</label>
            <select
              value={authType}
              onChange={(e) => { setAuthType(e.target.value as AuthType); setAuthConfig({}); }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {authTypes.map((at) => (
                <option key={at.value} value={at.value}>{at.label}</option>
              ))}
            </select>
          </div>

          {/* Auth Config Fields */}
          {authType === "hmac" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HMAC Secret</label>
              <input
                type="password"
                value={authConfig.secret || ""}
                onChange={(e) => setAuthConfig({ ...authConfig, secret: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Secret para gerar assinatura"
              />
              <p className="text-xs text-gray-500 mt-1">
                Header X-Hub-Signature-256 será incluído automaticamente.
              </p>
            </div>
          )}

          {authType === "bearer" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token</label>
              <input
                type="password"
                value={authConfig.token || ""}
                onChange={(e) => setAuthConfig({ ...authConfig, token: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bearer token"
              />
            </div>
          )}

          {authType === "basic" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                <input
                  type="text"
                  value={authConfig.username || ""}
                  onChange={(e) => setAuthConfig({ ...authConfig, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={authConfig.password || ""}
                  onChange={(e) => setAuthConfig({ ...authConfig, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {authType === "api_key" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do header</label>
                <input
                  type="text"
                  value={authConfig.key_name || "X-API-Key"}
                  onChange={(e) => setAuthConfig({ ...authConfig, key_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input
                  type="password"
                  value={authConfig.key_value || ""}
                  onChange={(e) => setAuthConfig({ ...authConfig, key_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Para que serve este destino"
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
              disabled={isCreating || isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating || isUpdating
                ? "Salvando..."
                : editingDestination
                ? "Salvar"
                : "Criar destino"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
