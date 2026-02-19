// ============================================================================
// Component: AuthGuard — Route protection
// ============================================================================

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useWorkspaces } from "@/features/workspaces/hooks/useWorkspaces";

interface Props {
  children: React.ReactNode;
  requireWorkspace?: boolean;
}

export function AuthGuard({ children, requireWorkspace = false }: Props) {
  const { user, loading } = useAuth();
  const { workspaces, isLoading: wsLoading } = useWorkspaces();
  const location = useLocation();

  // Show loading while checking auth
  if (loading || (user && wsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Authenticated but no workspaces — redirect to onboarding
  if (requireWorkspace && workspaces.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
