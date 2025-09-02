// Script to add voucher fields to existing users
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Define User model for this script
const UserSchema = new mongoose.Schema({
  // We don't need to define all fields, just the ones we're working with
  userID: String,
  name: String,
  email: String,
  twoDishVoucher: { type: Number, default: 0 },
  threeDishVoucher: { type: Number, default: 0 },
  weeklySIXmeals: { type: Number, default: 0 },
  weeklyTENmeals: { type: Number, default: 0 }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function updateUsers() {
  try {
    console.log('Starting migration to add voucher fields to existing users...');
    
    // Find all users that don't have at least one of the voucher fields
    const usersToUpdate = await User.find({
      $or: [
        { twoDishVoucher: { $exists: false } },
        { threeDishVoucher: { $exists: false } },
        { weeklySIXmeals: { $exists: false } },
        { weeklyTENmeals: { $exists: false } }
      ]
    });
    
    console.log(`Found ${usersToUpdate.length} users that need updating`);
    
    if (usersToUpdate.length === 0) {
      console.log('No users need updating. All users already have the voucher fields.');
      process.exit(0);
    }
    
    // Update each user
    let updatedCount = 0;
    for (const user of usersToUpdate) {
      const updateFields = {};
      
      // Only set fields that don't exist
      if (!user.twoDishVoucher && user.twoDishVoucher !== 0) {
        updateFields.twoDishVoucher = 0;
      }
      
      if (!user.threeDishVoucher && user.threeDishVoucher !== 0) {
        updateFields.threeDishVoucher = 0;
      }
      
      if (!user.weeklySIXmeals && user.weeklySIXmeals !== 0) {
        updateFields.weeklySIXmeals = 0;
      }
      
      if (!user.weeklyTENmeals && user.weeklyTENmeals !== 0) {
        updateFields.weeklyTENmeals = 0;
      }
      
      // Only update if there are fields to update
      if (Object.keys(updateFields).length > 0) {
        await User.updateOne({ _id: user._id }, { $set: updateFields });
        updatedCount++;
        
        // Log progress every 10 users
        if (updatedCount % 10 === 0) {
          console.log(`Updated ${updatedCount} users so far...`);
        }
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} users with voucher fields.`);
    
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the update function
updateUsers();
