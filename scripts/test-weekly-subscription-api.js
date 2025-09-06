// Test the weekly subscription API
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable not set');
  process.exit(1);
}

// Connect to MongoDB using Mongoose
async function testApi() {
  try {
    // Connect with Mongoose
    await mongoose.connect(uri);
    console.log('Connected to MongoDB with Mongoose');
    
    // Define the schemas and models similar to our application
    const WeeklyMealOptionSchema = new mongoose.Schema({
      name: { type: String, required: true },
      tags: { type: [String], default: [] },
      active: { type: Boolean, default: true },
    }, { timestamps: true });
    
    const WeeklyDeliveryDaySchema = new mongoose.Schema({
      day: { 
        type: String, 
        required: true,
        enum: ['sunday', 'tuesday'],
      },
      name: { type: String, required: true },
      date: { type: String, required: true },
      active: { type: Boolean, default: true },
      options: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyMealOption' }],
      weekOffset: { type: Number, required: true, enum: [0, 1] },
    }, { timestamps: true });
    
    // Create models with explicit collection names
    const WeeklyMealOption = mongoose.model('WeeklyMealOption', WeeklyMealOptionSchema, 'weeklymealOptions');
    const WeeklyDeliveryDay = mongoose.model('WeeklyDeliveryDay', WeeklyDeliveryDaySchema, 'weeklydeliverydays');
    
    console.log('\nModel information:');
    console.log('WeeklyMealOption:', {
      modelName: WeeklyMealOption.modelName,
      collectionName: WeeklyMealOption.collection.name,
    });
    console.log('WeeklyDeliveryDay:', {
      modelName: WeeklyDeliveryDay.modelName,
      collectionName: WeeklyDeliveryDay.collection.name,
    });
    
    // Query the data
    console.log('\nQuerying meal options:');
    const mealOptions = await WeeklyMealOption.find().lean();
    console.log(`Found ${mealOptions.length} meal options`);
    
    console.log('\nQuerying delivery days:');
    const deliveryDays = await WeeklyDeliveryDay.find().lean();
    console.log(`Found ${deliveryDays.length} delivery days`);
    
    // Test populating options
    console.log('\nTesting populate:');
    const populatedDays = await WeeklyDeliveryDay.find()
      .populate('options')
      .lean();
    
    console.log(`Found ${populatedDays.length} delivery days with populated options`);
    
    // Check if options are properly populated
    if (populatedDays.length > 0) {
      const firstDay = populatedDays[0];
      console.log(`\nFirst delivery day: ${firstDay.name} (${firstDay.date})`);
      console.log(`Has ${firstDay.options.length} meal options`);
      
      if (firstDay.options.length > 0) {
        const firstOption = firstDay.options[0];
        console.log('First meal option:', {
          id: firstOption._id,
          name: firstOption.name,
          tags: firstOption.tags,
          active: firstOption.active
        });
      } else {
        console.log('No meal options found for this delivery day');
      }
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB connection closed');
  }
}

testApi().catch(console.error);
