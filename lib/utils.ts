import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Meal = {
  _id?: string;
  name: string;
  image: string;
  description?: string;
  calories?: number;
  time?: string;
  tags?: string[];
  ingredients?: string[];
  allergens?: string[];
  day?: string;
  date?: string;
  active?: boolean;
}

export type WeeklyMeals = {
  [key: string]: Meal
}

// Default weekly meals data for fallback
const DEFAULT_WEEKLY_MEALS: WeeklyMeals = {
  monday: {
    name: "Grilled Salmon with Vegetables",
    image: "/foodjpg/eiliv-aceron-w0JzqJZYX_E-unsplash.jpg",
    description:
      "Fresh Atlantic salmon grilled to perfection. " + 
      "Served with seasonal roasted vegetables. " + 
      "Topped with a zesty lemon herb sauce. " + 
      "Rich in omega-3 fatty acids for heart health. " + 
      "Under 500 calories per serving.",
    calories: 450,
    time: "30 min",
    tags: ["High Protein", "Omega-3", "Gluten-Free"],
    ingredients: ["Fresh Atlantic salmon", "Seasonal vegetables", "Olive oil", "Lemon herb sauce", "Fresh herbs"],
    allergens: ["Fish"],
  },
  tuesday: {
    name: "Beef Stir Fry with Rice",
    image: "/foodjpg/omkar-jadhav-o5XB6XwTb1I-unsplash.jpg",
    description:
      "Tender strips of beef stir-fried with colorful bell peppers, broccoli, and carrots. " + 
      "Coated in our signature savory sauce. " + 
      "Served over steamed jasmine rice.",
    calories: 520,
    time: "25 min",
    tags: ["High Protein", "Quick", "Family Favorite"],
  },
  wednesday: {
    name: "Chicken Alfredo Pasta",
    image: "/foodjpg/anh-nguyen-kcA-c3f_3FE-unsplash.jpg",
    description:
      "Creamy Alfredo sauce made with fresh garlic and butter. " + 
      "Perfectly grilled chicken breast sliced and placed on top. " + 
      "Served over al dente fettuccine pasta. " + 
      "Topped with freshly grated Parmesan cheese. " + 
      "A classic Italian comfort dish.",
    calories: 580,
    time: "35 min",
    tags: ["Comfort Food", "Italian", "Creamy"],
    ingredients: ["Grilled chicken breast", "Fettuccine pasta", "Cream", "Parmesan cheese", "Garlic", "Butter"],
    allergens: ["Dairy", "Gluten"],
  },
  thursday: {
    name: "Vegetable Curry with Naan",
    image: "/foodjpg/max-griss-otLqpb9LK70-unsplash.jpg",
    description:
      "A flavorful blend of seasonal vegetables in a rich curry sauce. " + 
      "Infused with authentic Indian spices and coconut milk. " + 
      "Served with warm, freshly baked naan bread. " + 
      "Comes with a side of aromatic basmati rice.",
    calories: 420,
    time: "40 min",
    tags: ["Vegetarian", "Spicy", "Indian"],
    ingredients: ["Mixed vegetables", "Curry sauce", "Coconut milk", "Basmati rice", "Naan bread", "Indian spices"],
    allergens: ["Gluten"],
  },
  friday: {
    name: "Grilled Chicken with Quinoa",
    image: "/foodjpg/charlesdeluvio-wrfO9SWykdE-unsplash.jpg",
    description:
      "Herb-marinated grilled chicken breast cooked to juicy perfection. " + 
      "Served with fluffy protein-rich quinoa. " + 
      "Accompanied by a colorful mix of roasted vegetables. " + 
      "Drizzled with a light lemon herb sauce. " + 
      "A protein-packed, nutritious meal at just 480 calories.",
    calories: 480,
    time: "30 min",
    tags: ["High Protein", "Healthy", "Gluten-Free"],
    ingredients: ["Herb-marinated chicken", "Quinoa", "Roasted vegetables", "Lemon herb sauce", "Fresh herbs"],
    allergens: [],
  },
  saturday: {
    name: "Shrimp Tacos with Avocado",
    image: "/foodjpg/kenny-eliason-SDprf7W3NUc-unsplash.jpg",
    description:
      "Seasoned shrimp cooked to perfection. " + 
      "Served in soft corn tortillas. " + 
      "Topped with fresh avocado and tangy cabbage slaw. " + 
      "Finished with a zesty lime crema. " + 
      "Comes with a side of black beans.",
    calories: 510,
    time: "25 min",
    tags: ["Seafood", "Mexican", "Fresh"],
    ingredients: ["Seasoned shrimp", "Corn tortillas", "Avocado", "Cabbage slaw", "Lime crema", "Black beans"],
    allergens: ["Shellfish", "Dairy"],
  },
  sunday: {
    name: "Mushroom Risotto",
    image: "/foodjpg/haryo-setyadi-yvzzemH8-J0-unsplash.jpg",
    description:
      "Creamy Arborio rice slowly cooked to perfection. " + 
      "Made with a medley of wild and cultivated mushrooms. " + 
      "Enhanced with shallots and a splash of white wine. " + 
      "Finished with Parmesan cheese and truffle oil. " + 
      "Garnished with fresh herbs.",
    calories: 540,
    time: "45 min",
    tags: ["Vegetarian", "Italian", "Creamy"],
    ingredients: ["Arborio rice", "Mixed mushrooms", "Shallots", "White wine", "Parmesan cheese", "Truffle oil"],
    allergens: ["Dairy", "Alcohol"],
  },
};

