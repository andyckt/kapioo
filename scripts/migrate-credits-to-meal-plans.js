// Migration script to convert existing users' credits to the new meal plan fields
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Define User schema (simplified version for migration)
const UserSchema = new mongoose.Schema({
  userID: String,
  name: String,
  email: String,
  credits: Number,
  weeklySIXmeals: { type: Number, default: 0 },
  weeklyEIGHTmeals: { type: Number, default: 0 },
  weeklyTENmeals: { type: Number, default: 0 },
  weeklyTWELVEmeals: { type: Number, default: 0 }
});

// Create User model (will use the existing 'users' collection)
const User = mongoose.model('User', UserSchema);

async function migrateCreditsToMealPlans() {
  try {
    await connectToDatabase();
    
    // Find all users with credits > 0
    const users = await User.find({ credits: { $gt: 0 } });
    
    console.log(`Found ${users.length} users with credits to migrate`);
    
    let migratedCount = 0;
    
    for (const user of users) {
      console.log(`Processing user ${user.userID} (${user.email}): ${user.credits} credits`);
      
      // For simplicity, convert all existing credits to 10aweek plans
      // You might want a more sophisticated strategy based on your business logic
      user.weeklyTENmeals = (user.weeklyTENmeals || 0) + user.credits;
      
      // Keep the credits field for reference but mark it as migrated in a comment
      // We're not setting it to 0 to maintain backward compatibility during transition
      
      await user.save();
      
      console.log(`Migrated user ${user.userID}: ${user.credits} credits -> ${user.weeklyTENmeals} 10aweek plans`);
      migratedCount++;
    }
    
    console.log(`Migration completed successfully. Migrated ${migratedCount} users.`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
migrateCreditsToMealPlans();
