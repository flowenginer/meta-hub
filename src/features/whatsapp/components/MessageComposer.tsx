// ============================================================================
// Component: MessageComposer — Text input + send for WhatsApp chat
// ============================================================================

import { useState } from "react";
import { useSendMessage } from "@/features/whatsapp/hooks/useWhatsApp";

interface Props {
  workspaceId: string;
  phoneNumberId: string;
  to: string;
  windowExpired: boolean;
}

export function MessageComposer({ workspaceId, phoneNumberId, to, windowExpired }: Props) {
  const { sendMessage, isSending } = useSendMessage(workspaceId);
  const [text, setText] = useState("");

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    try {
      await sendMessage({
        workspace_id: workspaceId,
        phone_number_id: phoneNumberId,
        to,
        type: "text",
        text: trimmed,
      });
      setText("");
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (windowExpired) {
    return (
      <div className="bg-yellow-50 border-t px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-yellow-700">
          <span>⚠️</span>
          <span>
            A janela de 24h expirou. Você só pode enviar mensagens usando templates aprovados.
          </span>
        </div>
        <button
          className="mt-2 px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200"
          onClick={() => {
            // TODO: open template selector modal
            alert("Template selector em breve");
          }}
        >
          📋 Enviar template
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border-t px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Digite uma mensagem..."
          className="flex-1 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-green-500 max-h-32"
          style={{ minHeight: "40px" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isSending ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
