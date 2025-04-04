// Script to update all users with complete address fields
const mongoose = require('mongoose');

// Use the Atlas connection string directly
const MONGODB_URI = "mongodb+srv://kamtocheung1104:N7H0LQ9L2bq5qQbo@kapiofood.otsn8px.mongodb.net/kapioo?retryWrites=true&w=majority&appName=kapiofood";

// Create schemas for this operation
const addressSchema = new mongoose.Schema({
  unitNumber: String,
  streetAddress: String,
  city: String,
  postalCode: String,
  province: String,
  country: String,
  buzzCode: String
});

const userSchema = new mongoose.Schema({
  userID: String,
  email: String,
  address: addressSchema
}, { timestamps: true });

// Create model
const User = mongoose.model('User', userSchema);

// Updated address information for each user
const userAddresses = {
  'user123': {
    unitNumber: '101',
    streetAddress: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    province: 'NY',
    country: 'USA',
    buzzCode: '1234#'
  },
  'user456': {
    unitNumber: '202',
    streetAddress: '456 Oak Ave',
    city: 'San Francisco',
    postalCode: '94107',
    province: 'CA',
    country: 'USA',
    buzzCode: '5678#'
  },
  'user789': {
    unitNumber: '303',
    streetAddress: '789 Pine Rd',
    city: 'Chicago',
    postalCode: '60601',
    province: 'IL',
    country: 'USA',
    buzzCode: '9012#'
  },
  'user101': {
    unitNumber: '404',
    streetAddress: '101 Maple Dr',
    city: 'Austin',
    postalCode: '78701',
    province: 'TX',
    country: 'USA',
    buzzCode: '3456#'
  },
  'user202': {
    unitNumber: '505',
    streetAddress: '202 Cedar Ln',
    city: 'Seattle',
    postalCode: '98101',
    province: 'WA',
    country: 'USA',
    buzzCode: '7890#'
  },
  'admin': {
    unitNumber: 'ADMIN',
    streetAddress: 'Admin HQ',
    city: 'San Francisco',
    postalCode: '94107',
    province: 'CA',
    country: 'USA',
    buzzCode: 'ADMIN#'
  }
};

async function updateUserAddresses() {
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
    
    // Update each user's address
    for (const user of users) {
      console.log(`Updating address for user: ${user.userID} (${user.email})`);
      
      // Get the new address data for this user
      const newAddress = userAddresses[user.userID];
      
      if (!newAddress) {
        console.log(`  No address data found for ${user.userID}, skipping`);
        continue;
      }
      
      // Update address fields
      user.address = newAddress;
      await user.save();
      updatedCount++;
      
      console.log(`  Updated address for ${user.userID}`);
      console.log(`  New address: ${newAddress.unitNumber}, ${newAddress.streetAddress}, ${newAddress.city}, ${newAddress.postalCode}, ${newAddress.province}, ${newAddress.country}, Buzz: ${newAddress.buzzCode}`);
    }
    
    console.log(`Updated addresses for ${updatedCount} user(s)`);
    
  } catch (error) {
    console.error('Error updating user addresses:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update function
updateUserAddresses(); 