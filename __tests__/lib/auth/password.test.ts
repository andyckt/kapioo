import { describe, expect, it } from "vitest";

import {
  LEGACY_PASSWORD_PBKDF2_ITERATIONS,
  PASSWORD_PBKDF2_ITERATIONS,
} from "@/lib/auth/constants";
import { createPasswordSalt, hashPassword, verifyPassword } from "@/lib/auth/password";

describe("lib/auth/password", () => {
  it("hashes and verifies with current iteration count", async () => {
    const salt = createPasswordSalt();
    const password = "TestPassword123!";
    const hash = await hashPassword(password, salt, PASSWORD_PBKDF2_ITERATIONS);

    await expect(verifyPassword(password, salt, hash, PASSWORD_PBKDF2_ITERATIONS)).resolves.toBe(
      true
    );
    await expect(
      verifyPassword("wrong-password", salt, hash, PASSWORD_PBKDF2_ITERATIONS)
    ).resolves.toBe(false);
  });

  it("supports legacy 1000-iteration accounts", async () => {
    const salt = createPasswordSalt();
    const password = "LegacyPassword123!";
    const hash = await hashPassword(password, salt, LEGACY_PASSWORD_PBKDF2_ITERATIONS);

    await expect(verifyPassword(password, salt, hash, null)).resolves.toBe(true);
  });
});
