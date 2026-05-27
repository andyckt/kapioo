import type { AuthenticatedRole } from "@/lib/auth/session";
import { resolveUserRole } from "@/lib/auth/session";
import type { IUser } from "@/models/User";

export interface AuthSessionUser {
  id: string;
  name: string;
  email: string;
  role: AuthenticatedRole;
  sessionVersion: number;
  languagePreference: "zh" | "en";
  isVerified: boolean;
}

export function toAuthSessionUser(user: IUser): AuthSessionUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: resolveUserRole(user),
    sessionVersion: Number(user.sessionVersion || 1),
    languagePreference: user.languagePreference || "zh",
    isVerified: Boolean(user.isVerified),
  };
}
