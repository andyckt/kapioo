import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface Meal {
  name: string;
  image: string;
  description: string;
  calories?: number;
  time?: string;
  tags?: string[];
  ingredients?: string[];
  allergens?: string[];
}

export type WeeklyMeals = {
  [key: string]: Meal
}

// Default weekly meals data
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

// Default available meals
const DEFAULT_AVAILABLE_MEALS: Meal[] = [
  {
    name: "Grilled Salmon with Vegetables",
    image: "/foodjpg/eiliv-aceron-w0JzqJZYX_E-unsplash.jpg",
    description: 
      "Fresh Atlantic salmon grilled to perfection. " + 
      "Served with seasonal roasted vegetables. " + 
      "Topped with a zesty lemon herb sauce.",
    tags: ["High Protein", "Low Carb"],
    ingredients: ["Fresh Atlantic salmon", "Seasonal vegetables", "Olive oil", "Lemon herb sauce", "Fresh herbs"],
    allergens: ["Fish"],
  },
  {
    name: "Chicken Alfredo Pasta",
    image: "/foodjpg/anh-nguyen-kcA-c3f_3FE-unsplash.jpg",
    description: 
      "Creamy Alfredo sauce made with fresh garlic and butter. " + 
      "Perfectly grilled chicken breast. " + 
      "Served over al dente fettuccine pasta. " + 
      "Topped with freshly grated Parmesan cheese.",
    tags: ["High Protein", "Italian"],
    ingredients: ["Grilled chicken breast", "Fettuccine pasta", "Cream", "Parmesan cheese", "Garlic", "Butter"],
    allergens: ["Dairy", "Gluten"],
  },
  {
    name: "Vegetable Curry with Naan",
    image: "/foodjpg/max-griss-otLqpb9LK70-unsplash.jpg",
    description: 
      "A flavorful blend of seasonal vegetables in a rich curry sauce. " + 
      "Infused with authentic Indian spices. " + 
      "Served with warm naan bread. " + 
      "Comes with a side of basmati rice.",
    tags: ["Vegetarian", "Spicy"],
    ingredients: ["Mixed vegetables", "Curry sauce", "Coconut milk", "Basmati rice", "Naan bread", "Indian spices"],
    allergens: ["Gluten"],
  },
  {
    name: "Beef Stir Fry with Rice",
    image: "/foodjpg/omkar-jadhav-o5XB6XwTb1I-unsplash.jpg",
    description: 
      "Tender strips of beef stir-fried with colorful vegetables. " + 
      "Tossed in our signature Asian-inspired sauce. " + 
      "Served with perfectly steamed jasmine rice.",
    tags: ["High Protein", "Asian"],
  },
  {
    name: "Mediterranean Bowl",
    image: "/foodjpg/charlesdeluvio-wrfO9SWykdE-unsplash.jpg",
    description: 
      "A delicious bowl with house-made falafel. " + 
      "Topped with creamy hummus and fresh tabbouleh. " + 
      "Includes a variety of colorful vegetables. " + 
      "Drizzled with tahini sauce.",
    tags: ["Vegetarian", "Mediterranean"],
    ingredients: ["Falafel", "Hummus", "Tabbouleh", "Fresh vegetables", "Tahini sauce", "Pita bread"],
    allergens: ["Sesame", "Gluten"],
  },
  {
    name: "Teriyaki Salmon",
    image: "/foodjpg/eiliv-aceron-w0JzqJZYX_E-unsplash.jpg",
    description: 
      "Salmon fillet glazed with our homemade teriyaki sauce. " + 
      "Caramelized to perfection for a sweet and savory flavor. " + 
      "Served with steamed white rice. " + 
      "Accompanied by stir-fried seasonal vegetables.",
    tags: ["High Protein", "Asian"],
    ingredients: ["Salmon fillet", "Teriyaki sauce", "Steamed rice", "Mixed vegetables", "Green onions", "Sesame seeds"],
    allergens: ["Fish", "Soy", "Sesame"],
  },
  {
    name: "Protein Power Bowl",
    image: "/foodjpg/kenny-eliason-SDprf7W3NUc-unsplash.jpg",
    description: 
      "Nutrient-dense bowl with protein-rich quinoa as the base. " + 
      "Topped with tender grilled chicken and creamy avocado. " + 
      "Features a colorful array of roasted vegetables. " + 
      "Finished with a drizzle of homemade tahini dressing. " + 
      "Garnished with crunchy toasted almonds.",
    tags: ["High Protein", "Low Carb"],
    ingredients: ["Quinoa", "Grilled chicken", "Avocado", "Roasted vegetables", "Tahini dressing", "Toasted almonds"],
    allergens: ["Nuts", "Sesame"],
  }
];

// Storage keys
const WEEKLY_MEALS_STORAGE_KEY = 'kapioo_weekly_meals';
const AVAILABLE_MEALS_STORAGE_KEY = 'kapioo_available_meals';

// Helper function to safely parse JSON from localStorage
function safeParseJSON<T>(jsonString: string | null, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return defaultValue;
  }
}

// Get weekly meals from localStorage or use defaults
export function getWeeklyMeals(): WeeklyMeals {
  if (typeof window === 'undefined') {
    return DEFAULT_WEEKLY_MEALS;
  }
  
  const storedMeals = localStorage.getItem(WEEKLY_MEALS_STORAGE_KEY);
  return safeParseJSON<WeeklyMeals>(storedMeals, DEFAULT_WEEKLY_MEALS);
}

// Get available meals from localStorage or use defaults
export function getAvailableMeals(): Meal[] {
  if (typeof window === 'undefined') {
    return DEFAULT_AVAILABLE_MEALS;
  }
  
  const storedMeals = localStorage.getItem(AVAILABLE_MEALS_STORAGE_KEY);
  return safeParseJSON<Meal[]>(storedMeals, DEFAULT_AVAILABLE_MEALS);
}

// Save weekly meals to localStorage
export function saveWeeklyMeals(meals: WeeklyMeals): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WEEKLY_MEALS_STORAGE_KEY, JSON.stringify(meals));
}

// Save available meals to localStorage
export function saveAvailableMeals(meals: Meal[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AVAILABLE_MEALS_STORAGE_KEY, JSON.stringify(meals));
}

// Update a specific day's meal
export function updateDayMeal(day: string, meal: Partial<Meal>): void {
  const currentMeals = getWeeklyMeals();
  
  currentMeals[day] = {
    ...currentMeals[day],
    ...meal
  };
  
  saveWeeklyMeals(currentMeals);
}

// Initialize meals storage with defaults if not present
export function initializeMealsStorage(): void {
  if (typeof window === 'undefined') return;
  
  if (!localStorage.getItem(WEEKLY_MEALS_STORAGE_KEY)) {
    saveWeeklyMeals(DEFAULT_WEEKLY_MEALS);
  }
  
  if (!localStorage.getItem(AVAILABLE_MEALS_STORAGE_KEY)) {
    saveAvailableMeals(DEFAULT_AVAILABLE_MEALS);
  }
}
