require('dotenv').config();
const mongoose = require('mongoose');

async function connectToDatabase() {
  try {
    // Get the MongoDB URI from the environment variable
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Define the schemas
const WeeklyMealSchema = new mongoose.Schema({
  day: String,
  meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },
  active: Boolean,
  week: Number,
  year: Number,
  createdAt: Date,
  updatedAt: Date
});

const WeeklyMeal = mongoose.models.WeeklyMeal || mongoose.model('WeeklyMeal', WeeklyMealSchema);

async function checkDb() {
  await connectToDatabase();
  
  try {
    // Get all the weekly meal documents for Saturday
    const saturdayMeals = await WeeklyMeal.find({ day: 'saturday' }).lean();
    console.log('Saturday meals in the DB:');
    console.log(JSON.stringify(saturdayMeals, null, 2));
    
    // Manually update Saturday to inactive
    const updateResult = await WeeklyMeal.updateMany(
      { day: 'saturday' },
      { $set: { active: false } }
    );
    
    console.log('Update result:', updateResult);
    
    // Verify the update
    const afterUpdate = await WeeklyMeal.find({ day: 'saturday' }).lean();
    console.log('Saturday meals after update:');
    console.log(JSON.stringify(afterUpdate, null, 2));
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkDb(); 