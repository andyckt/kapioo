/** Matches `session.maxAge` in auth.ts */
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/** PBKDF2-SHA512 iterations for newly created passwords */
export const PASSWORD_PBKDF2_ITERATIONS = 310_000;

/** Legacy accounts (seed data, pre-security-hardening) */
export const LEGACY_PASSWORD_PBKDF2_ITERATIONS = 1_000;
