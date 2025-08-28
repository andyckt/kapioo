require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Log the environment variables
console.log('Environment variables:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set (hidden)' : 'Not set');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'Not set');

// Define the models directory path
const modelsDir = path.join(__dirname, '..', 'models');

// List all model files
console.log('\nModel files in models directory:');
try {
  const files = fs.readdirSync(modelsDir);
  files.forEach(file => {
    console.log(`- ${file}`);
  });
} catch (err) {
  console.error('Error reading models directory:', err);
}

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully!');
    
    // Check if CreditPurchaseRequest model exists
    const models = mongoose.modelNames();
    console.log('\nAvailable models:', models);
    
    if (models.includes('CreditPurchaseRequest')) {
      console.log('\nCreditPurchaseRequest model exists');
      
      // Import the model
      const CreditPurchaseRequest = require('../models/CreditPurchaseRequest').default;
      
      // Check the schema
      console.log('\nCreditPurchaseRequest schema:');
      const schema = CreditPurchaseRequest.schema.paths;
      Object.keys(schema).forEach(key => {
        const isRequired = schema[key].isRequired || false;
        console.log(`- ${key}: ${schema[key].instance} (required: ${isRequired})`);
      });
      
      // Check if generateRequestId method exists
      console.log('\nChecking generateRequestId method:');
      if (typeof CreditPurchaseRequest.generateRequestId === 'function') {
        console.log('generateRequestId method exists');
        
        try {
          const requestId = await CreditPurchaseRequest.generateRequestId();
          console.log('Generated request ID:', requestId);
        } catch (error) {
          console.error('Error generating request ID:', error);
        }
      } else {
        console.error('generateRequestId method does not exist');
      }
    } else {
      console.error('CreditPurchaseRequest model does not exist');
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
connectToDatabase().catch(console.error);
