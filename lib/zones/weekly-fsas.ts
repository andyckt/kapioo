/**
 * Weekly delivery FSA whitelist — the single source of truth for weekly eligibility.
 *
 * Set by the third-party carrier. Each entry is a 3-character Canadian FSA prefix
 * (the first 3 characters of a postal code, e.g. "M5V", "L4B").
 *
 * HOW TO UPDATE (when carrier sends the list):
 * =============================================
 * 1. Receive the FSA list from your carrier (any format)
 * 2. Paste it below as a string array — any case and spacing is fine,
 *    the system normalizes automatically (uppercase, trims spaces)
 * 3. Run: npx tsx scripts/audit-zone-impact.ts --service weekly
 *    Review anyone who would lose weekly access and handle before activating
 * 4. Run: npm test
 * 5. Commit and deploy
 *
 * CURRENT STATE: null
 * null means the carrier list has not been received yet.
 * When null, weekly eligibility falls back to the display.weekly label flag
 * (same behavior as today — no disruption to current users).
 */
export const WEEKLY_FSA_LIST: readonly string[] | null = null;
