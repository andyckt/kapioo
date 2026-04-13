import { afterEach, vi } from "vitest"

Object.assign(process.env, { NODE_ENV: "test" })
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/kapioo-vitest"
process.env.AUTH_SECRET ??= "test-auth-secret"
process.env.ADMIN_MFA_COOKIE_SECRET ??= "test-admin-mfa-secret"

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
