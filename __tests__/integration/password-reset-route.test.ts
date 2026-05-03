import User from "@/models/User"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestUser } from "../helpers/factories"
import { buildJsonRequest } from "../helpers/request"

const { connectToDatabaseMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}))

import { POST } from "@/app/api/auth/reset-password/route"

describe("app/api/auth/reset-password", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    connectToDatabaseMock.mockReset()
    connectToDatabaseMock.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  it("resets password from the verification-code flow using newPassword", async () => {
    const user = await createTestUser({ email: "reset-user@example.com" }, "OldPassword123!")
    user.resetPasswordCode = "123456"
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()

    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/auth/reset-password", {
        email: "reset-user@example.com",
        code: "123456",
        newPassword: "NewPassword123!",
      })
    )

    const json = await response.json()
    const savedUser = await User.findById(user._id)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(savedUser?.resetPasswordCode).toBeUndefined()
    await expect(savedUser?.comparePassword("NewPassword123!")).resolves.toBe(true)
  })

  it("accepts the legacy password payload key for already-open reset tabs", async () => {
    const user = await createTestUser({ email: "legacy-reset@example.com" }, "OldPassword123!")
    user.resetPasswordCode = "654321"
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()

    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/auth/reset-password", {
        email: "legacy-reset@example.com",
        code: "654321",
        password: "LegacyNewPassword123!",
      })
    )

    const json = await response.json()
    const savedUser = await User.findById(user._id)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    await expect(savedUser?.comparePassword("LegacyNewPassword123!")).resolves.toBe(true)
  })
})
