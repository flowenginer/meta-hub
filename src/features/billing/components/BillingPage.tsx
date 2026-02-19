// ============================================================================
// Page: Billing — Subscription, usage, plans, invoices
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  usePlans, useSubscription, useUsageSummary,
  useInvoices, useSubscribe, useCancelSubscription,
} from "@/features/billing/hooks/useBilling";
import type { Plan } from "@/types/billing";

const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Rascunho", color: "text-gray-600", bg: "bg-gray-100" },
  pending: { label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-100" },
  paid: { label: "Pago", color: "text-green-700", bg: "bg-green-100" },
  failed: { label: "Falhou", color: "text-red-700", bg: "bg-red-100" },
  cancelled: { label: "Cancelado", color: "text-gray-600", bg: "bg-gray-100" },
  refunded: { label: "Reembolsado", color: "text-blue-700", bg: "bg-blue-100" },
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BillingPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showPlans, setShowPlans] = useState(false);

  const { data: plans } = usePlans();
  const { data: subscription, isLoading: subLoading } = useSubscription(workspaceId!);
  const { data: usage } = useUsageSummary(workspaceId!);
  const { data: invoices } = useInvoices(workspaceId!);
  const subscribeMut = useSubscribe(workspaceId!);
  const cancelMut = useCancelSubscription(workspaceId!);

  const currentPlan = subscription?.plan;
  const usagePct = usage?.usage_pct || 0;

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.slug === currentPlan?.slug) return;
    if (plan.price_monthly_cents > 0 && !confirm(`Mudar para o plano ${plan.name}?`)) return;
    await subscribeMut.mutateAsync({ planSlug: plan.slug, cycle: billingCycle });
    setShowPlans(false);
  };

  const handleCancel = async () => {
    if (!confirm("Cancelar assinatura? Você manterá acesso até o fim do período atual.")) return;
    await cancelMut.mutateAsync();
  };

  if (subLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Billing</h2>
      </div>

      {/* Current Plan + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Plan Card */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Plano atual</h3>
            {subscription?.cancelled_at && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                Cancelado
              </span>
            )}
          </div>

          {currentPlan ? (
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{currentPlan.name}</div>
              <div className="text-sm text-gray-500 mb-4">{currentPlan.description}</div>

              <div className="space-y-1.5 mb-4">
                {currentPlan.features_list.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span> {f}
                  </div>
                ))}
              </div>

              {currentPlan.price_monthly_cents > 0 && (
                <div className="text-lg font-bold text-gray-900">
                  {formatBRL(
                    subscription?.billing_cycle === "yearly"
                      ? Math.round(currentPlan.price_yearly_cents / 12)
                      : currentPlan.price_monthly_cents
                  )}
                  <span className="text-sm font-normal text-gray-500">/mês</span>
                </div>
              )}

              {subscription && (
                <div className="text-xs text-gray-400 mt-2">
                  Período: {new Date(subscription.current_period_start).toLocaleDateString("pt-BR")} —{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowPlans(!showPlans)}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  {showPlans ? "Fechar planos" : "Mudar plano"}
                </button>
                {currentPlan.price_monthly_cents > 0 && !subscription?.cancelled_at && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelMut.isPending}
                    className="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">Nenhum plano ativo</p>
              <button onClick={() => setShowPlans(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Escolher plano
              </button>
            </div>
          )}
        </div>

        {/* Usage Card */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Uso do mês</h3>

          {usage ? (
            <div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-3xl font-bold text-gray-900">
                    {usage.events_count.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    / {usage.events_limit.toLocaleString()} eventos
                  </span>
                </div>
                <span className="text-sm text-gray-400">{usage.days_remaining} dias restantes</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePct >= 90 ? "bg-red-500" :
                    usagePct >= 70 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>

              <div className="text-xs text-gray-500 mb-1">
                {usagePct.toFixed(1)}% utilizado
                {usagePct >= 90 && <span className="text-red-500 font-medium ml-2">⚠️ Limite próximo</span>}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-6 text-center">Sem dados de uso</div>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      {showPlans && plans && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Planos disponíveis</h3>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-3 py-1 text-xs rounded-md ${billingCycle === "monthly" ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-3 py-1 text-xs rounded-md ${billingCycle === "yearly" ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}
              >
                Anual <span className="text-green-600 text-[10px]">-17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.slug === currentPlan?.slug;
              const price = billingCycle === "yearly"
                ? Math.round(plan.price_yearly_cents / 12)
                : plan.price_monthly_cents;

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-5 ${
                    isCurrent ? "ring-2 ring-blue-500 bg-blue-50/30" : "bg-white hover:shadow-md"
                  } transition-shadow`}
                >
                  <div className="text-sm font-semibold text-gray-900 mb-1">{plan.name}</div>
                  <div className="text-xs text-gray-500 mb-3">{plan.description}</div>

                  <div className="mb-4">
                    {plan.price_monthly_cents === 0 ? (
                      <span className="text-2xl font-bold text-gray-900">Grátis</span>
                    ) : (
                      <div>
                        <span className="text-2xl font-bold text-gray-900">{formatBRL(price)}</span>
                        <span className="text-xs text-gray-500">/mês</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {plan.features_list.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="text-green-500">✓</span> {f}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent || subscribeMut.isPending}
                    className={`w-full py-2 text-sm rounded-md font-medium ${
                      isCurrent
                        ? "bg-gray-100 text-gray-400 cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-50`}
                  >
                    {isCurrent ? "Plano atual" : "Selecionar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Faturas</h3>

        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma fatura</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const st = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft;
              return (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${st.bg} ${st.color}`}>
                      {st.label}
                    </span>
                    <div>
                      <div className="text-sm text-gray-900">
                        {inv.period_start && inv.period_end
                          ? `${new Date(inv.period_start).toLocaleDateString("pt-BR")} — ${new Date(inv.period_end).toLocaleDateString("pt-BR")}`
                          : new Date(inv.created_at).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {inv.line_items.map((li) => li.description).join(" + ")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatBRL(inv.total_cents)}</div>
                    {inv.due_date && inv.status === "pending" && (
                      <div className="text-[10px] text-gray-400">
                        Vence: {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
