// Script to check all users' province/area values
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

// Define the User schema (simplified version of what's in your models)
const UserSchema = new mongoose.Schema({
  userID: String,
  name: String,
  email: String,
  address: {
    unitNumber: String,
    streetAddress: String,
    city: String,
    province: String,
    postalCode: String,
    country: String,
    buzzCode: String
  }
});

const User = mongoose.model('User', UserSchema);

async function checkUserProvinces() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({});
    
    if (!users || users.length === 0) {
      console.log('No users found');
      return;
    }
    
    console.log(`Found ${users.length} users`);
    
    // Create a map to count occurrences of each province value
    const provinceMap = {};
    const usersWithProvince = [];
    const usersWithoutProvince = [];
    
    // Process each user
    for (const user of users) {
      if (user.address && user.address.province) {
        const province = user.address.province;
        
        // Count occurrences
        provinceMap[province] = (provinceMap[province] || 0) + 1;
        
        // Add to users with province
        usersWithProvince.push({
          userID: user.userID,
          name: user.name,
          email: user.email,
          province: province
        });
      } else {
        // Add to users without province
        usersWithoutProvince.push({
          userID: user.userID,
          name: user.name,
          email: user.email
        });
      }
    }
    
    // Display results
    console.log('\n=== PROVINCE DISTRIBUTION ===');
    for (const [province, count] of Object.entries(provinceMap).sort((a, b) => b[1] - a[1])) {
      console.log(`${province}: ${count} users`);
    }
    
    console.log(`\n=== USERS WITH PROVINCE (${usersWithProvince.length}) ===`);
    usersWithProvince.forEach(user => {
      console.log(`${user.userID} (${user.name}): ${user.province}`);
    });
    
    console.log(`\n=== USERS WITHOUT PROVINCE (${usersWithoutProvince.length}) ===`);
    usersWithoutProvince.forEach(user => {
      console.log(`${user.userID} (${user.name})`);
    });
    
  } catch (error) {
    console.error('Error checking user provinces:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
checkUserProvinces();
