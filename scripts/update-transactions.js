// Script to update existing transactions in MongoDB
// Adds transaction IDs and converts "credit" type to "Add"

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local file
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from ${envLocalPath}`);
  dotenv.config({ path: envLocalPath });
} else {
  console.log('No .env.local file found, checking for .env');
  dotenv.config();
}

// MongoDB connection string from .env.local file
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable in .env.local file');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Define Schema for Transaction
const TransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Add', 'credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create model
const Transaction = mongoose.model('Transaction', TransactionSchema);

async function updateTransactions() {
  try {
    // Get all transactions
    const transactions = await Transaction.find({}).sort({ createdAt: 1 });
    console.log(`Found ${transactions.length} transactions to update`);

    // Track the next ID numbers for each type
    let nextAddId = 1001;
    let nextDebitId = 2001;

    // Update each transaction
    for (const transaction of transactions) {
      // Skip if already has a transactionId
      if (transaction.transactionId) {
        console.log(`Transaction ${transaction._id} already has ID: ${transaction.transactionId}`);
        
        // Update counters based on existing IDs
        if (transaction.transactionId.startsWith('Add-')) {
          const idNum = parseInt(transaction.transactionId.replace('Add-', ''));
          if (idNum >= nextAddId) nextAddId = idNum + 1;
        }
        if (transaction.transactionId.startsWith('Dbt-')) {
          const idNum = parseInt(transaction.transactionId.replace('Dbt-', ''));
          if (idNum >= nextDebitId) nextDebitId = idNum + 1;
        }
        
        continue;
      }

      // Generate transaction ID based on type
      let transactionId;
      let newType = transaction.type;

      if (transaction.type === 'credit') {
        transactionId = `Add-${nextAddId++}`;
        newType = 'Add';
      } else {
        transactionId = `Dbt-${nextDebitId++}`;
      }

      // Update the transaction
      await Transaction.updateOne(
        { _id: transaction._id },
        { 
          $set: { 
            transactionId: transactionId,
            type: newType
          } 
        }
      );

      console.log(`Updated transaction ${transaction._id}: added ID ${transactionId}, type: ${newType}`);
    }

    console.log('Transaction update completed');
  } catch (error) {
    console.error('Error updating transactions:', error);
  } finally {
    // Close MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the update function
updateTransactions(); 