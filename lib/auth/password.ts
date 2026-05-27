import crypto from "crypto";
import { promisify } from "util";

import {
  LEGACY_PASSWORD_PBKDF2_ITERATIONS,
  PASSWORD_PBKDF2_ITERATIONS,
} from "@/lib/auth/constants";

const pbkdf2Async = promisify(crypto.pbkdf2);

export function createPasswordSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function hashPassword(
  password: string,
  salt: string,
  iterations: number = PASSWORD_PBKDF2_ITERATIONS
): Promise<string> {
  const hash = await pbkdf2Async(password, salt, iterations, 64, "sha512");
  return hash.toString("hex");
}

export async function verifyPassword(
  candidatePassword: string,
  salt: string,
  storedHash: string,
  iterations?: number | null
): Promise<boolean> {
  const effectiveIterations = Number(iterations || LEGACY_PASSWORD_PBKDF2_ITERATIONS);
  const hash = await hashPassword(candidatePassword, salt, effectiveIterations);
  return storedHash === hash;
}
