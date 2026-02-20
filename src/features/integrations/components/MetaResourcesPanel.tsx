// ============================================================================
// Component: MetaResourcesPanel — WhatsApp, Ads, Forms resources
// ============================================================================

import { useState } from "react";
import { useMetaResources } from "@/features/integrations/hooks/useIntegrations";

interface Props {
  integrationId: string;
}

type Tab = "whatsapp" | "ads" | "forms";

const tabs: { key: Tab; label: string; emoji: string }[] = [
  { key: "whatsapp", label: "WhatsApp", emoji: "💬" },
  { key: "ads", label: "Ad Accounts", emoji: "📊" },
  { key: "forms", label: "Formulários", emoji: "📝" },
];

export function MetaResourcesPanel({ integrationId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("whatsapp");
  const { whatsappNumbers, adAccounts, forms, isLoading } =
    useMetaResources(integrationId);

  if (isLoading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
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
                Nenhum número WhatsApp encontrado. Verifique se sua conta Meta tem acesso
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
                        {num.phone_number} • WABA: {num.whatsapp_business_id}
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
                Nenhuma conta de anúncio encontrada. Verifique as permissões da conta Meta.
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
                        {acc.ad_account_id} • {acc.currency} • {acc.timezone}
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
                Nenhum formulário de lead encontrado. Verifique se você tem formulários
                criados nas suas Páginas do Facebook.
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
                        {form.details?.page_name ? ` • Página: ${String(form.details.page_name)}` : null}
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
