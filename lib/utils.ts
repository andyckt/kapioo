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
}

export type WeeklyMeals = {
  [key: string]: Meal
}

export function getWeeklyMeals(): WeeklyMeals {
  return {
    monday: {
      name: "Grilled Salmon with Vegetables",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Fresh Atlantic salmon grilled to perfection, served with seasonal roasted vegetables and a lemon herb sauce.",
      calories: 450,
      time: "30 min",
      tags: ["High Protein", "Omega-3", "Gluten-Free"],
    },
    tuesday: {
      name: "Beef Stir Fry with Rice",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Tender strips of beef stir-fried with colorful bell peppers, broccoli, and carrots in a savory sauce, served over steamed jasmine rice.",
      calories: 520,
      time: "25 min",
      tags: ["High Protein", "Quick", "Family Favorite"],
    },
    wednesday: {
      name: "Chicken Alfredo Pasta",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Creamy Alfredo sauce with grilled chicken breast, served over al dente fettuccine pasta and topped with freshly grated Parmesan cheese.",
      calories: 580,
      time: "35 min",
      tags: ["Comfort Food", "Italian", "Creamy"],
    },
    thursday: {
      name: "Vegetable Curry with Naan",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "A flavorful blend of seasonal vegetables in a rich curry sauce, served with warm naan bread and basmati rice.",
      calories: 420,
      time: "40 min",
      tags: ["Vegetarian", "Spicy", "Indian"],
    },
    friday: {
      name: "Grilled Chicken with Quinoa",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Herb-marinated grilled chicken breast served with fluffy quinoa, roasted vegetables, and a light lemon herb sauce. A protein-packed, nutritious meal.",
      calories: 480,
      time: "30 min",
      tags: ["High Protein", "Healthy", "Gluten-Free"],
    },
    saturday: {
      name: "Shrimp Tacos with Avocado",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Seasoned shrimp served in soft corn tortillas with fresh avocado, cabbage slaw, and a zesty lime crema. Served with a side of black beans.",
      calories: 510,
      time: "25 min",
      tags: ["Seafood", "Mexican", "Fresh"],
    },
    sunday: {
      name: "Mushroom Risotto",
      image: "/placeholder.svg?height=200&width=200",
      description:
        "Creamy Arborio rice slowly cooked with a medley of mushrooms, shallots, white wine, and Parmesan cheese. Finished with fresh herbs and truffle oil.",
      calories: 540,
      time: "45 min",
      tags: ["Vegetarian", "Italian", "Creamy"],
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
    },
    {
      name: "Chicken Alfredo Pasta",
      image: "/placeholder.svg?height=60&width=60",
      description: "Creamy Alfredo sauce with grilled chicken breast, served over al dente fettuccine pasta and topped with freshly grated Parmesan cheese.",
      tags: ["High Protein", "Italian"],
    },
    {
      name: "Vegetable Curry with Naan",
      image: "/placeholder.svg?height=60&width=60",
      description: "A flavorful blend of seasonal vegetables in a rich curry sauce, served with warm naan bread and basmati rice.",
      tags: ["Vegetarian", "Spicy"],
    },
    {
      name: "Beef Stir Fry with Rice",
      image: "/placeholder.svg?height=60&width=60",
      description: "Tender strips of beef stir-fried with colorful bell peppers, broccoli, and carrots in a savory sauce, served over steamed jasmine rice.",
      tags: ["High Protein", "Asian"],
    },
    {
      name: "Mediterranean Bowl",
      image: "/placeholder.svg?height=60&width=60",
      description: "A delicious bowl with falafel, hummus, tabbouleh, and fresh vegetables.",
      tags: ["Vegetarian", "Mediterranean"],
    },
    {
      name: "Teriyaki Salmon",
      image: "/placeholder.svg?height=60&width=60",
      description: "Salmon glazed with teriyaki sauce, served with steamed rice and vegetables.",
      tags: ["High Protein", "Asian"],
    },
    {
      name: "Protein Power Bowl",
      image: "/placeholder.svg?height=60&width=60",
      description: "Quinoa, grilled chicken, avocado, and roasted vegetables in a nutritionally balanced bowl.",
      tags: ["High Protein", "Low Carb"],
    }
  ];
}
