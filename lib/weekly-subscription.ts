// Types for weekly subscription
export type MealOption = {
  id: string;
  name: string;
  nameEn?: string; // English translation of the dish name
  tags?: string[];
  active: boolean;
}

export type DeliveryDay = {
  id: string;
  day: 'sunday' | 'tuesday';
  name: string;
  date: string;
  weekOffset: number; // 0 for current week, 1 for next week, 2 for week 3
  active: boolean;
  options: MealOption[];
}

export type DeliverySection = {
  id: string;
  title: string;
  day: DeliveryDay;
}

export type CartItem = {
  dayId: string;
  optionId: string;
  quantity: number;
  weekOffset?: number; // Add weekOffset to identify which week's delivery
}

// Get all delivery days and meal options for admin
export async function getAdminWeeklySubscription(): Promise<DeliverySection[]> {
  try {
    console.log('Fetching weekly subscription data from API...');
    const response = await fetch('/api/weekly-subscription', {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      console.error('API response not OK:', {
        status: response.status,
        statusText: response.statusText
      });
      
      // Try to parse error details
      try {
        const errorData = await response.json();
        console.error('API error details:', errorData);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('API response received:', result);
    
    if (result.success && result.data) {
      // Format the response to match the frontend structure
      const deliverySections: DeliverySection[] = result.data.map((day: any) => {
        const weekText = day.weekOffset === 0 ? 'This Week' : day.weekOffset === 1 ? 'Next Week' : 'Week 3';
        const dayText = day.day === 'sunday' ? 'Sunday' : 'Tuesday';
        
        return {
          id: `${day.weekOffset === 0 ? 'current' : day.weekOffset === 1 ? 'next' : 'week3'}-${day.day}`,
          title: `${weekText} ${dayText} Delivery`,
          day: {
            id: day.day,
            day: day.day,
            name: day.name,
            date: day.date,
            weekOffset: day.weekOffset,
            active: day.active,
            options: day.options.map((option: any) => ({
              id: option._id,
              name: option.name,
              nameEn: option.nameEn, // Include English name
              tags: option.tags || [],
              active: option.active
            }))
          }
        };
      });
      
      return deliverySections;
    }
    
    console.error('Failed to fetch weekly subscription data');
    return [];
  } catch (error) {
    console.error('Error fetching weekly subscription data:', error);
    return [];
  }
}

// Update delivery day settings
export async function updateDeliveryDay(
  id: string, 
  data: { date?: string; active?: boolean; weekOffset?: number }
): Promise<boolean> {
  try {
    console.log('Updating delivery day:', { id, ...data });
    
    const response = await fetch('/api/weekly-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        day: id, // Use the day ID (sunday/tuesday) instead of MongoDB ID
        ...data
      }),
    });
    
    if (!response.ok) {
      console.error('API response not OK:', {
        status: response.status,
        statusText: response.statusText
      });
      
      // Try to parse error details
      try {
        const errorData = await response.json();
        console.error('API error details:', errorData);
        return false;
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        return false;
      }
    }
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error updating delivery day:', error);
    return false;
  }
}

// Add a new meal option to a delivery day
export async function addMealOption(
  day: string, 
  weekOffset: number, 
  mealData: { name: string; nameEn?: string; tags?: string[]; active?: boolean }
): Promise<any> {
  try {
    console.log('Adding meal option:', { day, weekOffset, ...mealData });
    
    const response = await fetch('/api/weekly-subscription/meal-options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        day,           // Use day (sunday/tuesday) instead of MongoDB ID
        weekOffset,    // Add weekOffset to identify the specific delivery day
        ...mealData
      }),
    });
    
    if (!response.ok) {
      console.error('API response not OK:', {
        status: response.status,
        statusText: response.statusText
      });
      
      // Try to parse error details
      try {
        const errorData = await response.json();
        console.error('API error details:', errorData);
        return null;
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        return null;
      }
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    }
    
    console.error('Failed to add meal option:', result.error);
    return null;
  } catch (error) {
    console.error('Error adding meal option:', error);
    return null;
  }
}

