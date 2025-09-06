// Script to ensure all users have "Active" status
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// Use environment variable for MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

// Create a simplified user schema for this operation
const userSchema = new mongoose.Schema({
  userID: String,
  email: String,
  status: String
}, { timestamps: true });

// Create model
const User = mongoose.model('User', userSchema);

async function updateAllUserStatus() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');
    
    // Find all users
    const users = await User.find({});
    
    if (!users || users.length === 0) {
      console.log('No users found');
      return;
    }
    
    console.log(`Found ${users.length} users`);
    
    // Track updated users
    let updatedCount = 0;
    
    // Check each user's status and update if needed
    for (const user of users) {
      console.log(`User: ${user.userID} (${user.email}) - Current status: ${user.status}`);
      
      if (user.status !== 'Active') {
        // Update status to Active
        user.status = 'Active';
        await user.save();
        updatedCount++;
        console.log(`  Updated ${user.userID}'s status to Active`);
      }
    }
    
    console.log(`Updated ${updatedCount} user(s) to Active status`);
    console.log('All users are now Active');
    
  } catch (error) {
    console.error('Error updating user status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update function
updateAllUserStatus();