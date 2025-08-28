import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the document
export interface ICreditPurchaseRequest extends Document {
  requestId: string;
  userId: mongoose.Types.ObjectId;
  amount: number; // Amount transferred via e-Transfer
  imageProof: string; // URL to the uploaded proof image
  status: 'pending' | 'approved' | 'declined';
  requestedCredits?: number; // Credits requested by the user (legacy field)
  approvedCredits?: number; // Credits approved by admin (may differ from requested)
  notes?: string; // Additional notes from user or admin
  adminNotes?: string; // Notes from admin (for internal use)
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  declinedAt?: Date;
}

// Interface for the model with static methods
export interface ICreditPurchaseRequestModel extends Model<ICreditPurchaseRequest> {
  generateRequestId(): Promise<string>;
}

// Define CreditPurchaseRequest schema
const CreditPurchaseRequestSchema = new Schema<ICreditPurchaseRequest>({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  imageProof: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending',
    required: true
  },
  requestedCredits: {
    type: Number,
    required: false
  },
  approvedCredits: {
    type: Number
  },
  notes: {
    type: String
  },
  adminNotes: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  declinedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Function to generate the next requestId
async function generateRequestId() {
  const prefix = 'CR-REQ-';
  const baseNumber = 1000;
  
  // Use the CreditPurchaseRequest model directly
  const CreditPurchaseRequest = mongoose.models.CreditPurchaseRequest;
  
  // Find the highest existing request ID
  const highestRequest = await CreditPurchaseRequest.findOne(
    { requestId: new RegExp(`^${prefix}\\d+$`) },
    { requestId: 1 },
    { sort: { requestId: -1 } }
  );
  
  if (!highestRequest) {
    // If no requests exist, start with base number
    return `${prefix}${baseNumber}`;
  }
  
  // Extract the number from the highest request ID
  const currentNumber = parseInt(highestRequest.requestId.replace(prefix, ''), 10);
  
  // Return the next number in sequence
  return `${prefix}${currentNumber + 1}`;
}

// Add the static method
CreditPurchaseRequestSchema.static('generateRequestId', generateRequestId);

// Create or get the model with proper typing
let CreditPurchaseRequest: ICreditPurchaseRequestModel;

try {
  // Try to get the existing model
  CreditPurchaseRequest = mongoose.model<ICreditPurchaseRequest, ICreditPurchaseRequestModel>('CreditPurchaseRequest');
} catch {
  // Create the model if it doesn't exist
  CreditPurchaseRequest = mongoose.model<ICreditPurchaseRequest, ICreditPurchaseRequestModel>('CreditPurchaseRequest', CreditPurchaseRequestSchema);
}

// Ensure the static method is attached to the model
if (!CreditPurchaseRequest.generateRequestId) {
  CreditPurchaseRequest.generateRequestId = generateRequestId;
}

export default CreditPurchaseRequest;
