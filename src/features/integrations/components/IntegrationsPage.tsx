// ============================================================================
// Page: Integrations — List and manage connected Meta integrations
// ============================================================================

import { useState, useEffect } from "react";
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
  const [showManualToken, setShowManualToken] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    integrations,
    isLoading,
    startOAuth,
    isStartingOAuth,
    refreshIntegration,
    isRefreshing,
    disconnectIntegration,
    isDisconnecting,
    syncResources,
    isSyncing,
    saveManualToken,
    isSavingManualToken,
  } = useIntegrations(workspaceId!);

  const justConnected = searchParams.get("connected") === "true";
  const callbackError = searchParams.get("error");

  // Auto-expand the first integration after OAuth callback
  useEffect(() => {
    if (justConnected && integrations.length > 0 && !selectedIntegration) {
      setSelectedIntegration(integrations[0]);
    }
  }, [justConnected, integrations, selectedIntegration]);

  const handleConnect = async () => {
    setErrorMessage(null);
    try {
      await startOAuth();
    } catch (err) {
      setErrorMessage((err as Error).message || "Falha ao iniciar conex\u00e3o com o Meta");
    }
  };

  const handleSaveManualToken = async () => {
    if (!manualToken.trim()) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await saveManualToken(manualToken.trim());
      setManualToken("");
      setShowManualToken(false);
      setSuccessMessage(
        `Token salvo com sucesso! Conta: ${result.meta_user.name} (${result.scopes.length} permiss\u00f5es). Token ${result.token_type === "long_lived" ? "convertido para longa dura\u00e7\u00e3o (60 dias)" : "salvo como recebido"}.`
      );
    } catch (err) {
      setErrorMessage((err as Error).message || "Falha ao salvar token manual");
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
    if (!confirm("Tem certeza que deseja desconectar esta integra\u00e7\u00e3o? Todos os dados ser\u00e3o removidos.")) {
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
    setSuccessMessage(null);
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
        <h2 className="text-2xl font-bold text-gray-900">Integra\u00e7\u00f5es</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualToken(!showManualToken)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300
                       rounded-md hover:bg-gray-50"
          >
            {showManualToken ? "Cancelar" : "Token Manual"}
          </button>
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
      </div>

      {showManualToken && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Inserir Token Manual (Graph API Explorer)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Cole o Access Token gerado no Graph API Explorer. O sistema vai validar, converter para longa dura\u00e7\u00e3o (60 dias) e sincronizar seus recursos automaticamente.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Cole seu Access Token aqui..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSaveManualToken}
              disabled={isSavingManualToken || !manualToken.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600
                         rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                         whitespace-nowrap"
            >
              {isSavingManualToken ? "Salvando..." : "Salvar Token"}
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={dismissMessages} className="text-green-500 hover:text-green-700 ml-4">&times;</button>
        </div>
      )}

      {justConnected && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm flex items-center justify-between">
          <span>Integra\u00e7\u00e3o conectada com sucesso! Clique em "Sincronizar recursos" para buscar seus dados do Meta.</span>
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
          <div className="text-4xl mb-4">{"\u{1F517}"}</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma integra\u00e7\u00e3o conectada
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Conecte sua conta Meta para come\u00e7ar a receber leads do WhatsApp,
            Ads e Formul\u00e1rios.
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
            <div key={integration.id}>
              <IntegrationCard
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

              {/* Resources panel — shown when integration is selected */}
              {selectedIntegration?.id === integration.id && (
                <div className="mt-2">
                  <MetaResourcesPanel
                    integrationId={integration.id}
                    onSync={syncResources}
                    isSyncing={isSyncing}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
