// ============================================================================
// Page: Integrations — List and manage connected Meta integrations
// ============================================================================

import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useIntegrations } from "@/features/integrations/hooks/useIntegrations";
import { IntegrationCard } from "./IntegrationCard";
import { MetaResourcesPanel } from "./MetaResourcesPanel";
import type { Integration } from "@/types/integrations";

export function IntegrationsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    integrations,
    isLoading,
    startOAuth,
    isStartingOAuth,
    refreshIntegration,
    isRefreshing,
    disconnectIntegration,
    isDisconnecting,
  } = useIntegrations(workspaceId!);

  const justConnected = searchParams.get("connected") === "true";
  const callbackError = searchParams.get("error");

  const handleConnect = async () => {
    setErrorMessage(null);
    try {
      await startOAuth();
    } catch (err) {
      setErrorMessage((err as Error).message || "Falha ao iniciar conexão com o Meta");
    }
  };

  const handleRefresh = async (integrationId: string) => {
    setErrorMessage(null);
    try {
      await refreshIntegration(integrationId);
    } catch (err) {
      setErrorMessage((err as Error).message || "Falha ao atualizar token");
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm("Tem certeza que deseja desconectar esta integração? Todos os dados serão removidos.")) {
      return;
    }
    setErrorMessage(null);
    try {
      await disconnectIntegration(integrationId);
      if (selectedIntegration?.id === integrationId) {
        setSelectedIntegration(null);
      }
    } catch (err) {
      setErrorMessage((err as Error).message || "Falha ao desconectar");
    }
  };

  const dismissMessages = () => {
    setErrorMessage(null);
    if (justConnected || callbackError) {
      setSearchParams({}, { replace: true });
    }
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
        <h2 className="text-2xl font-bold text-gray-900">Integrações</h2>
        <button
          onClick={handleConnect}
          disabled={isStartingOAuth}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 
                     rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          {isStartingOAuth ? "Conectando..." : "Conectar Meta"}
        </button>
      </div>

      {justConnected && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm flex items-center justify-between">
          <span>Integração conectada com sucesso! Os recursos do Meta foram sincronizados.</span>
          <button onClick={dismissMessages} className="text-green-500 hover:text-green-700 ml-4">&times;</button>
        </div>
      )}

      {(callbackError || errorMessage) && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm flex items-center justify-between">
          <span>{callbackError ? decodeURIComponent(callbackError) : errorMessage}</span>
          <button onClick={dismissMessages} className="text-red-500 hover:text-red-700 ml-4">&times;</button>
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma integração conectada
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Conecte sua conta Meta para começar a receber leads do WhatsApp, 
            Ads e Formulários.
          </p>
          <button
            onClick={handleConnect}
            disabled={isStartingOAuth}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 
                       rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isStartingOAuth ? "Conectando..." : "Conectar conta Meta"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              isSelected={selectedIntegration?.id === integration.id}
              onSelect={() =>
                setSelectedIntegration(
                  selectedIntegration?.id === integration.id ? null : integration
                )
              }
              onRefresh={() => handleRefresh(integration.id)}
              onDisconnect={() => handleDisconnect(integration.id)}
              isRefreshing={isRefreshing}
              isDisconnecting={isDisconnecting}
            />
          ))}

          {/* Resources panel */}
          {selectedIntegration && (
            <MetaResourcesPanel integrationId={selectedIntegration.id} />
          )}
        </div>
      )}
    </div>
  );
}
