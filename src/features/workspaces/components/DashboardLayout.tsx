// ============================================================================
// Layout: DashboardLayout — Main app layout with sidebar
// ============================================================================

import { useState } from "react";
import { Outlet, useParams, NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { WorkspaceSelector } from "@/features/workspaces/components/WorkspaceSelector";
import { NewWorkspaceModal } from "@/features/workspaces/components/NewWorkspaceModal";

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);

  const navItems = workspaceId
    ? [
        { to: `/workspace/${workspaceId}`, label: "Dashboard", end: true },
        { to: `/workspace/${workspaceId}/integrations`, label: "Integrações" },
        { to: `/workspace/${workspaceId}/destinations`, label: "Destinos" },
        { to: `/workspace/${workspaceId}/routes`, label: "Rotas" },
        { to: `/workspace/${workspaceId}/logs`, label: "Logs" },
        { to: `/workspace/${workspaceId}/members`, label: "Membros" },
        { to: `/workspace/${workspaceId}/settings`, label: "Configurações" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* Logo + Workspace selector */}
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-gray-900 mb-3">MetaHub</h1>
          <WorkspaceSelector
            currentWorkspaceId={workspaceId}
            onNewWorkspace={() => setShowNewWorkspace(true)}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
              {(user?.email || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.user_metadata?.full_name || user?.email}
              </div>
            </div>
            <button
              onClick={signOut}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Sair"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>

      {/* New workspace modal */}
      <NewWorkspaceModal
        isOpen={showNewWorkspace}
        onClose={() => setShowNewWorkspace(false)}
      />
    </div>
  );
}