// Update a meal option
export async function updateMealOption(id: string, data: { name?: string; nameEn?: string; tags?: string[]; active?: boolean }): Promise<MealOption | null> {
  try {
    const response = await fetch(`/api/weekly-subscription/meal-options/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    }
    
    console.error('Failed to update meal option:', result.error);
    return null;
  } catch (error) {
    console.error('Error updating meal option:', error);
    return null;
  }
}

// Delete a meal option
export async function deleteMealOption(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/weekly-subscription/meal-options/${id}`, {
      method: 'DELETE',
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting meal option:', error);
    return false;
  }
}

// Get all delivery days and meal options for users
export async function getUserWeeklySubscription(): Promise<DeliveryDay[]> {
  try {
    const response = await fetch('/api/weekly-subscription/user', {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    
    console.error('Failed to fetch user subscription data');
    return [];
  } catch (error) {
    console.error('Error fetching user subscription data:', error);
    return [];
  }
}

// Submit user subscription
export async function submitUserSubscription(data: { 
  items: CartItem[], 
  userId: string,
  specialInstructions?: string,
  deliveryAddress?: any,
  phoneNumber?: string,
  area?: string,
  mealPlanType?: '6aweek' | '8aweek' | '10aweek' | '12aweek',
  deductVoucher?: boolean // Flag to indicate if this order should deduct a voucher
}): Promise<any> {
  try {
    console.log('Submitting subscription with user ID:', data.userId);
    
    // Note: Language preference is now fetched from user's database settings in the API
    const response = await fetch('/api/weekly-subscription/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        ...result.data,
        remainingCredits: result.remainingCredits
      };
    }
    
    console.error('Failed to submit subscription:', result.error);
    return { error: result.error, requiredCredits: result.requiredCredits, availableCredits: result.availableCredits };
  } catch (error) {
    console.error('Error submitting subscription:', error);
    return { error: 'An unexpected error occurred' };
  }
}

// Get user subscription history
export async function getUserSubscriptionHistory(): Promise<any[]> {
  try {
    const response = await fetch('/api/weekly-subscription/user/history');
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    
    console.error('Failed to fetch subscription history');
    return [];
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    return [];
  }
}

// ============================================
// NEW: Consecutive Date Validation Helpers
// ============================================

/**
 * Helper: Sort delivery days consistently (must match backend sorting)
 * Sorts by weekOffset first, then by day (sunday=0, tuesday=1)
 */
export function sortDeliveryDays(days: DeliveryDay[]): DeliveryDay[] {
  return [...days].sort((a, b) => {
    // First sort by weekOffset
    if (a.weekOffset !== b.weekOffset) {
      return a.weekOffset - b.weekOffset;
    }
    // Then sort by day (sunday=0, tuesday=1)
    const dayOrder: Record<string, number> = { 'sunday': 0, 'tuesday': 1 };
    const aDayOrder = dayOrder[a.id] || 0;
    const bDayOrder = dayOrder[b.id] || 0;
    return aDayOrder - bDayOrder;
  });
}

/**
 * Helper: Check if two dates are consecutive in the available days list
 * Two dates are consecutive if their indices in the sorted list differ by exactly 1
 */
export function areConsecutiveDates(
  date1: string,
  date2: string,
  availableDays: DeliveryDay[]
): boolean {
  // Sort days consistently
  const sortedDays = sortDeliveryDays(availableDays);
  
  // Find indices of both dates
  const index1 = sortedDays.findIndex(day => day.date === date1);
  const index2 = sortedDays.findIndex(day => day.date === date2);
  
  // Both must exist
  if (index1 === -1 || index2 === -1) {
    return false;
  }
  
  // Check if adjacent (absolute difference = 1)
  return Math.abs(index1 - index2) === 1;
}

/**
 * Helper: Get adjacent dates for a selected date
 * Returns array of dates that are immediately before or after the selected date
 */
export function getAdjacentDates(
  selectedDate: string,
  availableDays: DeliveryDay[]
): string[] {
  // Sort days consistently
  const sortedDays = sortDeliveryDays(availableDays);
  
  // Find index of selected date
  const selectedIndex = sortedDays.findIndex(day => day.date === selectedDate);
  
  if (selectedIndex === -1) {
    return [];
  }
  
  const adjacentDates: string[] = [];
  
  // Add previous date if exists
  if (selectedIndex > 0) {
    adjacentDates.push(sortedDays[selectedIndex - 1].date);
  }
  
  // Add next date if exists
  if (selectedIndex < sortedDays.length - 1) {
    adjacentDates.push(sortedDays[selectedIndex + 1].date);
  }
  
  return adjacentDates;
}

/**
 * Helper: Validate if a set of selected dates follows the consecutive rule
 * Returns validation result with error message if invalid
 */
export function validateSelectedDates(
  selectedDates: string[],
  availableDays: DeliveryDay[]
): { isValid: boolean; error?: string } {
  // Rule 1: 0 or 1 date is always valid
  if (selectedDates.length <= 1) {
    return { isValid: true };
  }
  
  // Rule 2: More than 2 dates is invalid
  if (selectedDates.length > 2) {
    return { 
      isValid: false, 
      error: 'Maximum 2 delivery dates allowed' 
    };
  }
  
  // Rule 3: Exactly 2 dates - must be consecutive
  if (selectedDates.length === 2) {
    const isConsecutive = areConsecutiveDates(selectedDates[0], selectedDates[1], availableDays);
    
    if (!isConsecutive) {
      return { 
        isValid: false, 
        error: 'Selected delivery dates must be consecutive' 
      };
    }
  }
  
  return { isValid: true };
}
