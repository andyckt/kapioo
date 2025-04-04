// Direct script to seed MongoDB Atlas database
const mongoose = require('mongoose');

// Use the Atlas connection string directly
const MONGODB_URI = "mongodb+srv://kamtocheung1104:N7H0LQ9L2bq5qQbo@kapiofood.otsn8px.mongodb.net/kapioo?retryWrites=true&w=majority&appName=kapiofood";

// Initial seed data for meals
const initialMeals = [
  {
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
    day: "monday"
  },
  {
    name: "Beef Stir Fry with Rice",
    image: "/foodjpg/omkar-jadhav-o5XB6XwTb1I-unsplash.jpg",
    description:
      "Tender strips of beef stir-fried with colorful bell peppers, broccoli, and carrots. " + 
      "Coated in our signature savory sauce. " + 
      "Served over steamed jasmine rice.",
    calories: 520,
    time: "25 min",
    tags: ["High Protein", "Quick", "Family Favorite"],
    day: "tuesday"
  },
  {
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
    day: "wednesday"
  },
  {
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
    day: "thursday"
  },
  {
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
    day: "friday"
  },
  {
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
    day: "saturday"
  },
  {
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
    day: "sunday"
  }
];

// Helper function to get current week and year
function getCurrentWeekYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in a week
  const week = Math.floor(diff / oneWeek) + 1;
  return { week, year: now.getFullYear() };
}

// Define Mongoose schemas directly in this file
const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  calories: { type: Number },
  time: { type: String },
  tags: [{ type: String }],
  ingredients: [{ type: String }],
  allergens: [{ type: String }],
  day: { type: String }
}, { timestamps: true });

const weeklyMealSchema = new mongoose.Schema({
  day: { 
    type: String, 
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  meal: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Meal', 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  week: { type: Number, required: true },
  year: { type: Number, required: true },
}, { timestamps: true });

// Create models
const Meal = mongoose.model('Meal', mealSchema);
const WeeklyMeal = mongoose.model('WeeklyMeal', weeklyMealSchema);

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas successfully!');
    
    // Check if meals already exist
    const existingMealsCount = await Meal.countDocuments();
    if (existingMealsCount > 0) {
      console.log(`Database already has ${existingMealsCount} meals. Skipping meal seeding.`);
    } else {
      console.log('Seeding meals...');
      const createdMeals = await Meal.insertMany(initialMeals);
      console.log(`Created ${createdMeals.length} meals`);
      
      // Create weekly meal assignments for default meals with day property
      const { week, year } = getCurrentWeekYear();
      
      console.log('Setting up weekly meal assignments...');
      const weeklyMeals = [];
      
      for (const meal of createdMeals) {
        if (meal.day) {
          weeklyMeals.push({
            day: meal.day,
            meal: meal._id,
            active: true,
            week,
            year
          });
        }
      }
      
      if (weeklyMeals.length > 0) {
        await WeeklyMeal.insertMany(weeklyMeals);
        console.log(`Created ${weeklyMeals.length} weekly meal assignments`);
      }
    }
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the seed function
seedDatabase(); 