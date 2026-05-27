import User from "@/models/User";

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { buildJsonRequest } from "../helpers/request";
import { getAuthSessionCookieName } from "@/lib/auth/session";

const { connectToDatabaseMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

import { POST } from "@/app/api/auth/register/route";

describe("app/api/auth/register", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    connectToDatabaseMock.mockReset();
    connectToDatabaseMock.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("creates a verified user, returns client profile, and sets session cookie", async () => {
    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/auth/register", {
        name: "New Signup",
        email: "new-signup@example.com",
        password: "SignupPassword123!",
        languagePreference: "en",
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.authenticated).toBe(true);
    expect(body.data.user.email).toBe("new-signup@example.com");
    expect(body.data.user.isVerified).toBe(true);

    const cookieName = getAuthSessionCookieName(false);
    const sessionCookie = response.cookies.get(cookieName);
    expect(sessionCookie?.value).toBeTruthy();

    const saved = await User.findOne({ email: "new-signup@example.com" });
    expect(saved?.isVerified).toBe(true);
    await expect(saved?.comparePassword("SignupPassword123!")).resolves.toBe(true);
  });

  it("returns 409 when email already exists", async () => {
    await User.create({
      userID: "user111",
      name: "Existing",
      email: "taken@example.com",
      password: "hash",
      salt: "salt",
      status: "Active",
      isVerified: true,
      languagePreference: "zh",
    });

    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/auth/register", {
        name: "Another",
        email: "taken@example.com",
        password: "SignupPassword123!",
      })
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
