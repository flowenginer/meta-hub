// ============================================================================
// Page: Dashboard — Workspace overview
// ============================================================================

import { useParams } from "react-router-dom";
import { useWorkspaces } from "@/features/workspaces/hooks/useWorkspaces";

export function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces } = useWorkspaces();

  const workspace = workspaces.find((w) => w.id === workspaceId);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {workspace?.name || "Dashboard"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-gray-500 mb-1">Integrações</div>
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-xs text-gray-400 mt-1">conectadas</div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-gray-500 mb-1">Eventos hoje</div>
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-xs text-gray-400 mt-1">processados</div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-gray-500 mb-1">Taxa de sucesso</div>
          <div className="text-2xl font-bold text-green-600">--</div>
          <div className="text-xs text-gray-400 mt-1">últimas 24h</div>
        </div>
      </div>

      <div className="mt-8 bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Primeiros passos
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs">
              1
            </div>
            <span className="text-gray-700">Conectar conta Meta via OAuth</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs">
              2
            </div>
            <span className="text-gray-700">Configurar destinos webhook</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs">
              3
            </div>
            <span className="text-gray-700">Criar rotas de encaminhamento</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs">
              4
            </div>
            <span className="text-gray-700">Monitorar logs e métricas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
