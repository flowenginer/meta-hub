// ============================================================================
// Page: WhatsApp — Inbox with conversation list + chat panel
// ============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useConversations } from "@/features/whatsapp/hooks/useWhatsApp";
import { ConversationList } from "./ConversationList";
import { ChatPanel } from "./ChatPanel";
import type { WaConversation } from "@/types/whatsapp";

export function WhatsAppPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: conversations, isLoading } = useConversations(workspaceId!);
  const [selected, setSelected] = useState<WaConversation | null>(null);

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-6 -mt-2">
      {/* Conversation List */}
      <div className="w-80 border-r flex flex-col bg-white">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-bold text-gray-900">WhatsApp</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {conversations?.length || 0} conversa{(conversations?.length || 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm text-gray-500">
                Nenhuma conversa ainda. As mensagens aparecerão aqui quando seus clientes entrarem em contato.
              </p>
            </div>
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selected ? (
          <ChatPanel
            conversation={selected}
            workspaceId={workspaceId!}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-700">
                Selecione uma conversa
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Escolha uma conversa à esquerda para visualizar as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
