/**
 * Central source of truth for all delivery areas
 * 
 * To add a new area in the future:
 * 1. Add the area name to either DAILY_DELIVERY_AREAS or WEEKLY_ONLY_AREAS
 * 2. That's it! The change will automatically reflect in all components
 * 
 * No need to edit multiple files anymore.
 */

// ============================================
// DAILY DELIVERY AREAS (Full Service)
// ============================================
// These areas have BOTH daily delivery AND weekly meal box service
export const DAILY_DELIVERY_AREAS = [
  "Downtown Toronto",
  "Midtown",
  "North York",
  "Markham",
  "Richmond Hill"
] as const

// ============================================
// WEEKLY-ONLY AREAS
// ============================================
// These areas have ONLY weekly meal box service (no daily delivery)
export const WEEKLY_ONLY_AREAS = [
  "East York",
  "York",
  "Etobicoke",
  "Scarborough",
  "Thornhill",
  "Vaughan (including Maple, Concord, King)",
  "Aurora",
  "Newmarket",
  "Brampton",
  "Mississauga",
  "Oakville",
  "Hamilton",
  "Burlington"
] as const

// ============================================
// COMBINED LISTS
// ============================================

// All areas that support weekly meal box (daily + weekly-only)
export const ALL_WEEKLY_AREAS = [
  ...DAILY_DELIVERY_AREAS,
  ...WEEKLY_ONLY_AREAS
] as const

// All areas (same as ALL_WEEKLY_AREAS for now)
export const ALL_AREAS = ALL_WEEKLY_AREAS

// ============================================
// TYPESCRIPT TYPES
// ============================================

export type DailyDeliveryArea = typeof DAILY_DELIVERY_AREAS[number]
export type WeeklyOnlyArea = typeof WEEKLY_ONLY_AREAS[number]
export type Area = typeof ALL_AREAS[number]

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if an area supports daily delivery
 */
export function isDailyDeliveryArea(area: string): boolean {
  return DAILY_DELIVERY_AREAS.includes(area as any)
}

/**
 * Check if an area supports weekly delivery
 */
export function isWeeklyDeliveryArea(area: string): boolean {
  return ALL_WEEKLY_AREAS.includes(area as any)
}

/**
 * Check if an area is weekly-only (no daily delivery)
 */
export function isWeeklyOnlyArea(area: string): boolean {
  return WEEKLY_ONLY_AREAS.includes(area as any)
}

/**
 * Get display name for an area (can be extended with Chinese translations)
 */
export function getAreaDisplayName(area: string, language: 'en' | 'zh' = 'en'): string {
  // For now, return English name
  // Can be extended to return Chinese names if needed
  return area
}
