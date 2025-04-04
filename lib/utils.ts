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

export function getWeeklyMeals(): WeeklyMeals {
  return {
    monday: {
      name: "Grilled Salmon with Vegetables123",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Fresh Atlantic salmon grilled to perfection, served with seasonal roasted vegetables and a lemon herb sauce.",
      calories: 450,
      time: "30 min",
      tags: ["High Protein", "Omega-3", "Gluten-Free"],
      ingredients: ["Fresh Atlantic salmon", "Seasonal vegetables", "Olive oil", "Lemon herb sauce", "Fresh herbs"],
      allergens: ["Fish"],
    },
    tuesday: {
      name: "Beef Stir Fry with Rice",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Tender strips of beef stir-fried with colorful bell peppers, broccoli, and carrots in a savory sauce, served over steamed jasmine rice.",
      calories: 520,
      time: "25 min",
      tags: ["High Protein", "Quick", "Family Favorite"],
      ingredients: ["Beef strips", "Bell peppers", "Broccoli", "Carrots", "Savory sauce", "Jasmine rice"],
      allergens: ["Soy", "Gluten"],
    },
    wednesday: {
      name: "Chicken Alfredo Pasta",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Creamy Alfredo sauce with grilled chicken breast, served over al dente fettuccine pasta and topped with freshly grated Parmesan cheese.",
      calories: 580,
      time: "35 min",
      tags: ["Comfort Food", "Italian", "Creamy"],
      ingredients: ["Grilled chicken breast", "Fettuccine pasta", "Cream", "Parmesan cheese", "Garlic", "Butter"],
      allergens: ["Dairy", "Gluten"],
    },
    thursday: {
      name: "Vegetable Curry with Naan",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "A flavorful blend of seasonal vegetables in a rich curry sauce, served with warm naan bread and basmati rice.",
      calories: 420,
      time: "40 min",
      tags: ["Vegetarian", "Spicy", "Indian"],
      ingredients: ["Mixed vegetables", "Curry sauce", "Coconut milk", "Basmati rice", "Naan bread", "Indian spices"],
      allergens: ["Gluten"],
    },
    friday: {
      name: "Grilled Chicken with Quinoa",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Herb-marinated grilled chicken breast served with fluffy quinoa, roasted vegetables, and a light lemon herb sauce. A protein-packed, nutritious meal.",
      calories: 480,
      time: "30 min",
      tags: ["High Protein", "Healthy", "Gluten-Free"],
      ingredients: ["Herb-marinated chicken", "Quinoa", "Roasted vegetables", "Lemon herb sauce", "Fresh herbs"],
      allergens: [],
    },
    saturday: {
      name: "Shrimp Tacos with Avocado",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Seasoned shrimp served in soft corn tortillas with fresh avocado, cabbage slaw, and a zesty lime crema. Served with a side of black beans.",
      calories: 510,
      time: "25 min",
      tags: ["Seafood", "Mexican", "Fresh"],
      ingredients: ["Seasoned shrimp", "Corn tortillas", "Avocado", "Cabbage slaw", "Lime crema", "Black beans"],
      allergens: ["Shellfish", "Dairy"],
    },
    sunday: {
      name: "Mushroom Risotto",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Creamy Arborio rice slowly cooked with a medley of mushrooms, shallots, white wine, and Parmesan cheese. Finished with fresh herbs and truffle oil.",
      calories: 540,
      time: "45 min",
      tags: ["Vegetarian", "Italian", "Creamy"],
      ingredients: ["Arborio rice", "Mixed mushrooms", "Shallots", "White wine", "Parmesan cheese", "Truffle oil"],
      allergens: ["Dairy", "Alcohol"],
    },
  };
}

export function getAvailableMeals(): Meal[] {
  return [
    {
      name: "Grilled Salmon with Vegetables",
      image: "/placeholder.svg?height=60&width=60",
      description: "Fresh Atlantic salmon grilled to perfection, served with seasonal roasted vegetables and a lemon herb sauce.",
      tags: ["High Protein", "Low Carb"],
      ingredients: ["Fresh Atlantic salmon", "Seasonal vegetables", "Olive oil", "Lemon herb sauce", "Fresh herbs"],
      allergens: ["Fish"],
    },
    {
      name: "Chicken Alfredo Pasta",
      image: "/placeholder.svg?height=60&width=60",
      description: "Creamy Alfredo sauce with grilled chicken breast, served over al dente fettuccine pasta and topped with freshly grated Parmesan cheese.",
      tags: ["High Protein", "Italian"],
      ingredients: ["Grilled chicken breast", "Fettuccine pasta", "Cream", "Parmesan cheese", "Garlic", "Butter"],
      allergens: ["Dairy", "Gluten"],
    },
    {
      name: "Vegetable Curry with Naan",
      image: "/placeholder.svg?height=60&width=60",
      description: "A flavorful blend of seasonal vegetables in a rich curry sauce, served with warm naan bread and basmati rice.",
      tags: ["Vegetarian", "Spicy"],
      ingredients: ["Mixed vegetables", "Curry sauce", "Coconut milk", "Basmati rice", "Naan bread", "Indian spices"],
      allergens: ["Gluten"],
    },
    {
      name: "Beef Stir Fry with Rice",
      image: "/placeholder.svg?height=60&width=60",
      description: "Tender strips of beef stir-fried with colorful bell peppers, broccoli, and carrots in a savory sauce, served over steamed jasmine rice.",
      tags: ["High Protein", "Asian"],
      ingredients: ["Beef strips", "Bell peppers", "Broccoli", "Carrots", "Savory sauce", "Jasmine rice"],
      allergens: ["Soy", "Gluten"],
    },
    {
      name: "Mediterranean Bowl",
      image: "/placeholder.svg?height=60&width=60",
      description: "A delicious bowl with falafel, hummus, tabbouleh, and fresh vegetables.",
      tags: ["Vegetarian", "Mediterranean"],
      ingredients: ["Falafel", "Hummus", "Tabbouleh", "Fresh vegetables", "Tahini sauce", "Pita bread"],
      allergens: ["Sesame", "Gluten"],
    },
    {
      name: "Teriyaki Salmon",
      image: "/placeholder.svg?height=60&width=60",
      description: "Salmon glazed with teriyaki sauce, served with steamed rice and vegetables.",
      tags: ["High Protein", "Asian"],
      ingredients: ["Salmon fillet", "Teriyaki sauce", "Steamed rice", "Mixed vegetables", "Green onions", "Sesame seeds"],
      allergens: ["Fish", "Soy", "Sesame"],
    },
    {
      name: "Protein Power Bowl",
      image: "/placeholder.svg?height=60&width=60",
      description: "Quinoa, grilled chicken, avocado, and roasted vegetables in a nutritionally balanced bowl.",
      tags: ["High Protein", "Low Carb"],
      ingredients: ["Quinoa", "Grilled chicken", "Avocado", "Roasted vegetables", "Tahini dressing", "Toasted almonds"],
      allergens: ["Nuts", "Sesame"],
    }
  ];
}
