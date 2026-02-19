// ============================================================================
// Page: Members — Workspace members management
// ============================================================================

import { useParams } from "react-router-dom";
import { MembersPanel } from "@/features/workspaces/components/MembersPanel";

export function MembersPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  if (!workspaceId) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Membros</h2>
      <MembersPanel workspaceId={workspaceId} />
    </div>
  );
}
