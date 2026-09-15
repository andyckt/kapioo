import InteracPayerEmail from "@/models/InteracPayerEmail";
import {
  beginInteracPayerEmailVerification,
  InteracPayerEmailError,
  listInteracPayerEmails,
  verifyInteracPayerEmail,
} from "@/lib/etransfer/payer-email";

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";

describe("Interac payer email verification", () => {
  beforeAll(async () => {
    await setupTestDb();
    await InteracPayerEmail.syncIndexes();
  });

  beforeEach(async () => {
    await clearCollections();
    process.env.AUTH_SECRET = "test-only-interac-email-secret-32-characters";
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("verifies ownership without storing or returning the six-digit code", async () => {
    const user = await createTestUser({ email: "account@example.com" });
    let sentCode = "";

    const started = await beginInteracPayerEmailVerification({
      userId: user._id,
      email: "Sender@Example.com",
      sendCode: async (code) => {
        sentCode = code;
      },
    });

    expect(sentCode).toMatch(/^\d{6}$/);
    expect(started.record.verificationCodeHash).not.toBe(sentCode);
    const verified = await verifyInteracPayerEmail({
      userId: user._id,
      email: "sender@example.com",
      code: sentCode,
    });

    expect(verified).toMatchObject({ status: "verified", emailNormalized: "sender@example.com" });
    expect(verified.verificationCodeHash).toBeUndefined();
    expect(await listInteracPayerEmails(user._id)).toEqual([
      expect.objectContaining({ email: "sender@example.com", status: "verified" }),
    ]);
  });

  it("enforces three slots even for different addresses", async () => {
    const user = await createTestUser({ email: "three-slots@example.com" });
    for (const email of ["one@example.com", "two@example.com", "three@example.com"]) {
      await beginInteracPayerEmailVerification({
        userId: user._id,
        email,
        sendCode: async () => undefined,
      });
    }

    await expect(
      beginInteracPayerEmailVerification({
        userId: user._id,
        email: "four@example.com",
        sendCode: async () => undefined,
      })
    ).rejects.toMatchObject({ code: "EMAIL_LIMIT_REACHED" });
    expect(await InteracPayerEmail.countDocuments({ userId: user._id })).toBe(3);
  });

  it("does not allow one sender email to identify two accounts", async () => {
    const first = await createTestUser({ email: "first@example.com" });
    const second = await createTestUser({ email: "second@example.com" });
    await beginInteracPayerEmailVerification({
      userId: first._id,
      email: "shared@example.com",
      sendCode: async () => undefined,
    });

    await expect(
      beginInteracPayerEmailVerification({
        userId: second._id,
        email: "shared@example.com",
        sendCode: async () => undefined,
      })
    ).rejects.toMatchObject({ code: "EMAIL_ALREADY_LINKED", status: 409 });
  });

  it("locks a verification challenge after five incorrect codes", async () => {
    const user = await createTestUser({ email: "attempts@example.com" });
    await beginInteracPayerEmailVerification({
      userId: user._id,
      email: "payer@example.com",
      sendCode: async () => undefined,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        verifyInteracPayerEmail({
          userId: user._id,
          email: "payer@example.com",
          code: "000000",
        })
      ).rejects.toBeInstanceOf(InteracPayerEmailError);
    }

    await expect(
      verifyInteracPayerEmail({
        userId: user._id,
        email: "payer@example.com",
        code: "000000",
      })
    ).rejects.toMatchObject({ code: "CODE_ATTEMPTS_EXCEEDED", status: 429 });
  });

  it("atomically caps simultaneous verification attempts", async () => {
    const user = await createTestUser({ email: "concurrent-attempts@example.com" });
    await beginInteracPayerEmailVerification({
      userId: user._id,
      email: "concurrent-payer@example.com",
      sendCode: async () => undefined,
    });

    await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        verifyInteracPayerEmail({
          userId: user._id,
          email: "concurrent-payer@example.com",
          code: "000000",
        })
      )
    );

    const record = await InteracPayerEmail.findOne({
      userId: user._id,
      emailNormalized: "concurrent-payer@example.com",
    }).lean();
    expect(record?.failedAttempts).toBe(5);
  });
});
