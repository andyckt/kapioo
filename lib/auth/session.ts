export type AuthenticatedRole = "user" | "admin";

export const AUTHJS_SESSION_COOKIE_NAME = "authjs.session-token";
export const AUTHJS_SECURE_SESSION_COOKIE_NAME = "__Secure-authjs.session-token";
export const ADMIN_MFA_COOKIE_NAME = "kapioo_admin_mfa";

export function getAuthSessionCookieName(secureCookie: boolean) {
  return secureCookie
    ? AUTHJS_SECURE_SESSION_COOKIE_NAME
    : AUTHJS_SESSION_COOKIE_NAME;
}

export function resolveUserRole(user: {
  role?: string | null;
  userID?: string | null;
}): AuthenticatedRole {
  if (user.role === "admin" || user.userID === "admin") {
    return "admin";
  }

  return "user";
}
