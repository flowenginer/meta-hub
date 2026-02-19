// ============================================================================
// Component: ChatPanel — Messages view + composer for a conversation
// ============================================================================

import { useEffect, useRef } from "react";
import { useMessages, useMarkRead } from "@/features/whatsapp/hooks/useWhatsApp";
import { MessageComposer } from "./MessageComposer";
import type { WaConversation, WaMessage } from "@/types/whatsapp";

interface Props {
  conversation: WaConversation;
  workspaceId: string;
}

const statusIcons: Record<string, string> = {
  accepted: "⏳",
  sent: "✓",
  delivered: "✓✓",
  read: "✓✓",
  failed: "✕",
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ msg }: { msg: WaMessage }) {
  const isOutbound = msg.direction === "outbound";

  const content = (() => {
    switch (msg.msg_type) {
      case "text":
        return <p className="whitespace-pre-wrap break-words">{msg.text_body}</p>;
      case "image":
        return (
          <div>
            {msg.media_url && (
              <img
                src={msg.media_url}
                alt="Imagem"
                className="max-w-[240px] rounded-lg mb-1"
              />
            )}
            {!msg.media_url && msg.media_id && (
              <div className="text-xs text-gray-400 italic">[Imagem: {msg.media_id}]</div>
            )}
            {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
          </div>
        );
      case "audio":
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>🎵</span>
            <span className="text-gray-600">Áudio</span>
            {msg.media_url && (
              <audio controls src={msg.media_url} className="h-8 max-w-[200px]" />
            )}
          </div>
        );
      case "video":
        return (
          <div>
            <span>🎬 Vídeo</span>
            {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
          </div>
        );
      case "document":
        return (
          <div className="flex items-center gap-2">
            <span>📄</span>
            <span className="text-sm">{msg.media_filename || "Documento"}</span>
          </div>
        );
      case "location":
        return (
          <div className="text-sm">
            <span>📍 </span>
            {msg.location_name || `${msg.latitude}, ${msg.longitude}`}
            {msg.location_name && (
              <div className="text-xs text-gray-500">{msg.latitude}, {msg.longitude}</div>
            )}
          </div>
        );
      case "sticker":
        return <span className="text-2xl">🏷️ Sticker</span>;
      case "template":
        return (
          <div className="text-sm italic text-gray-600">
            {msg.text_body || "[Mensagem template]"}
          </div>
        );
      case "reaction":
        return <span className="text-lg">{msg.text_body}</span>;
      default:
        return <p className="text-sm text-gray-500 italic">[{msg.msg_type}]</p>;
    }
  })();

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
          isOutbound
            ? "bg-green-100 text-gray-900 rounded-br-none"
            : "bg-white text-gray-900 rounded-bl-none shadow-sm"
        }`}
      >
        {content}

        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : ""}`}>
          <span className="text-[10px] text-gray-400">
            {formatTime(msg.timestamp_wa || msg.created_at)}
          </span>
          {isOutbound && (
            <span
              className={`text-[10px] ${
                msg.status === "read" ? "text-blue-500" : "text-gray-400"
              }`}
            >
              {statusIcons[msg.status] || ""}
            </span>
          )}
          {msg.status === "failed" && (
            <span className="text-[10px] text-red-500" title={msg.error_message || ""}>
              ✕
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ conversation, workspaceId }: Props) {
  const { data: messages, isLoading } = useMessages(conversation.id);
  const markRead = useMarkRead(workspaceId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when opening conversation with unread
  useEffect(() => {
    if (conversation.unread_count > 0 && messages && messages.length > 0) {
      const lastInbound = [...messages]
        .reverse()
        .find((m) => m.direction === "inbound" && m.wamid);

      if (lastInbound?.wamid) {
        markRead.mutate({
          workspace_id: workspaceId,
          phone_number_id: conversation.phone_number_id,
          wamid: lastInbound.wamid,
        });
      }
    }
  }, [conversation.id, conversation.unread_count]);

  const windowExpired =
    conversation.window_expires_at &&
    new Date(conversation.window_expires_at) < new Date();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold">
          {(conversation.contact_name || conversation.contact_wa_id || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm truncate">
            {conversation.contact_name || conversation.contact_wa_id}
          </div>
          <div className="text-xs text-gray-500">{conversation.contact_wa_id}</div>
        </div>
        <div className="flex items-center gap-2">
          {windowExpired && (
            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
              Janela 24h expirada — use templates
            </span>
          )}
          {conversation.tags.length > 0 && (
            <div className="flex gap-1">
              {conversation.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">
            Nenhuma mensagem nesta conversa
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </>
        )}
      </div>

      {/* Composer */}
      <MessageComposer
        workspaceId={workspaceId}
        phoneNumberId={conversation.phone_number_id}
        to={conversation.contact_wa_id}
        windowExpired={!!windowExpired}
      />
    </div>
  );
}
