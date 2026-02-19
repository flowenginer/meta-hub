// ============================================================================
// Component: MembersPanel — List and manage workspace members
// ============================================================================

import { useState } from "react";
import { useMembers } from "@/features/workspaces/hooks/useMembers";
import { useInvites } from "@/features/workspaces/hooks/useInvites";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { InviteModal } from "./InviteModal";
import type { Role } from "@/types/auth";

interface Props {
  workspaceId: string;
}

const roleLabels: Record<Role, string> = {
  owner: "Dono",
  editor: "Editor",
  viewer: "Visualizador",
};

const roleBadgeColors: Record<Role, string> = {
  owner: "bg-purple-100 text-purple-800",
  editor: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
};

export function MembersPanel({ workspaceId }: Props) {
  const { user } = useAuth();
  const { members, isLoading, updateRole, removeMember, isRemoving } =
    useMembers(workspaceId);
  const { invites, revokeInvite, isRevoking } = useInvites(workspaceId);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isOwner = currentMember?.role === "owner";

  const handleRoleChange = async (memberId: string, role: Role) => {
    try {
      await updateRole({ memberId, role });
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Tem certeza que deseja remover este membro?")) return;
    try {
      await removeMember(memberId);
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Revogar este convite?")) return;
    try {
      await revokeInvite(inviteId);
    } catch (err) {
      console.error("Failed to revoke invite:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Membros</h3>
        {(isOwner || currentMember?.role === "editor") && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 
                       rounded-md hover:bg-blue-700"
          >
            Convidar
          </button>
        )}
      </div>

      {/* Active members */}
      <div className="divide-y">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              {member.user?.avatar_url ? (
                <img
                  src={member.user.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {(member.user?.full_name || member.user?.email || "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {member.user?.full_name || member.user?.email || "Usuário"}
                  {member.user_id === user?.id && (
                    <span className="text-xs text-gray-500 ml-1">(você)</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{member.user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && member.user_id !== user?.id ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="owner">Dono</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Visualizador</option>
                </select>
              ) : (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    roleBadgeColors[member.role]
                  }`}
                >
                  {roleLabels[member.role]}
                </span>
              )}

              {isOwner && member.user_id !== user?.id && (
                <button
                  onClick={() => handleRemove(member.id)}
                  disabled={isRemoving}
                  className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <>
          <div className="px-6 py-3 bg-gray-50 border-t">
            <h4 className="text-sm font-medium text-gray-600">
              Convites pendentes ({invites.length})
            </h4>
          </div>
          <div className="divide-y">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between px-6 py-3 bg-gray-50/50"
              >
                <div>
                  <div className="text-sm text-gray-700">{invite.email}</div>
                  <div className="text-xs text-gray-500">
                    Expira em{" "}
                    {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                    {roleLabels[invite.role]} (pendente)
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      disabled={isRevoking}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Revogar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Invite modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}
