import type { ClientAuthSnapshot } from "@/lib/client-auth";

export interface RegisterApiPayload {
  authenticated: boolean;
  user: ClientAuthSnapshot["user"];
}

export function buildAuthSnapshotFromRegister(
  payload: RegisterApiPayload
): ClientAuthSnapshot | null {
  if (!payload.authenticated || !payload.user?._id) {
    return null;
  }

  return {
    authenticated: true,
    user: payload.user,
    requiresAdminMfa: false,
    adminMfaEmail: null,
  };
}
