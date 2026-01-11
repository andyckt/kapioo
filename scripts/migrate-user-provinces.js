// Script to migrate user province/area values to match new dropdown options
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

// The new valid area options
const validAreas = [
  "Downtown Toronto", 
  "Midtown", 
  "North York", 
  "Markham", 
  "Richmond Hill", 
  "Vaughan", 
  "Mississauga", 
  "Oakville", 
  "Aurora", 
  "Newmarket"
];

// Mapping of common variations to standardized values
// This will need to be updated based on actual data found in the database
const areaMapping = {
  // Case variations
  "downtown": "Downtown Toronto",
  "DOWNTOWN": "Downtown Toronto",
  "Downtown": "Downtown Toronto",
  "downtown toronto": "Downtown Toronto",
  "Downtown Toronto": "Downtown Toronto",
  "DOWNTOWN TORONTO": "Downtown Toronto",
  "midtown": "Midtown",
  "MIDTOWN": "Midtown",
  "northyork": "North York",
  "NORTHYORK": "North York",
  "NorthYork": "North York",
  "north york": "North York",
  "North York": "North York",
  "NORTH YORK": "North York",
  "markham": "Markham",
  "MARKHAM": "Markham",
  "richmond hill": "Richmond Hill",
  "Richmond hill": "Richmond Hill",
  "Richmond Hill": "Richmond Hill",
  "RichmondHill": "Richmond Hill",
  "RICHMOND HILL": "Richmond Hill",
  "vaughan": "Vaughan",
  "VAUGHAN": "Vaughan",
  "mississauga": "Mississauga",
  "MISSISSAUGA": "Mississauga",
  "oakville": "Oakville",
  "OAKVILLE": "Oakville",
  "aurora": "Aurora",
  "AURORA": "Aurora",
  "newmarket": "Newmarket",
  "NEWMARKET": "Newmarket",
  
  // Add more mappings as needed based on what you find in the database
};

// Default area to use if no mapping is found
const DEFAULT_AREA = "Downtown";

async function migrateUserProvinces(dryRun = true) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all users with addresses
    const users = await User.find({ "address.province": { $exists: true } });
    
    if (!users || users.length === 0) {
      console.log('No users with province found');
      return;
    }
    
    console.log(`Found ${users.length} users with province values`);
    
    let updatedCount = 0;
    let alreadyValidCount = 0;
    let unmappableCount = 0;
    
    // Process each user
    for (const user of users) {
      if (!user.address || !user.address.province) continue;
      
      const currentProvince = user.address.province;
      
      // Check if the current province is already a valid area
      if (validAreas.includes(currentProvince)) {
        console.log(`User ${user.userID} (${user.name}) already has valid area: ${currentProvince}`);
        alreadyValidCount++;
        continue;
      }
      
      // Try to map the province to a valid area
      let newArea = areaMapping[currentProvince];
      
      if (!newArea) {
        // If no direct mapping, try to find the closest match
        console.log(`No direct mapping for "${currentProvince}" for user ${user.userID} (${user.name})`);
        
        // For now, we'll use the default area
        newArea = DEFAULT_AREA;
        unmappableCount++;
      }
      
      console.log(`User ${user.userID} (${user.name}): "${currentProvince}" -> "${newArea}"`);
      
      // Update the user's province if not a dry run
      if (!dryRun) {
        user.address.province = newArea;
        await user.save();
        console.log(`  Updated successfully`);
      }
      
      updatedCount++;
    }
    
    // Display summary
    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Already valid: ${alreadyValidCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Unmappable (using default): ${unmappableCount}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'LIVE RUN (changes saved)'}`);
    
  } catch (error) {
    console.error('Error migrating user provinces:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// By default, run in dry-run mode (no changes made)
// To make actual changes, call with false: migrateUserProvinces(false)
migrateUserProvinces();
