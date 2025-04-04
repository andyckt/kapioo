// Script to add nicknames to all users
const mongoose = require('mongoose');

// Use the Atlas connection string directly
const MONGODB_URI = "mongodb+srv://kamtocheung1104:N7H0LQ9L2bq5qQbo@kapiofood.otsn8px.mongodb.net/kapioo?retryWrites=true&w=majority&appName=kapiofood";

// Create simplified user schema for this operation
const userSchema = new mongoose.Schema({
  userID: String,
  email: String,
  name: String,
  nickname: String
}, { timestamps: true });

// Create model
const User = mongoose.model('User', userSchema);

// User nicknames mapping
const userNicknames = {
  'user123': 'Johnny',
  'user456': 'Jane',
  'user789': 'Bob',
  'user101': 'Al',
  'user202': 'Chuck',
  'admin': 'Admin'
};

async function updateUserNicknames() {
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
    
    // Update each user's nickname
    for (const user of users) {
      console.log(`Current user: ${user.userID} (${user.name || 'Unknown'})`);
      console.log(`  Existing nickname: ${user.nickname || 'Not set'}`);
      
      // Get the nickname for this user
      const newNickname = userNicknames[user.userID];
      
      if (!newNickname) {
        console.log(`  No nickname data found for ${user.userID}, skipping`);
        continue;
      }
      
      // Update nickname field
      user.nickname = newNickname;
      await user.save();
      updatedCount++;
      
      console.log(`  Updated nickname for ${user.userID} to: ${newNickname}`);
    }
    
    console.log(`Updated nicknames for ${updatedCount} user(s)`);
    
  } catch (error) {
    console.error('Error updating user nicknames:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update function
updateUserNicknames(); 