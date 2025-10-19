import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the document
export interface IVoucherPurchaseRequest extends Document {
  requestId: string;
  userId: mongoose.Types.ObjectId;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  amount: number; // Final amount transferred via e-Transfer (including tax)
  originalPrice?: number; // Original price before tax
  taxRate?: number; // Tax rate (e.g., 0.13 for 13%)
  imageProof: string; // URL to the uploaded proof image
  status: 'pending' | 'approved' | 'declined';
  notes?: string; // Additional notes from user
  adminNotes?: string; // Notes from admin (for internal use)
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  declinedAt?: Date;
}

// Interface for the model with static methods
export interface IVoucherPurchaseRequestModel extends Model<IVoucherPurchaseRequest> {
  generateRequestId(): Promise<string>;
}

// Define VoucherPurchaseRequest schema
const VoucherPurchaseRequestSchema = new Schema<IVoucherPurchaseRequest>({
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
  type: {
    type: String,
    enum: ['twoDish', 'threeDish'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  originalPrice: {
    type: Number
  },
  taxRate: {
    type: Number
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
  const prefix = 'VPR-';
  const baseNumber = 1000;
  
  // Use the VoucherPurchaseRequest model directly
  const VoucherPurchaseRequest = mongoose.models.VoucherPurchaseRequest;
  
  // Find the highest existing request ID
  const highestRequest = await VoucherPurchaseRequest.findOne(
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
VoucherPurchaseRequestSchema.static('generateRequestId', generateRequestId);

// Create or get the model with proper typing
let VoucherPurchaseRequest: IVoucherPurchaseRequestModel;

try {
  // Try to get the existing model
  VoucherPurchaseRequest = mongoose.model<IVoucherPurchaseRequest, IVoucherPurchaseRequestModel>('VoucherPurchaseRequest');
} catch {
  // Create the model if it doesn't exist
  VoucherPurchaseRequest = mongoose.model<IVoucherPurchaseRequest, IVoucherPurchaseRequestModel>('VoucherPurchaseRequest', VoucherPurchaseRequestSchema);
}

// Ensure the static method is attached to the model
if (!VoucherPurchaseRequest.generateRequestId) {
  VoucherPurchaseRequest.generateRequestId = generateRequestId;
}

export default VoucherPurchaseRequest;
