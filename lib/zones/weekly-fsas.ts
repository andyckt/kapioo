/**
 * Weekly delivery FSA whitelist — the single source of truth for weekly eligibility.
 *
 * Set by the third-party carrier. Each entry is a 3-character Canadian FSA prefix
 * (first 3 characters of a postal code, e.g. "M5V", "L4B").
 *
 * HOW TO UPDATE:
 * ==============
 * 1. Receive the updated FSA list from your carrier
 * 2. Replace the arrays below — any case/spacing is fine, normalized automatically
 * 3. Run: npx tsx scripts/audit-zone-impact.ts --service weekly
 *    Review anyone who would lose weekly access and handle before activating
 * 4. Run: npm test
 * 5. Commit and deploy
 *
 * DELIVERY FEE TIERS (for reference — eligibility is the same for all):
 *   Regular areas:          $11.99 / week  (REGULAR_WEEKLY_FSAS below)
 *   Hamilton / Burlington:  $15.99 / week  (HAMILTON_BURLINGTON_WEEKLY_FSAS below)
 *
 * The WEEKLY_FSA_LIST combines both tiers for the eligibility gate.
 * Fee-tier logic (if needed at checkout) should import the sub-lists below.
 *
 * CORRECTIONS APPLIED from carrier list (OCR/copy-paste artifacts fixed):
 *   MIC → M1C, MIE → M1E, MIG → M1G, MIH → M1H, MIJ → M1J, MIK → M1K,
 *   MIL → M1L, MIM → M1M, MIN → M1N, MIP → M1P, MIR → M1R, MIS → M1S,
 *   MIT → M1T, MIV → M1V, MIW → M1W  (capital letter I → digit 1)
 *   MSC → M5C  (digit 5 misread as S)
 *   МБС → M6C, МБЕ → M6E, М6Н → M6H, МбК → M6K  (Cyrillic chars → ASCII)
 *   LOJ → L0J  (letter O → digit 0)
 */

/** Regular delivery area — $11.99 / week */
export const REGULAR_WEEKLY_FSAS: readonly string[] = [
  "L0J",
  "L3L", "L3P", "L3R", "L3S", "L3T", "L3X", "L3Y",
  "L4B", "L4C", "L4E", "L4G", "L4H", "L4J", "L4K", "L4L",
  "L4S", "L4T", "L4V", "L4W", "L4X", "L4Y", "L4Z",
  "L5A", "L5B", "L5C", "L5E", "L5G", "L5H", "L5J", "L5K",
  "L5L", "L5M", "L5N", "L5P", "L5R", "L5S", "L5T", "L5V", "L5W",
  "L6A", "L6B", "L6C", "L6E", "L6G", "L6H", "L6J", "L6K",
  "L6L", "L6M", "L6P", "L6R", "L6S", "L6T", "L6V", "L6W",
  "L6X", "L6Y", "L6Z",
  "L7A", "L7B",
  "M1B", "M1C", "M1E", "M1G", "M1H", "M1J", "M1K", "M1L",
  "M1M", "M1N", "M1P", "M1R", "M1S", "M1T", "M1V", "M1W", "M1X",
  "M2H", "M2J", "M2K", "M2L", "M2M", "M2N", "M2P", "M2R",
  "M3A", "M3B", "M3C", "M3H", "M3J", "M3K", "M3L", "M3M", "M3N",
  "M4A", "M4B", "M4C", "M4E", "M4G", "M4H", "M4J", "M4K",
  "M4L", "M4M", "M4N", "M4P", "M4R", "M4S", "M4T", "M4V",
  "M4W", "M4X", "M4Y",
  "M5A", "M5B", "M5C", "M5E", "M5G", "M5H", "M5J", "M5K",
  "M5M", "M5N", "M5P", "M5R", "M5S", "M5T", "M5V", "M5X",
  "M6A", "M6B", "M6C", "M6E", "M6G", "M6H", "M6J", "M6K",
  "M6L", "M6M", "M6N", "M6P", "M6R", "M6S",
  "M7A",
  "M8V", "M8W", "M8X", "M8Y", "M8Z",
  "M9A", "M9B", "M9C", "M9L", "M9M", "M9N", "M9P", "M9R", "M9V", "M9W",
];

/** Hamilton / Burlington — $15.99 / week */
export const HAMILTON_BURLINGTON_WEEKLY_FSAS: readonly string[] = [
  "L7L", "L7M", "L7N", "L7R", "L7S", "L7T",
  "L8B", "L8H", "L8K", "L8L", "L8M", "L8N", "L8P",
  "L8R", "L8S", "L8T", "L8V", "L8W",
  "L9A", "L9B", "L9C", "L9G", "L9H", "L9K",
];

/**
 * Combined eligibility whitelist — all FSAs the carrier serves.
 * Used by canDeliverWeekly() to gate weekly orders.
 */
export const WEEKLY_FSA_LIST: readonly string[] | null = [
  ...REGULAR_WEEKLY_FSAS,
  ...HAMILTON_BURLINGTON_WEEKLY_FSAS,
];
