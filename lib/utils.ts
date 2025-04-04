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
      image: "/placeholder.svg?height=200&width=200",
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
      image: "/placeholder.svg?height=200&width=200",
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
      image: "/placeholder.svg?height=200&width=200",
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
      image: "/placeholder.svg?height=200&width=200",
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
      image: "/placeholder.svg?height=200&width=200",
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
      image: "/placeholder.svg?height=200&width=200",
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
}

export function getAvailableMeals(): Meal[] {
  return [
    {
      name: "Grilled Salmon with Vegetables",
      image: "/placeholder.svg?height=60&width=60",
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
      image: "/placeholder.svg?height=60&width=60",
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
      image: "/placeholder.svg?height=60&width=60",
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
      image: "/placeholder.svg?height=60&width=60",
      description: 
        "Tender strips of beef stir-fried with colorful vegetables. " + 
        "Tossed in our signature Asian-inspired sauce. " + 
        "Served with perfectly steamed jasmine rice.",
      tags: ["High Protein", "Asian"],
    },
    {
      name: "Mediterranean Bowl",
      image: "/placeholder.svg?height=60&width=60",
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
      image: "/placeholder.svg?height=60&width=60",
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
      image: "/placeholder.svg?height=60&width=60",
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
}
