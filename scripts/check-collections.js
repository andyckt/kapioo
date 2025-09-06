// Check MongoDB collections
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable not set');
  process.exit(1);
}

// Database name
const DB_NAME = process.env.MONGODB_DB || 'kapioo';

async function checkCollections() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Check for our specific collections
    console.log('\nChecking for weekly subscription collections:');
    
    // Check if weeklymealOptions collection exists
    const hasMealOptions = collections.some(c => c.name === 'weeklymealOptions');
    console.log(`weeklymealOptions collection exists: ${hasMealOptions}`);
    
    // Check if weeklydeliverydays collection exists
    const hasDeliveryDays = collections.some(c => c.name === 'weeklydeliverydays');
    console.log(`weeklydeliverydays collection exists: ${hasDeliveryDays}`);
    
    // Check if weeklydeliverydays collection exists (with capital D)
    const hasDeliveryDaysCapital = collections.some(c => c.name === 'weeklyDeliverydays');
    console.log(`weeklyDeliverydays collection exists: ${hasDeliveryDaysCapital}`);
    
    // Count documents in each collection
    if (hasMealOptions) {
      const count = await db.collection('weeklymealOptions').countDocuments();
      console.log(`Documents in weeklymealOptions: ${count}`);
      
      if (count > 0) {
        const sample = await db.collection('weeklymealOptions').findOne();
        console.log('\nSample meal option:');
        console.log(JSON.stringify(sample, null, 2));
      }
    }
    
    if (hasDeliveryDays) {
      const count = await db.collection('weeklydeliverydays').countDocuments();
      console.log(`Documents in weeklydeliverydays: ${count}`);
      
      if (count > 0) {
        const sample = await db.collection('weeklydeliverydays').findOne();
        console.log('\nSample delivery day:');
        console.log(JSON.stringify(sample, null, 2));
      }
    }
    
    if (hasDeliveryDaysCapital) {
      const count = await db.collection('weeklyDeliverydays').countDocuments();
      console.log(`Documents in weeklyDeliverydays: ${count}`);
    }
    
  } catch (error) {
    console.error('Error checking collections:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

checkCollections().catch(console.error);