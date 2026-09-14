import mongoose, { Schema, Document, Model } from 'mongoose';
import { allocateSequentialId } from '@/lib/ids/atomic-sequence';

// Interface for the document
export interface ITransaction extends Document {
  transactionId: string;
  userId: mongoose.Types.ObjectId;
  type: 'Add' | 'debit' | 'Deduct' | 'refund';
  amount: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for the model with static methods
export interface ITransactionModel extends Model<ITransaction> {
  generateTransactionId(type: 'Add' | 'debit' | 'Deduct' | 'refund'): Promise<string>;
}

// Define Transaction schema
const TransactionSchema = new Schema<ITransaction>({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Add', 'debit', 'Deduct', 'refund'],
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

// Function to generate the next transactionId
async function generateTransactionId(type: 'Add' | 'debit' | 'Deduct' | 'refund') {
  const prefix = type === 'Add' ? 'CR-' : 
                type === 'debit' ? 'DB-' : 
                type === 'Deduct' ? 'DD-' :
                type === 'refund' ? 'RF-' : 'TX-';
  const baseNumber = type === 'Add' ? 1000 : 
                    type === 'Deduct' ? 2000 : 3000;
  return allocateSequentialId(
    `transaction-${type}`,
    prefix,
    baseNumber,
    mongoose.models.Transaction
  );
}

// Add the static method
TransactionSchema.static('generateTransactionId', generateTransactionId);

// Create or get the model with proper typing
let Transaction: ITransactionModel;

try {
  // Try to get the existing model
  Transaction = mongoose.model<ITransaction, ITransactionModel>('Transaction');
} catch {
  // Create the model if it doesn't exist
  Transaction = mongoose.model<ITransaction, ITransactionModel>('Transaction', TransactionSchema);
}

// Ensure the static method is attached to the model
if (!Transaction.generateTransactionId) {
  Transaction.generateTransactionId = generateTransactionId;
}

export default Transaction;
