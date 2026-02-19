// ============================================================================
// Component: EventDetailPanel — Event details + attempts timeline
// ============================================================================

import { useEventAttempts } from "@/features/delivery/hooks/useDelivery";
import type { DeliveryEvent } from "@/types/destinations";

interface Props {
  event: DeliveryEvent;
  onClose: () => void;
  onResend?: () => void;
}

export function EventDetailPanel({ event, onClose, onResend }: Props) {
  const { data: attempts, isLoading } = useEventAttempts(event.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold text-gray-900">Detalhes do Evento</h3>
          <div className="flex items-center gap-2">
            {onResend && (
              <button
                onClick={onResend}
                className="text-xs px-3 py-1 text-orange-700 bg-orange-50 rounded-md hover:bg-orange-100"
              >
                🔄 Reenviar
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Event Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <div className="font-medium">{event.status.toUpperCase()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Origem</div>
              <div className="font-medium">{event.source_type}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Tentativas</div>
              <div className="font-medium">{event.attempts_count}/{event.max_attempts}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Criado</div>
              <div className="font-medium text-xs">
                {new Date(event.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
            {event.delivered_at && (
              <div>
                <div className="text-xs text-gray-500">Entregue em</div>
                <div className="font-medium text-xs">
                  {new Date(event.delivered_at).toLocaleString("pt-BR")}
                </div>
              </div>
            )}
            {event.next_retry_at && event.status === "failed" && (
              <div>
                <div className="text-xs text-gray-500">Próximo retry</div>
                <div className="font-medium text-xs">
                  {new Date(event.next_retry_at).toLocaleString("pt-BR")}
                </div>
              </div>
            )}
          </div>

          {event.error_message && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs">
              <div className="font-medium mb-1">Último erro:</div>
              {event.error_message}
            </div>
          )}

          {/* Payload */}
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Payload original</div>
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>

          {event.transformed_payload && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Payload transformado</div>
              <pre className="text-xs bg-gray-900 text-blue-400 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
                {JSON.stringify(event.transformed_payload, null, 2)}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {Object.keys(event.metadata).length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Metadata</div>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-32 whitespace-pre-wrap">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Attempts Timeline */}
          <div>
            <div className="text-xs font-medium text-gray-600 mb-2">
              Timeline de tentativas
            </div>

            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              </div>
            ) : !attempts || attempts.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-4">
                Nenhuma tentativa registrada
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt) => {
                  const isSuccess =
                    attempt.status_code !== null &&
                    attempt.status_code >= 200 &&
                    attempt.status_code < 300;

                  return (
                    <div
                      key={attempt.id}
                      className={`border rounded-lg p-3 ${
                        isSuccess ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSuccess ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-xs font-medium">
                            Tentativa #{attempt.attempt_number}
                          </span>
                          {attempt.status_code && (
                            <span className="text-xs px-1.5 py-0.5 bg-white rounded">
                              HTTP {attempt.status_code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {attempt.duration_ms && <span>{attempt.duration_ms}ms</span>}
                          <span>
                            {new Date(attempt.attempted_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600">
                        {attempt.request_method} {attempt.request_url}
                      </div>

                      {attempt.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          {attempt.error_message}
                        </div>
                      )}

                      {attempt.response_body && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            Ver resposta
                          </summary>
                          <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-24 whitespace-pre-wrap">
                            {attempt.response_body}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
