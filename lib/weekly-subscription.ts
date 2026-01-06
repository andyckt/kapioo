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
    
    // Get user's language preference from localStorage
    const language = localStorage.getItem('language') || 'zh';
    
    const response = await fetch('/api/weekly-subscription/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, language }), // Include language preference
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
