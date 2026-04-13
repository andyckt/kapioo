import type { AuthenticatedActor } from "@/lib/api/types"
import { vi } from "vitest"

export const authGuardMocks = {
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requireAdminMfa: vi.fn(),
  requireSelfOrAdmin: vi.fn(),
}

export function createAuthGuardsMockModule() {
  return {
    requireUser: authGuardMocks.requireUser,
    requireAdmin: authGuardMocks.requireAdmin,
    requireAdminMfa: authGuardMocks.requireAdminMfa,
    requireSelfOrAdmin: authGuardMocks.requireSelfOrAdmin,
  }
}

export function createActor(
  user: Record<string, unknown>,
  role: "user" | "admin" = "user"
): AuthenticatedActor {
  return {
    user: user as unknown as AuthenticatedActor["user"],
    role,
    sessionVersion: Number(user.sessionVersion ?? 1),
  }
}

export function resetAuthGuardMocks() {
  authGuardMocks.requireUser.mockReset()
  authGuardMocks.requireAdmin.mockReset()
  authGuardMocks.requireAdminMfa.mockReset()
  authGuardMocks.requireSelfOrAdmin.mockReset()
}

export function mockAsUser(user: Record<string, unknown>) {
  const actor = createActor(user, "user")
  authGuardMocks.requireUser.mockResolvedValue({ response: null, actor })
  authGuardMocks.requireAdmin.mockResolvedValue({
    response: new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 }),
    actor: null,
  })
  authGuardMocks.requireAdminMfa.mockResolvedValue({
    response: new Response(JSON.stringify({ error: "Admin MFA verification required" }), {
      status: 403,
    }),
    actor: null,
  })
  authGuardMocks.requireSelfOrAdmin.mockResolvedValue({ response: null, actor })
  return actor
}

export function mockAsAdmin(user: Record<string, unknown>) {
  const actor = createActor(user, "admin")
  authGuardMocks.requireUser.mockResolvedValue({ response: null, actor })
  authGuardMocks.requireAdmin.mockResolvedValue({ response: null, actor })
  authGuardMocks.requireAdminMfa.mockResolvedValue({ response: null, actor })
  authGuardMocks.requireSelfOrAdmin.mockResolvedValue({ response: null, actor })
  return actor
}

export function mockAsUnauthenticated() {
  const response = new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
  })

  authGuardMocks.requireUser.mockResolvedValue({ response, actor: null })
  authGuardMocks.requireAdmin.mockResolvedValue({ response, actor: null })
  authGuardMocks.requireAdminMfa.mockResolvedValue({ response, actor: null })
  authGuardMocks.requireSelfOrAdmin.mockResolvedValue({ response, actor: null })
}
