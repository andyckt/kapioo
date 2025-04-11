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

// Check if the models are already defined to avoid duplicate model error
const Meal = mongoose.models.Meal || mongoose.model('Meal', MealSchema);
const WeeklyMeal = mongoose.models.WeeklyMeal || mongoose.model('WeeklyMeal', WeeklyMealSchema);

// Helper function to get current week and year
function getCurrentWeekYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in a week
  const week = Math.floor(diff / oneWeek) + 1;
  return { week, year: now.getFullYear() };
}

// This function simulates the behavior of the admin API route
async function simulateAdminAPIFetch(customWeek = null, customYear = null) {
  try {
    // Use provided week/year or get current
    let { week, year } = getCurrentWeekYear();
    if (customWeek) week = customWeek;
    if (customYear) year = customYear;
    
    console.log(`Simulating admin API fetch for week=${week}, year=${year}`);
    
    // Get all weekly meals (including inactive ones)
    const weeklyMeals = await WeeklyMeal.find({ 
      week,
      year
    }).populate('meal').lean();
    
    console.log(`Found ${weeklyMeals.length} meals (including inactive)`);
    
    if (weeklyMeals.length === 0) {
      return {};
    }
    
    // Format the response to match the existing data structure
    const formattedMeals = {};
    
    weeklyMeals.forEach((weeklyMeal) => {
      // Skip entries without meal data
      if (!weeklyMeal.meal) {
        console.log(`Skipping ${weeklyMeal.day} - no meal data`);
        return;
      }
      
      // Check the raw active value in the database
      console.log(`WeeklyMeal for ${weeklyMeal.day}:`, {
        _id: weeklyMeal._id,
        day: weeklyMeal.day,
        active: weeklyMeal.active,
        week: weeklyMeal.week,
        year: weeklyMeal.year
      });
      
      const mealObj = weeklyMeal.meal;
      // This is where the issue might be happening
      mealObj.active = weeklyMeal.active;
      
      formattedMeals[weeklyMeal.day] = mealObj;
    });
    
    return formattedMeals;
  } catch (error) {
    console.error('Error simulating API fetch:', error);
    return {};
  }
}

// Simulate the update week/year functionality
async function simulateUpdateWeekYear(newWeek, newYear) {
  try {
    console.log(`Simulating update to week=${newWeek}, year=${newYear}`);
    
    // Update all meals with the new week and year
    const updateResult = await WeeklyMeal.updateMany(
      {}, // Update all documents
      { $set: { week: newWeek, year: newYear } }
    );
    
    console.log(`Update result:`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });
    
    return updateResult.modifiedCount > 0;
  } catch (error) {
    console.error('Error simulating update:', error);
    return false;
  }
}

// This function tests if the week/year change affects active status
async function testWeekYearActiveStatus() {
  await connectToDatabase();
  
  try {
    // 1. First get current state
    console.log('\n--- CURRENT MEALS STATE ---');
    const { week: currentWeek, year: currentYear } = getCurrentWeekYear();
    console.log(`Current week/year from function: ${currentWeek}/${currentYear}`);
    
    // Check what week/year is actually in the database
    const currentMeals = await WeeklyMeal.find().lean();
    console.log('Database state:');
    currentMeals.forEach(meal => {
      console.log(`- ${meal.day}: active=${meal.active}, week=${meal.week}, year=${meal.year}, _id=${meal._id}`);
    });
    
    // Get the week/year from the database instead of the function
    const dbWeek = currentMeals[0]?.week || currentWeek;
    const dbYear = currentMeals[0]?.year || currentYear;
    console.log(`Using database week/year: ${dbWeek}/${dbYear}`);
    
    // 2. Test API response with current week/year from db
    console.log('\n--- API RESPONSE WITH CURRENT WEEK/YEAR FROM DB ---');
    const currentApiResponse = await simulateAdminAPIFetch(dbWeek, dbYear);
    
    console.log('\nFormatted response days and active status:');
    Object.entries(currentApiResponse).forEach(([day, meal]) => {
      console.log(`  - ${day}: active=${meal.active}`);
    });
    
    // 3. Try to update the week/year
    console.log('\n--- UPDATING WEEK/YEAR ---');
    const testWeek = dbWeek + 1;  // Use next week for testing
    const testYear = dbYear;
    
    const updateSuccess = await simulateUpdateWeekYear(testWeek, testYear);
    console.log(`Update success: ${updateSuccess}`);
    
    // 4. Verify the database state after update
    console.log('\n--- DATABASE STATE AFTER UPDATE ---');
    const updatedMeals = await WeeklyMeal.find().lean();
    updatedMeals.forEach(meal => {
      console.log(`- ${meal.day}: active=${meal.active}, week=${meal.week}, year=${meal.year}, _id=${meal._id}`);
    });
    
    // 5. Check API response with new week/year
    console.log('\n--- API RESPONSE WITH NEW WEEK/YEAR ---');
    const newApiResponse = await simulateAdminAPIFetch(testWeek, testYear);
    
    console.log('\nFormatted response days and active status:');
    Object.entries(newApiResponse).forEach(([day, meal]) => {
      console.log(`  - ${day}: active=${meal.active}`);
    });
    
    // 6. Check if old week/year API response would be different
    console.log('\n--- API RESPONSE WITH OLD WEEK/YEAR ---');
    const oldApiResponse = await simulateAdminAPIFetch(dbWeek, dbYear);
    
    console.log('\nFormatted response days and active status:');
    Object.entries(oldApiResponse).forEach(([day, meal]) => {
      console.log(`  - ${day}: active=${meal.active}`);
    });
    
    // 7. Restore original week/year
    console.log('\n--- RESTORING ORIGINAL WEEK/YEAR ---');
    await simulateUpdateWeekYear(dbWeek, dbYear);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  } catch (error) {
    console.error('Error testing week/year active status:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the test
testWeekYearActiveStatus(); 