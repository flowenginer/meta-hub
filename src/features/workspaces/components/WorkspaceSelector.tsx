// ============================================================================
// Component: WorkspaceSelector — Dropdown to switch workspaces
// ============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaces } from "@/features/workspaces/hooks/useWorkspaces";
import type { Workspace } from "@/types/auth";

interface Props {
  currentWorkspaceId?: string;
  onNewWorkspace: () => void;
}

export function WorkspaceSelector({ currentWorkspaceId, onNewWorkspace }: Props) {
  const { workspaces, isLoading } = useWorkspaces();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  const handleSelect = (workspace: Workspace) => {
    setIsOpen(false);
    navigate(`/workspace/${workspace.id}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 
                   bg-white border rounded-md hover:bg-gray-50 min-w-[180px]"
      >
        <span className="flex-1 text-left truncate">
          {isLoading ? "Carregando..." : currentWorkspace?.name || "Selecionar workspace"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-64 bg-white border rounded-md shadow-lg z-20">
            <div className="py-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 
                    ${ws.id === currentWorkspaceId ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                >
                  <div className="font-medium truncate">{ws.name}</div>
                  <div className="text-xs text-gray-500 truncate">{ws.slug}</div>
                </button>
              ))}

              <div className="border-t mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNewWorkspace();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                >
                  + Novo workspace
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
