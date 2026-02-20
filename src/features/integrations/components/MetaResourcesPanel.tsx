// ============================================================================
// Component: MetaResourcesPanel — WhatsApp, Ads, Forms resources
// ============================================================================

import { useState } from "react";
import { useMetaResources } from "@/features/integrations/hooks/useIntegrations";
import type { SyncResponse } from "@/types/integrations";

interface Props {
  integrationId: string;
  onSync: (integrationId: string) => Promise<SyncResponse>;
  isSyncing: boolean;
}

type Tab = "whatsapp" | "ads" | "forms";

const tabs: { key: Tab; label: string; emoji: string }[] = [
  { key: "whatsapp", label: "WhatsApp", emoji: "\u{1F4AC}" },
  { key: "ads", label: "Ad Accounts", emoji: "\u{1F4CA}" },
  { key: "forms", label: "Formul\u00e1rios", emoji: "\u{1F4DD}" },
];

export function MetaResourcesPanel({ integrationId, onSync, isSyncing }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("whatsapp");
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { whatsappNumbers, adAccounts, forms, isLoading, refetch } =
    useMetaResources(integrationId);

  const handleSync = async () => {
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await onSync(integrationId);
      setSyncResult(result);
      refetch();
    } catch (err) {
      setSyncError((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  const isEmpty = whatsappNumbers.length === 0 && adAccounts.length === 0 && forms.length === 0;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header with sync button */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-700">Recursos Meta</h3>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50
                     rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
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
          {isSyncing ? "Sincronizando..." : "Sincronizar recursos"}
        </button>
      </div>

      {/* Sync result feedback */}
      {syncResult && (
        <div className="mx-4 mb-2 p-3 bg-blue-50 rounded-lg text-xs">
          <div className="font-medium text-blue-800 mb-1">Resultado da sincroniza&ccedil;&atilde;o:</div>
          <div className="space-y-0.5 text-blue-700">
            <div>
              WhatsApp: {syncResult.sync.whatsapp.synced} sincronizado(s)
              {syncResult.sync.whatsapp.error && (
                <span className="text-red-600 ml-1">({syncResult.sync.whatsapp.error})</span>
              )}
            </div>
            <div>
              Ad Accounts: {syncResult.sync.adAccounts.synced} sincronizado(s)
              {syncResult.sync.adAccounts.error && (
                <span className="text-red-600 ml-1">({syncResult.sync.adAccounts.error})</span>
              )}
            </div>
            <div>
              Formul&aacute;rios: {syncResult.sync.forms.synced} sincronizado(s)
              {syncResult.sync.forms.error && (
                <span className="text-red-600 ml-1">({syncResult.sync.forms.error})</span>
              )}
            </div>
          </div>
        </div>
      )}

      {syncError && (
        <div className="mx-4 mb-2 p-3 bg-red-50 rounded-lg text-xs text-red-700">
          Erro ao sincronizar: {syncError}
        </div>
      )}

      {/* Empty state with helpful message */}
      {isEmpty && !syncResult && (
        <div className="mx-4 mb-2 p-4 bg-yellow-50 rounded-lg text-sm text-center">
          <p className="text-yellow-800 font-medium mb-1">Nenhum recurso encontrado</p>
          <p className="text-yellow-700 text-xs">
            Clique em "Sincronizar recursos" para buscar seus n&uacute;meros WhatsApp, contas de an&uacute;ncio e formul&aacute;rios do Meta.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => {
          const count =
            tab.key === "whatsapp"
              ? whatsappNumbers.length
              : tab.key === "ads"
              ? adAccounts.length
              : forms.length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.emoji} {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "whatsapp" && (
          <div>
            {whatsappNumbers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Nenhum n&uacute;mero WhatsApp encontrado. Verifique se sua conta Meta tem acesso
                ao WhatsApp Business API.
              </p>
            ) : (
              <div className="space-y-2">
                {whatsappNumbers.map((num) => (
                  <div
                    key={num.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {num.display_name || num.phone_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {num.phone_number} &bull; WABA: {num.whatsapp_business_id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {num.quality_rating && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                          {num.quality_rating}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          num.webhook_subscribed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {num.webhook_subscribed ? "Webhook ativo" : "Webhook pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "ads" && (
          <div>
            {adAccounts.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Nenhuma conta de an&uacute;ncio encontrada. Verifique as permiss&otilde;es da conta Meta.
              </p>
            ) : (
              <div className="space-y-2">
                {adAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {acc.name || acc.ad_account_id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {acc.ad_account_id} &bull; {acc.currency} &bull; {acc.timezone}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        acc.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {acc.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "forms" && (
          <div>
            {forms.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Nenhum formul&aacute;rio de lead encontrado. Verifique se voc&ecirc; tem formul&aacute;rios
                criados nas suas P&aacute;ginas do Facebook.
              </p>
            ) : (
              <div className="space-y-2">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {form.name || form.form_id}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {form.form_id}
                        {form.details?.page_name ? ` \u2022 P\u00e1gina: ${String(form.details.page_name)}` : null}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        form.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {form.status === "active" ? "Ativo" : form.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