// Get weekly meals from the API
export async function getWeeklyMeals(): Promise<WeeklyMeals> {
  try {
    // Add a timestamp parameter to prevent caching
    const timestamp = new Date().getTime();
    console.log(`[getWeeklyMeals] Fetching meals with cache-buster: ${timestamp}`);
    
    const response = await fetch(`/api/weekly-meals?_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    const result = await response.json();
    
    console.log('[getWeeklyMeals] API Response:', { 
      success: result.success,
      dataKeys: result.data ? Object.keys(result.data) : null
    });
    
    if (result.success && result.data) {
      // Log which days are included in the response
      const days = Object.keys(result.data);
      console.log(`[getWeeklyMeals] Days returned from API: [${days.join(', ')}]`);
      
      // Check each day for active property
      for (const day in result.data) {
        console.log(`[getWeeklyMeals] Day ${day} active status:`, result.data[day].active);
      }
      
      return result.data as WeeklyMeals;
    }
    
    console.error('Failed to fetch weekly meals from API');
    // Fall back to default meals
    return DEFAULT_WEEKLY_MEALS;
  } catch (error) {
    console.error('Error fetching weekly meals:', error);
    // Fall back to default meals on error
    return DEFAULT_WEEKLY_MEALS;
  }
}

// Get all weekly meals for admin (including inactive days)
export async function getAdminWeeklyMeals(): Promise<WeeklyMeals> {
  try {
    // Add a timestamp parameter to prevent caching
    const timestamp = new Date().getTime();
    console.log(`[getAdminWeeklyMeals] Fetching admin meals with cache-buster: ${timestamp}`);
    
    const response = await fetch(`/api/weekly-meals/admin?_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    const result = await response.json();
    
    console.log('[getAdminWeeklyMeals] API Response:', result);
    
    if (result.success && result.data) {
      // Check if the response has the new structure with 'meals' property
      const mealsData = result.data.meals || result.data;
      
      // Log the week/year if available in the response
      if (result.data.week && result.data.year) {
        console.log(`[getAdminWeeklyMeals] Week/Year from API: ${result.data.week}/${result.data.year}`);
      }
      
      // Log which days are included in the response and their active status
      console.log('[getAdminWeeklyMeals] Days and active status:');
      for (const day in mealsData) {
        console.log(`  - ${day}: active=${mealsData[day].active}`);
      }
      
      return mealsData as WeeklyMeals;
    }
    
    console.error('Failed to fetch admin weekly meals from API');
    // Fall back to default meals
    return DEFAULT_WEEKLY_MEALS;
  } catch (error) {
    console.error('Error fetching admin weekly meals:', error);
    // Fall back to default meals on error
    return DEFAULT_WEEKLY_MEALS;
  }
}

// Get all available meals from the API
export async function getAvailableMeals(): Promise<Meal[]> {
  try {
    const response = await fetch('/api/meals');
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as Meal[];
    }
    
    console.error('Failed to fetch available meals from API');
    return []; // Return empty array if API fails
  } catch (error) {
    console.error('Error fetching available meals:', error);
    return []; // Return empty array on error
  }
}

