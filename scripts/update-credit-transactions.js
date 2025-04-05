/**
 * Migration script to update transaction descriptions from "Added Credit" to "Added Credits"
 * 
 * Run this script with: 
 * node scripts/update-credit-transactions.js
 */

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function updateTransactionDescriptions() {
  // Use the MongoDB connection string from environment variables
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('Error: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB successfully');

    // Get the database name from the connection string
    const dbName = uri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    const transactionsCollection = db.collection('transactions');

    // Find all transactions with description "Added Credit"
    const query = { description: 'Added Credit' };
    const count = await transactionsCollection.countDocuments(query);
    
    console.log(`Found ${count} transactions with description "Added Credit"`);
    
    if (count > 0) {
      // Update all matching transactions
      const result = await transactionsCollection.updateMany(
        query,
        { $set: { description: 'Added Credits' } }
      );
      
      console.log(`Successfully updated ${result.modifiedCount} transaction records`);
    } else {
      console.log('No transactions need to be updated');
    }

  } catch (error) {
    console.error('Error updating transaction descriptions:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update function
updateTransactionDescriptions(); 