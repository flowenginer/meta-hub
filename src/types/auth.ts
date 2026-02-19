// ============================================================================
// Shared Types — Auth, Workspaces, Members, Invites
// ============================================================================

export type Role = "owner" | "editor" | "viewer";
export type MemberStatus = "active" | "invited" | "pending";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  is_admin: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  plan_id: string | null;
  settings: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  status: MemberStatus;
  invited_by: string | null;
  invited_email: string | null;
  invite_token: string | null;
  invited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: Pick<User, "id" | "email" | "full_name" | "avatar_url">;
}

export interface Invite {
  id: string;
  workspace_id: string;
  email: string;
  token: string;
  role: Role;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendInvitePayload {
  workspace_id: string;
  email: string;
  role: Role;
}

export interface SendInviteResponse {
  success: boolean;
  invite?: {
    id: string;
    email: string;
    role: Role;
    expires_at: string;
    email_sent: boolean;
  };
  error?: string;
}
