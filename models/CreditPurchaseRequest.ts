import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the document
export interface ICreditPurchaseRequest extends Document {
  requestId: string;
  userId: mongoose.Types.ObjectId;
  planId?: string;
  amount: number; // Amount transferred
  paymentMethod: 'wechat' | 'emt'; // Payment method used: WeChat or EMT
  originalPrice: number; // Original price before any discount/tax
  currency?: 'CAD';
  originalSubtotal?: number;
  finalTotal?: number;
  promoCode?: string;
  promoDiscountType?: 'percentage' | 'fixed';
  promoDiscountValue?: number;
  promoDiscountAmount?: number;
  mealSubtotal?: number;
  deliveryFeePerWeek?: number;
  deliveryFeeTotal?: number;
  taxAmount?: number;
  promoId?: mongoose.Types.ObjectId;
  promoErrorCode?: string;
  imageProof: string; // URL to the uploaded proof image
  referenceNumber: string; // Payment reference number
  status: 'pending' | 'approved' | 'declined';
  requestedCredits?: number; // Credits requested by the user (legacy field)
  approvedCredits?: number; // Credits approved by admin (legacy field)
  // New meal plan fields
  approvedSixMeals?: number;
  approvedEightMeals?: number;
  approvedTenMeals?: number;
  approvedTwelveMeals?: number;
  approvedSixteenMeals?: number;
  approvedPlans?: Array<{ planId: string; quantity: number }>;
  mealPlanType?: '6aweek' | '8aweek' | '10aweek' | '12aweek' | '16aweek'; // Type of meal plan
  mealPlanQuantity?: number; // Number of plans (e.g., 1, 2, 4, 8 weeks)
  notes?: string; // Additional notes from user or admin
  adminNotes?: string; // Notes from admin (for internal use)
  planDescription?: string; // Description of the selected plan
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
  planId: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['wechat', 'emt'],
    required: true
  },
  originalPrice: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['CAD'],
    default: 'CAD'
  },
  originalSubtotal: {
    type: Number
  },
  finalTotal: {
    type: Number
  },
  promoCode: {
    type: String
  },
  promoDiscountType: {
    type: String,
    enum: ['percentage', 'fixed']
  },
  promoDiscountValue: {
    type: Number
  },
  promoDiscountAmount: {
    type: Number
  },
  mealSubtotal: {
    type: Number
  },
  deliveryFeePerWeek: {
    type: Number
  },
  deliveryFeeTotal: {
    type: Number
  },
  taxAmount: {
    type: Number
  },
  promoId: {
    type: Schema.Types.ObjectId,
    ref: 'PromoCode'
  },
  promoErrorCode: {
    type: String
  },
  imageProof: {
    type: String,
    required: true
  },
  referenceNumber: {
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
  approvedSixMeals: {
    type: Number
  },
  approvedEightMeals: {
    type: Number
  },
  approvedTenMeals: {
    type: Number
  },
  approvedTwelveMeals: {
    type: Number
  },
  approvedSixteenMeals: {
    type: Number
  },
  approvedPlans: [
    {
      planId: { type: String, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  mealPlanType: {
    type: String,
    enum: ['6aweek', '8aweek', '10aweek', '12aweek', '16aweek']
  },
  mealPlanQuantity: {
    type: Number
  },
  notes: {
    type: String
  },
  adminNotes: {
    type: String
  },
  planDescription: {
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
