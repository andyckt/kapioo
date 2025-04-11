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

// Check if the model is already defined to avoid duplicate model error
const WeeklyMeal = mongoose.models.WeeklyMeal || 
  mongoose.model('WeeklyMeal', WeeklyMealSchema);

async function fixWeeklyMeals() {
  await connectToDatabase();
  
  try {
    // Query all weekly meals
    const weeklyMeals = await WeeklyMeal.find().lean();
    
    console.log('Current Weekly Meals in MongoDB:');
    weeklyMeals.forEach(meal => {
      console.log(`- ${meal.day}: active=${meal.active}, week=${meal.week}, year=${meal.year}, _id=${meal._id}`);
    });
    
    // Update specific days for testing
    console.log('\nUpdating active status for testing...');
    
    // Monday to true, Tuesday to true, others to false
    const updates = [
      { day: 'monday', active: true },
      { day: 'tuesday', active: true },
      { day: 'wednesday', active: false },
      { day: 'thursday', active: false },
      { day: 'friday', active: false },
      { day: 'saturday', active: false },
      { day: 'sunday', active: false }
    ];
    
    for (const update of updates) {
      const result = await WeeklyMeal.updateOne(
        { day: update.day },
        { $set: { active: update.active } }
      );
      
      console.log(`Updated ${update.day} to active=${update.active} - matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    }
    
    // Query all weekly meals again to verify
    const updatedMeals = await WeeklyMeal.find().lean();
    
    console.log('\nUpdated Weekly Meals in MongoDB:');
    updatedMeals.forEach(meal => {
      console.log(`- ${meal.day}: active=${meal.active}, week=${meal.week}, year=${meal.year}, _id=${meal._id}`);
    });
    
    // Close the connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    
    console.log('\nTesting instructions:');
    console.log('1. Restart your Next.js server');
    console.log('2. Check the admin API endpoint again');
    console.log('3. Verify that Monday and Tuesday show as active=true');
  } catch (error) {
    console.error('Error fixing weekly meals:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the function
fixWeeklyMeals(); 