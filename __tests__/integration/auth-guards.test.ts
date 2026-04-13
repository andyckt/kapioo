import type { AuthenticatedActor } from "@/lib/api/types"
import { ADMIN_MFA_COOKIE_NAME } from "@/lib/auth/session"
import { createSignedAdminMfaCookie } from "@/lib/security/signed-cookie"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestAdmin, createTestUser } from "../helpers/factories"

const { authMock, connectToDatabaseMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
}))

vi.mock("@/auth", () => ({
  auth: authMock,
}))

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}))

import {
  requireAdmin,
  requireAdminMfa,
  requireSelfOrAdmin,
  requireUser,
} from "@/lib/auth/guards"

function getCookieRequest(token?: string | null) {
  return {
    cookies: {
      get(name: string) {
        if (name !== ADMIN_MFA_COOKIE_NAME || !token) {
          return undefined
        }

        return { value: token }
      },
    },
  } as Request & {
    cookies: {
      get(name: string): { value: string } | undefined
    }
  }
}

describe("lib/auth/guards", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    authMock.mockReset()
    connectToDatabaseMock.mockReset()
    connectToDatabaseMock.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  describe("requireUser", () => {
    it("returns unauthorized when there is no session", async () => {
      authMock.mockResolvedValue(null)

      const result = await requireUser()
      const response = result.response
      if (!response) {
        throw new Error("Expected unauthorized response")
      }

      expect(result.actor).toBeNull()
      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: "Unauthorized",
      })
    })

    it("returns the authenticated actor for a valid session", async () => {
      const user = await createTestUser({
        name: "Guard Test User",
        sessionVersion: 3,
      })

      authMock.mockResolvedValue({
        user: {
          id: String(user._id),
          sessionVersion: 3,
        },
      })

      const result = await requireUser()

      expect(result.response).toBeNull()
      expect(result.actor).toMatchObject<Partial<AuthenticatedActor>>({
        role: "user",
        sessionVersion: 3,
      })
      expect(String(result.actor?.user._id)).toBe(String(user._id))
      expect(connectToDatabaseMock).toHaveBeenCalledTimes(1)
    })

    it("returns unauthorized for a stale session version", async () => {
      const user = await createTestUser({
        sessionVersion: 2,
      })

      authMock.mockResolvedValue({
        user: {
          id: String(user._id),
          sessionVersion: 1,
        },
      })

      const result = await requireUser()

      expect(result.actor).toBeNull()
      expect(result.response?.status).toBe(401)
    })
  })

  describe("requireAdmin", () => {
    it("returns forbidden for non-admin users", async () => {
      const user = await createTestUser()

      authMock.mockResolvedValue({
        user: {
          id: String(user._id),
          sessionVersion: 1,
        },
      })

      const result = await requireAdmin()
      const response = result.response
      if (!response) {
        throw new Error("Expected forbidden response")
      }

      expect(result.actor).toBeNull()
      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: "Admin access required",
      })
    })

    it("allows admins through", async () => {
      const admin = await createTestAdmin({
        sessionVersion: 4,
      })

      authMock.mockResolvedValue({
        user: {
          id: String(admin._id),
          sessionVersion: 4,
        },
      })

      const result = await requireAdmin()

      expect(result.response).toBeNull()
      expect(result.actor?.role).toBe("admin")
      expect(String(result.actor?.user._id)).toBe(String(admin._id))
    })
  })

  describe("requireSelfOrAdmin", () => {
    it("allows users to access themselves", async () => {
      const user = await createTestUser({
        userID: "kapioo-self",
      })

      authMock.mockResolvedValue({
        user: {
          id: String(user._id),
          sessionVersion: 1,
        },
      })

      const byObjectId = await requireSelfOrAdmin(String(user._id))
      const byUserId = await requireSelfOrAdmin("kapioo-self")

      expect(byObjectId.response).toBeNull()
      expect(byUserId.response).toBeNull()
      expect(byObjectId.actor?.role).toBe("user")
      expect(byUserId.actor?.role).toBe("user")
    })

    it("forbids non-admin access to another user", async () => {
      const user = await createTestUser()

      authMock.mockResolvedValue({
        user: {
          id: String(user._id),
          sessionVersion: 1,
        },
      })

      const result = await requireSelfOrAdmin("someone-else")

      expect(result.actor).toBeNull()
      expect(result.response?.status).toBe(403)
    })

    it("allows admins to access other users", async () => {
      const admin = await createTestAdmin()

      authMock.mockResolvedValue({
        user: {
          id: String(admin._id),
          sessionVersion: 1,
        },
      })

      const result = await requireSelfOrAdmin("different-user")

      expect(result.response).toBeNull()
      expect(result.actor?.role).toBe("admin")
    })
  })

  describe("requireAdminMfa", () => {
    it("allows admins with a valid signed MFA cookie", async () => {
      const admin = await createTestAdmin({
        sessionVersion: 5,
      })

      authMock.mockResolvedValue({
        user: {
          id: String(admin._id),
          sessionVersion: 5,
        },
      })

      const token = await createSignedAdminMfaCookie({
        userId: String(admin._id),
        sessionVersion: 5,
        exp: Date.now() + 60_000,
      })

      const result = await requireAdminMfa(getCookieRequest(token))

      expect(result.response).toBeNull()
      expect(result.actor?.role).toBe("admin")
    })

    it("rejects admins with a missing or mismatched MFA cookie", async () => {
      const admin = await createTestAdmin({
        sessionVersion: 2,
      })

      authMock.mockResolvedValue({
        user: {
          id: String(admin._id),
          sessionVersion: 2,
        },
      })

      const mismatchedToken = await createSignedAdminMfaCookie({
        userId: String(admin._id),
        sessionVersion: 999,
        exp: Date.now() + 60_000,
      })

      const missingCookieResult = await requireAdminMfa(getCookieRequest())
      const mismatchedCookieResult = await requireAdminMfa(getCookieRequest(mismatchedToken))

      expect(missingCookieResult.actor).toBeNull()
      expect(missingCookieResult.response?.status).toBe(403)
      expect(mismatchedCookieResult.actor).toBeNull()
      expect(mismatchedCookieResult.response?.status).toBe(403)
    })
  })
})
