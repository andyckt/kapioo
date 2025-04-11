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

async function checkActiveStatus() {
  await connectToDatabase();
  
  try {
    // Query all weekly meals
    const weeklyMeals = await WeeklyMeal.find().lean();
    
    console.log('Weekly Meals in MongoDB:');
    weeklyMeals.forEach(meal => {
      console.log(`- ${meal.day}: active=${meal.active}, week=${meal.week}, year=${meal.year}, _id=${meal._id}`);
    });
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error querying MongoDB:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the function
checkActiveStatus(); 