// Get a specific meal by ID
export async function getMealById(id: string): Promise<Meal | null> {
  try {
    const response = await fetch(`/api/meals/${id}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as Meal;
    }
    
    console.error('Failed to fetch meal by ID');
    return null;
  } catch (error) {
    console.error(`Error fetching meal ${id}:`, error);
    return null;
  }
}

// Create a new meal
export async function createMeal(mealData: Omit<Meal, '_id'>): Promise<Meal | null> {
  try {
    const response = await fetch('/api/meals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mealData),
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as Meal;
    }
    
    console.error('Failed to create meal:', result.error);
    return null;
  } catch (error) {
    console.error('Error creating meal:', error);
    return null;
  }
}

// Update an existing meal
export async function updateMeal(id: string, mealData: Partial<Meal>): Promise<Meal | null> {
  try {
    const response = await fetch(`/api/meals/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mealData),
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as Meal;
    }
    
    console.error('Failed to update meal:', result.error);
    return null;
  } catch (error) {
    console.error(`Error updating meal ${id}:`, error);
    return null;
  }
}

// Delete a meal
export async function deleteMeal(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/meals/${id}`, {
      method: 'DELETE',
    });
    
    const result = await response.json();
    
    return result.success;
  } catch (error) {
    console.error(`Error deleting meal ${id}:`, error);
    return false;
  }
}

// Assign a meal to a day of the week
export async function assignMealToDay(day: string, mealId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/weekly-meals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ day, mealId }),
    });
    
    const result = await response.json();
    
    return result.success;
  } catch (error) {
    console.error(`Error assigning meal to ${day}:`, error);
    return false;
  }
}

// Set a day as active or inactive
export async function setDayActiveStatus(day: string, active: boolean): Promise<boolean> {
  try {
    console.log(`[setDayActiveStatus] Setting ${day} to active=${active}`);
    
    const response = await fetch('/api/weekly-meals/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({ day, active }),
    });
    
    // Log the response status before parsing
    console.log(`[setDayActiveStatus] Response status: ${response.status} ${response.statusText}`);
    
    // If response is not ok, throw an error
    if (!response.ok) {
      console.error(`[setDayActiveStatus] HTTP error: ${response.status} ${response.statusText}`);
      // Try to parse error response
      try {
        const errorData = await response.json();
        console.error(`[setDayActiveStatus] Error details:`, errorData);
        return false;
      } catch (parseError) {
        console.error(`[setDayActiveStatus] Could not parse error response: ${parseError}`);
        return false;
      }
    }
    
    const result = await response.json();
    console.log(`[setDayActiveStatus] API response:`, result);
    
    if (result.success) {
      console.log(`[setDayActiveStatus] Successfully set ${day} to active=${active}`);
    } else {
      console.error(`[setDayActiveStatus] Failed to set ${day} to active=${active}: ${result.error}`);
    }
    
    return result.success;
  } catch (error) {
    console.error(`[setDayActiveStatus] Error setting ${day} active status:`, error);
    return false;
  }
}

// User interface type
export interface User {
  _id: string;
  userID: string;
  name: string;
  nickname?: string;
  email: string;
  credits: number;
  joined: Date | string;
  status: string;
  address?: {
    unitNumber?: string;
    streetAddress: string;
    city: string;
    postalCode: string;
    province: string;
    country: string;
    buzzCode?: string;
  };
  phone?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  isActive?: boolean;
  totalOrders?: number;
}

// Get all users with pagination
export async function getUsers(page = 1, limit = 10): Promise<{ users: User[], pagination: any }> {
  try {
    const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      return { 
        users: result.data,
        pagination: result.pagination 
      };
    }
    
    console.error('Failed to fetch users from API');
    return { users: [], pagination: { total: 0, page, limit, pages: 0 } };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { users: [], pagination: { total: 0, page, limit, pages: 0 } };
  }
}

// Get a user by ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as User;
    }
    
    console.error('Failed to fetch user by ID');
    return null;
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    return null;
  }
}

// Create a new user
export async function createUser(userData: Omit<User, '_id'>): Promise<User | null> {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as User;
    }
    
    console.error('Failed to create user');
    return null;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

// Update a user
export async function updateUser(id: string, userData: Partial<User>): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as User;
    }
    
    console.error('Failed to update user');
    return null;
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    return null;
  }
}

// Delete a user
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    
    const result = await response.json();
    
    if (result.success) {
      return true;
    }
    
    console.error('Failed to delete user');
    return false;
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    return false;
  }
}

// Add credits to a user
export async function addCreditsToUser(id: string, credits: number): Promise<User | null> {
  try {
    const user = await getUserById(id);
    if (!user) return null;
    
    const newCredits = user.credits + credits;
    return updateUser(id, { credits: newCredits });
  } catch (error) {
    console.error(`Error adding credits to user ${id}:`, error);
    return null;
  }
}
