// ============================================================================
// Component: TestWebhookButton — Send test webhook and show result
// ============================================================================

import { useState } from "react";
import { useDestinations } from "@/features/destinations/hooks/useDestinations";
import type { TestWebhookResult } from "@/types/destinations";

interface Props {
  destinationId: string;
  workspaceId: string;
}

export function TestWebhookButton({ destinationId, workspaceId }: Props) {
  const { testWebhook, isTesting } = useDestinations(workspaceId);
  const [result, setResult] = useState<TestWebhookResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setResult(null);
    setShowResult(true);

    try {
      const res = await testWebhook(destinationId);
      setResult(res);
    } catch (err) {
      setResult({
        success: false,
        error: (err as Error).message,
        duration_ms: 0,
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleTest}
        disabled={isTesting}
        className="p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-50"
        title="Testar webhook"
      >
        {isTesting ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
      </button>

      {/* Result popup */}
      {showResult && result && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowResult(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Resultado do teste</h4>
              <button
                onClick={() => setShowResult(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    result.success ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-medium">
                  {result.success ? "Sucesso" : "Falhou"}
                </span>
                {result.status_code && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                    HTTP {result.status_code}
                  </span>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {result.duration_ms}ms
                </span>
              </div>

              {result.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {result.error}
                </div>
              )}

              {result.response_body && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Resposta:</div>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                    {result.response_body}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
