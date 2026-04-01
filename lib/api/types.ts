import type { AuthenticatedRole } from "@/lib/auth/session";
import type { IUser } from "@/models/User";

export interface AuthenticatedActor {
  user: IUser;
  role: AuthenticatedRole;
  sessionVersion: number;
}

export type RouteContext<TParams extends Record<string, string>> = {
  params: Promise<TParams>;
};
