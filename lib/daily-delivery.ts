// Cache for cutoff time settings
let cutoffTimeCache: { hour: number; minute: number; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

// Fetch cutoff time with caching
async function getCutoffTime(): Promise<{ hour: number; minute: number }> {
  // Check if cache is valid
  if (cutoffTimeCache && (Date.now() - cutoffTimeCache.timestamp) < CACHE_DURATION) {
    return { hour: cutoffTimeCache.hour, minute: cutoffTimeCache.minute };
  }
  
  // Fetch from API
  try {
    const response = await fetch('/api/settings?key=cutoffTime', {
      cache: 'no-store'
    });
    const data = await response.json();
    
    if (data.success && data.data) {
      const hour = data.data.value.hour || 11;
      const minute = data.data.value.minute || 59;
      
      // Update cache
      cutoffTimeCache = { hour, minute, timestamp: Date.now() };
      
      return { hour, minute };
    }
  } catch (error) {
    console.warn('Failed to fetch cutoff time, using default', error);
  }
  
  // Return default
  return { hour: 11, minute: 59 };
}

// Types for daily delivery service
export type ComboType = 'A' | 'B'

export type DishItem = {
  name: string
}

export type ComboItem = {
  id: string
  name: string
  calories: number
  proteinGrams?: number
  descriptionZh?: string
  descriptionEn?: string
  tags: string[]
  tagsEn?: string[]
  allergensZh?: string[]
  allergensEn?: string[]
  typeA: {
    dishes: string[]
    dishesEn?: string[]
    voucherType: 'twoDish'
  }
  typeB: {
    dishes: string[]
    dishesEn?: string[]
    voucherType: 'threeDish'
  }
  imageUrl?: string
  featuredInMenuPreview?: boolean
}

type RawCombo = {
  comboId?: unknown
  id?: unknown
  name?: unknown
  calories?: unknown
  proteinGrams?: unknown
  descriptionZh?: unknown
  descriptionEn?: unknown
  tags?: unknown
  tagsEn?: unknown
  allergensZh?: unknown
  allergensEn?: unknown
  typeA?: unknown
  typeB?: unknown
  imageUrl?: unknown
  featuredInMenuPreview?: unknown
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function normalizeVoucherOption(
  option: unknown,
  voucherType: 'twoDish' | 'threeDish'
): { dishes: string[]; dishesEn?: string[]; voucherType: 'twoDish' | 'threeDish' } {
  const optionRecord = option && typeof option === 'object' ? option as Record<string, unknown> : {}
  const dishes = normalizeStringArray(optionRecord.dishes)
  const dishesEn = normalizeStringArray(optionRecord.dishesEn)

  return {
    dishes,
    ...(dishesEn.length > 0 ? { dishesEn } : {}),
    voucherType,
  }
}

export function formatDailyCombo(combo: RawCombo): ComboItem {
  return {
    id: String(combo.comboId || combo.id || ""),
    name: String(combo.name || ""),
    calories: Number(combo.calories || 0),
    ...(normalizeOptionalNumber(combo.proteinGrams) !== undefined
      ? { proteinGrams: normalizeOptionalNumber(combo.proteinGrams) }
      : {}),
    ...(normalizeOptionalString(combo.descriptionZh) ? { descriptionZh: normalizeOptionalString(combo.descriptionZh) } : {}),
    ...(normalizeOptionalString(combo.descriptionEn) ? { descriptionEn: normalizeOptionalString(combo.descriptionEn) } : {}),
    tags: normalizeStringArray(combo.tags),
    ...(normalizeStringArray(combo.tagsEn).length > 0 ? { tagsEn: normalizeStringArray(combo.tagsEn) } : {}),
    ...(normalizeStringArray(combo.allergensZh).length > 0 ? { allergensZh: normalizeStringArray(combo.allergensZh) } : {}),
    ...(normalizeStringArray(combo.allergensEn).length > 0 ? { allergensEn: normalizeStringArray(combo.allergensEn) } : {}),
    typeA: normalizeVoucherOption(combo.typeA, 'twoDish') as ComboItem['typeA'],
    typeB: normalizeVoucherOption(combo.typeB, 'threeDish') as ComboItem['typeB'],
    imageUrl: typeof combo.imageUrl === "string" && combo.imageUrl ? combo.imageUrl : undefined,
    ...(combo.featuredInMenuPreview === true ? { featuredInMenuPreview: true } : {}),
  }
}

export function applyDailyMenuPreviewCuration<T extends { combo: Pick<ComboItem, "featuredInMenuPreview"> }>(
  items: T[]
): T[] {
  const featuredItems = items.filter((item) => item.combo.featuredInMenuPreview === true)
  return featuredItems.length > 0 ? featuredItems : items
}

/** 3-dish dishes not in the 2-dish set — listed as extras in dashboard + menu preview UIs. */
export function dishesBeyondTwoDishSet(
  twoDishDishes: string[],
  threeDishDishes: string[]
): string[] {
  return threeDishDishes.filter((dish) => !twoDishDishes.includes(dish))
}

export type DailyMenuLanguage = "en" | "zh"

export function getDailyComboDescription(combo: ComboItem, language: DailyMenuLanguage) {
  return language === "zh"
    ? combo.descriptionZh || combo.descriptionEn
    : combo.descriptionEn || combo.descriptionZh
}

export function getDailyComboTags(combo: ComboItem, language: DailyMenuLanguage) {
  return language === "zh" ? combo.tags : combo.tagsEn?.length ? combo.tagsEn : combo.tags
}

export function getDailyComboAllergens(combo: ComboItem, language: DailyMenuLanguage) {
  return language === "zh"
    ? combo.allergensZh ?? combo.allergensEn ?? []
    : combo.allergensEn ?? combo.allergensZh ?? []
}

export function getDailyComboDishName(
  combo: ComboItem,
  slot: "typeA" | "typeB",
  index: number,
  dish: string,
  language: DailyMenuLanguage,
  fallbackTranslateDishName?: (name: string) => string
) {
  if (language === "zh") return dish
  return combo[slot].dishesEn?.[index] || fallbackTranslateDishName?.(dish) || dish
}

export type DayData = {
  date: string
  displayName: string
  week: number
  combos: ComboItem[]
}

export type CartItem = {
  day: string
  date: string
  comboId: string
  comboName: string
  type: ComboType
  quantity: number
  voucherType: 'twoDish' | 'threeDish'
}

export type DeliveryAddress = {
  unitNumber: string
  streetAddress: string
  city: string
  province: string
  postalCode: string
  country: string
  buzzCode?: string
}

export type DailyOrderData = {
  userId: string
  items: CartItem[]
  specialInstructions?: string
  deliveryAddress: DeliveryAddress
  phoneNumber: string
  area: string
  idempotencyKey?: string  // Add idempotency key
}

// Get active delivery days
export async function getActiveDays(): Promise<Record<string, DayData>> {
  try {
    const response = await fetch('/api/days?isActive=true', {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
    const daysData = await response.json()
    
    if (daysData.success) {
      const formattedDays: Record<string, DayData> = {}
      
      // Process each day
      for (const day of daysData.data) {
        // Fetch combos for this day
        const combosResponse = await fetch(`/api/days/${day.dayId}/combos`)
        const combosData = await combosResponse.json()
        
        if (combosData.success) {
          // Format combo data to match our component's expected structure
          const formattedCombos = combosData.data.map(formatDailyCombo)
          
          formattedDays[day.dayId] = {
            date: day.date,
            displayName: day.displayName,
            week: day.week,
            combos: formattedCombos
          }
        }
      }
      
      return formattedDays
    } else {
      console.error('Failed to fetch days:', daysData.error)
      return {}
    }
  } catch (error) {
    console.error('Error fetching days:', error)
    return {}
  }
}

// Submit daily delivery order
export async function submitDailyOrder(data: DailyOrderData): Promise<any> {
  try {
    // Apply 13% tax to the order
    // For daily delivery, we don't have a monetary price but we indicate that tax is included
    const taxRate = 0.13; // 13% tax rate
    const dataWithTax = {
      ...data,
      taxIncluded: true,
      taxRate: taxRate
      // Note: Language preference is now fetched from user's database settings in the API
    };
    
    const response = await fetch('/api/daily-delivery/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataWithTax),
    })
    
    const result = await response.json()
    
    if (result.success) {
      return {
        ...result.data,
        remainingVouchers: result.remainingVouchers
      }
    }
    
    console.error('Failed to submit daily order:', result.error)
    return { 
      error: result.error, 
      required: result.required, 
      available: result.available 
    }
  } catch (error) {
    console.error('Error submitting daily order:', error)
    return { error: 'An unexpected error occurred' }
  }
}

// Calculate total vouchers needed for cart
export function calculateVouchers(cart: CartItem[]): { twoDish: number, threeDish: number } {
  const totals = {
    twoDish: 0,
    threeDish: 0
  }
  
  cart.forEach(item => {
    if (item.voucherType === 'twoDish') {
      totals.twoDish += item.quantity
    } else {
      totals.threeDish += item.quantity
    }
  })
  
  return totals
}

// Check if a day is in the past or today after ordering cutoff time
export async function isDayUnavailable(day: string, days: Record<string, DayData>): Promise<{ unavailable: boolean, reason: string }> {
  try {
    // Fetch cutoff time from settings (with caching)
    const { hour: cutoffHour, minute: cutoffMinute } = await getCutoffTime();
    
    // Get current date and time in Toronto timezone
    const torontoOptions = { timeZone: 'America/Toronto' }
    const now = new Date()
    
    // Format the Toronto time as a string to work with
    const torontoDateString = now.toLocaleString('en-US', torontoOptions)
    const torontoDate = new Date(torontoDateString)
    
    // Get the current hour and minute in Toronto
    const currentHour = torontoDate.getHours()
    const currentMinute = torontoDate.getMinutes()
    
    // Check if we have a date for this meal
    const dayData = days[day]
    if (!dayData || !dayData.date) {
      return { 
        unavailable: true, 
        reason: "Date not available for this meal" 
      }
    }
    
    const mealDate = dayData.date
    
    // Parse the date (expected format like "Jan 01" or "Oct 10")
    try {
      const parts = mealDate.split(' ')
      
      // Handle formats like "Jan 01" or "Oct 10"
      if (parts.length === 2) {
        const monthStr = parts[0]
        const dayStr = parts[1]
        
        // Get month index (0-11) using short month names
        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthIndex = shortMonths.findIndex(m => 
          monthStr.toLowerCase() === m.toLowerCase())
        
        // Parse day number
        const dayNum = parseInt(dayStr)
        
        if (monthIndex !== -1 && !isNaN(dayNum)) {
          // Create a date for the meal's specific date (use current year)
          const mealSpecificDate = new Date(
            torontoDate.getFullYear(), 
            monthIndex, 
            dayNum
          )
          
          // Compare with today's date
          const todayYMD = new Date(
            torontoDate.getFullYear(), 
            torontoDate.getMonth(), 
            torontoDate.getDate()
          )
          
          // Create tomorrow's date for comparison
          const tomorrowYMD = new Date(
            torontoDate.getFullYear(),
            torontoDate.getMonth(),
            torontoDate.getDate() + 1
          )
          
          // If meal date is before today
          if (mealSpecificDate < todayYMD) {
            return { 
              unavailable: true, 
              reason: "This specific date has already passed" 
            }
          }
          
          // If it's for tomorrow and it's past the cutoff time today
          if (mealSpecificDate.getTime() === tomorrowYMD.getTime() && 
              (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute > cutoffMinute))) {
            const period = cutoffHour >= 12 ? 'PM' : 'AM';
            const displayHour = cutoffHour === 0 ? 12 : cutoffHour > 12 ? cutoffHour - 12 : cutoffHour;
            const displayMinute = cutoffMinute.toString().padStart(2, '0');
            return { 
              unavailable: true, 
              reason: `Orders must be placed by ${displayHour}:${displayMinute} ${period} the day before delivery` 
            }
          }
          
          // If it's for today (which should not be available for ordering)
          if (mealSpecificDate.getTime() === todayYMD.getTime()) {
            const period = cutoffHour >= 12 ? 'PM' : 'AM';
            const displayHour = cutoffHour === 0 ? 12 : cutoffHour > 12 ? cutoffHour - 12 : cutoffHour;
            const displayMinute = cutoffMinute.toString().padStart(2, '0');
            return { 
              unavailable: true, 
              reason: `Orders must be placed by ${displayHour}:${displayMinute} ${period} the day before delivery`
            }
          }
          
          // If we have a valid date and it's at least 2 days in the future or tomorrow before/at 11:59 AM, it's available
          return { unavailable: false, reason: "" }
        }
      }
      
      // If we couldn't parse the date properly
      return { 
        unavailable: true, 
        reason: "Invalid date format" 
      }
    } catch (error) {
      console.error('Error parsing meal date:', error)
      return { 
        unavailable: true, 
        reason: "Error parsing date" 
      }
    }
  } catch (error) {
    console.error('Error in isDayUnavailable:', error)
    return { unavailable: false, reason: "" } // Default to available on error
  }
}

// Format address for display
export function formatAddress(address: DeliveryAddress | null | undefined): string {
  if (!address) return "No address provided"
  
  let formattedAddress = ''
  
  if (address.unitNumber) {
    formattedAddress += `Unit ${address.unitNumber}, `
  }
  
  formattedAddress += address.streetAddress || ''
  
  if (address.city || address.province || address.postalCode) {
    formattedAddress += `, ${address.city || ''} ${address.province || ''} ${address.postalCode || ''}`
  }
  
  if (address.country) {
    formattedAddress += `, ${address.country}`
  }
  
  return formattedAddress
}
