// ============================================================================
// Component: ConversationList — Scrollable WhatsApp conversation list
// ============================================================================

import { useState } from "react";
import type { WaConversation } from "@/types/whatsapp";

interface Props {
  conversations: WaConversation[];
  selectedId?: string;
  onSelect: (conv: WaConversation) => void;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ConversationList({ conversations, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? conversations.filter(
        (c) =>
          (c.contact_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (c.contact_wa_id || "").includes(search)
      )
    : conversations;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search */}
      <div className="px-3 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar conversa..."
          className="w-full px-3 py-1.5 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv) => {
          const isSelected = conv.id === selectedId;
          const isExpired =
            conv.window_expires_at && new Date(conv.window_expires_at) < new Date();

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                isSelected ? "bg-green-50 border-l-2 border-l-green-500" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {/* Avatar + Name */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {(conv.contact_name || conv.contact_wa_id || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {conv.contact_name || conv.contact_wa_id}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count > 99 ? "99+" : conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {conv.last_direction === "outbound" && (
                        <span className="text-gray-400 text-xs">✓</span>
                      )}
                      <span className="text-xs text-gray-500 truncate">
                        {conv.last_message_text || "..."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time + Status */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-gray-400">
                    {timeAgo(conv.last_message_at)}
                  </span>
                  {isExpired && (
                    <span className="text-[9px] px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                      24h
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-8">
            Nenhuma conversa encontrada
          </div>
        )}
      </div>
    </div>
  );
}
