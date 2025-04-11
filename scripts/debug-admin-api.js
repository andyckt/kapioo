const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from .env file
const MONGODB_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Create a schema matching our WeeklyMeal model
const WeeklyMealSchema = new mongoose.Schema({
  day: String,
  meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },
  active: Boolean,
  week: Number,
  year: Number,
  createdAt: Date,
  updatedAt: Date
});

// Create a schema matching our Meal model
const MealSchema = new mongoose.Schema({
  name: String,
  image: String,
  description: String,
  calories: Number,
  time: String,
  tags: [String],
  ingredients: [String],
  allergens: [String],
  day: String,
  date: String,
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
});

// Check if the models are already defined to avoid duplicate model error
const WeeklyMeal = mongoose.models.WeeklyMeal || 
  mongoose.model('WeeklyMeal', WeeklyMealSchema);
const Meal = mongoose.models.Meal ||
  mongoose.model('Meal', MealSchema);

async function debugAdminAPI() {
  await connectToDatabase();
  
  try {
    console.log('\n--- SIMULATING ADMIN API LOGIC ---');
    
    // 1. Find all weekly meals - this should match what the API does
    const week = 16;
    const year = 2025;
    
    // Get all weekly meals (including inactive ones)
    const weeklyMeals = await WeeklyMeal.find({ 
      week,
      year
    }).populate('meal').sort({ day: 1 });
    
    console.log(`Found ${weeklyMeals.length} meals (including inactive)`);
    
    // Format the response to match the existing data structure
    const formattedMeals = {};
    
    weeklyMeals.forEach((weeklyMeal) => {
      // Log the raw weekly meal document to see what it contains
      console.log(`\nRaw WeeklyMeal for ${weeklyMeal.day}:`, {
        _id: weeklyMeal._id,
        day: weeklyMeal.day,
        active: weeklyMeal.active, // This value from the database
        week: weeklyMeal.week,
        year: weeklyMeal.year,
        meal: typeof weeklyMeal.meal === 'object' ? weeklyMeal.meal._id : weeklyMeal.meal
      });
      
      // Important: Explicitly add the active property to the meal object
      const mealObj = weeklyMeal.meal.toObject ? weeklyMeal.meal.toObject() : weeklyMeal.meal;
      
      // Check if the meal object already has 'active' property
      console.log(`  - Meal object before adding active:`, {
        _id: mealObj._id,
        name: mealObj.name,
        hasActiveProperty: 'active' in mealObj,
        activeValue: mealObj.active
      });
      
      // Ensure we explicitly set the active status from the weekly meal record
      mealObj.active = weeklyMeal.active;
      
      console.log(`  - Meal object after adding active:`, {
        _id: mealObj._id,
        name: mealObj.name,
        hasActiveProperty: 'active' in mealObj,
        activeValue: mealObj.active
      });
      
      formattedMeals[weeklyMeal.day] = mealObj;
    });
    
    // Print final formatted meals
    console.log('\n--- FINAL API RESPONSE WOULD BE ---');
    for (const day in formattedMeals) {
      console.log(`  - ${day}: active=${formattedMeals[day].active}`);
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  } catch (error) {
    console.error('Error debugging admin API:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the function
debugAdminAPI(); 