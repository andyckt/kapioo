// Types for daily delivery service
export type ComboType = 'A' | 'B'

export type DishItem = {
  name: string
}

export type ComboItem = {
  id: string
  name: string
  calories: number
  tags: string[]
  typeA: {
    dishes: string[]
    voucherType: 'twoDish'
  }
  typeB: {
    dishes: string[]
    voucherType: 'threeDish'
  }
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
          const formattedCombos = combosData.data.map((combo: any) => ({
            id: combo.comboId,
            name: combo.name,
            calories: combo.calories,
            tags: combo.tags,
            typeA: combo.typeA,
            typeB: combo.typeB
          }))
          
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
    const response = await fetch('/api/daily-delivery/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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
export function isDayUnavailable(day: string, days: Record<string, DayData>): { unavailable: boolean, reason: string } {
  try {
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
          
          // If it's for tomorrow and it's past 11:59 AM today
          if (mealSpecificDate.getTime() === tomorrowYMD.getTime() && 
              (currentHour > 11 || (currentHour === 11 && currentMinute > 59))) {
            return { 
              unavailable: true, 
              reason: "Orders must be placed by 11:59 AM the day before delivery" 
            }
          }
          
          // If it's for today (which should not be available for ordering)
          if (mealSpecificDate.getTime() === todayYMD.getTime()) {
            return { 
              unavailable: true, 
              reason: "Orders must be placed by 11:59 AM the day before delivery"
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
