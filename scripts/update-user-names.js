// Script to add names to all users
const mongoose = require('mongoose');

// Use the Atlas connection string directly
const MONGODB_URI = "mongodb+srv://kamtocheung1104:N7H0LQ9L2bq5qQbo@kapiofood.otsn8px.mongodb.net/kapioo?retryWrites=true&w=majority&appName=kapiofood";

// Create simplified user schema for this operation
const userSchema = new mongoose.Schema({
  userID: String,
  email: String,
  name: String
}, { timestamps: true });

// Create model
const User = mongoose.model('User', userSchema);

// User names mapping
const userNames = {
  'user123': 'John Doe',
  'user456': 'Jane Smith',
  'user789': 'Bob Johnson',
  'user101': 'Alice Brown',
  'user202': 'Charlie Davis',
  'admin': 'Admin User'
};

async function updateUserNames() {
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
    
    // Update each user's name
    for (const user of users) {
      console.log(`Current user: ${user.userID} (${user.email})`);
      console.log(`  Existing name: ${user.name || 'Not set'}`);
      
      // Get the name for this user
      const newName = userNames[user.userID];
      
      if (!newName) {
        console.log(`  No name data found for ${user.userID}, skipping`);
        continue;
      }
      
      // Update name field
      user.name = newName;
      await user.save();
      updatedCount++;
      
      console.log(`  Updated name for ${user.userID} to: ${newName}`);
    }
    
    console.log(`Updated names for ${updatedCount} user(s)`);
    
  } catch (error) {
    console.error('Error updating user names:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update function
updateUserNames(); 