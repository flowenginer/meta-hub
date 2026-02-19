// ============================================================================
// Page: Logs — Event log viewer with filters
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useLogs, type LogFilters } from "@/features/logs/hooks/useLogs";
import type { LogLevel, LogCategory } from "@/types/logs";

const levelConfig: Record<string, { label: string; color: string; bg: string }> = {
  debug: { label: "DEBUG", color: "text-gray-600", bg: "bg-gray-100" },
  info: { label: "INFO", color: "text-blue-700", bg: "bg-blue-50" },
  warn: { label: "WARN", color: "text-yellow-700", bg: "bg-yellow-50" },
  error: { label: "ERROR", color: "text-red-700", bg: "bg-red-50" },
  critical: { label: "CRIT", color: "text-red-900", bg: "bg-red-100" },
};

const categoryEmojis: Record<string, string> = {
  webhook: "🔗", delivery: "📦", oauth: "🔑", whatsapp: "💬",
  mapping: "🔄", system: "⚙️", billing: "💳", auth: "🛡️", alert: "🔔",
};

export function LogsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [filters, setFilters] = useState<LogFilters>({});
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: logs, isLoading } = useLogs(workspaceId!, filters);

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: search.trim() || undefined }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Logs</h2>
        <span className="text-xs text-gray-500">Auto-refresh: 10s</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filters.level || ""}
          onChange={(e) => setFilters((f) => ({ ...f, level: (e.target.value || undefined) as LogLevel }))}
          className="px-3 py-1.5 text-xs border rounded-md"
        >
          <option value="">Todos os níveis</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>

        <select
          value={filters.category || ""}
          onChange={(e) => setFilters((f) => ({ ...f, category: (e.target.value || undefined) as LogCategory }))}
          className="px-3 py-1.5 text-xs border rounded-md"
        >
          <option value="">Todas categorias</option>
          <option value="webhook">Webhook</option>
          <option value="delivery">Delivery</option>
          <option value="oauth">OAuth</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="mapping">Mapping</option>
          <option value="system">System</option>
          <option value="billing">Billing</option>
          <option value="auth">Auth</option>
          <option value="alert">Alert</option>
        </select>

        <div className="flex items-center gap-1 flex-1 max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar mensagem..."
            className="flex-1 px-3 py-1.5 text-xs border rounded-md"
          />
          <button onClick={handleSearch} className="px-2 py-1.5 text-xs bg-gray-100 rounded-md hover:bg-gray-200">
            🔍
          </button>
        </div>

        <span className="text-xs text-gray-500 ml-auto">
          {logs?.length || 0} registros
        </span>
      </div>

      {/* Log Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500 text-sm">
          Nenhum log encontrado
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                <th className="text-left px-3 py-2 w-16">Nível</th>
                <th className="text-left px-3 py-2 w-20">Categ.</th>
                <th className="text-left px-3 py-2 w-36">Ação</th>
                <th className="text-left px-3 py-2">Mensagem</th>
                <th className="text-right px-3 py-2 w-20">Duração</th>
                <th className="text-right px-3 py-2 w-32">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {logs.map((log) => {
                const lv = levelConfig[log.level] || levelConfig.info;
                const isExpanded = expandedId === log.id;

                return (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        ["error", "critical"].includes(log.level) ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${lv.bg} ${lv.color}`}>
                          {lv.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span title={log.category}>
                          {categoryEmojis[log.category] || "📋"} {log.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700">{log.action}</td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[300px]">{log.message}</td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {log.duration_ms ? `${log.duration_ms}ms` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={6} className="px-4 py-3 bg-gray-50">
                          <div className="grid grid-cols-3 gap-4 text-xs mb-2">
                            {log.resource_type && (
                              <div>
                                <span className="text-gray-500">Recurso:</span>{" "}
                                <span className="font-mono">{log.resource_type}:{log.resource_id}</span>
                              </div>
                            )}
                            {log.user_id && (
                              <div>
                                <span className="text-gray-500">User:</span>{" "}
                                <span className="font-mono">{log.user_id.slice(0, 8)}...</span>
                              </div>
                            )}
                          </div>
                          {Object.keys(log.metadata).length > 0 && (
                            <pre className="text-[10px] bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
