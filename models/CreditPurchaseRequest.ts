import mongoose, { Schema, Document, Model } from 'mongoose';
import { allocateSequentialId } from '@/lib/ids/atomic-sequence';

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
  referenceNumber: string; // Email address used to send the transfer
  interacReference?: string;
  interacReferenceNormalized?: string;
  payerEmailIdentityId?: mongoose.Types.ObjectId;
  payerEmailVerifiedAt?: Date;
  paymentIntentId?: mongoose.Types.ObjectId;
  submissionKey?: string;
  amountCents?: number;
  paymentVerificationStatus?: 'manual' | 'pending' | 'not_found' | 'matched' | 'review' | 'duplicate' | 'failed';
  nextPaymentCheckAt?: Date;
  lastPaymentCheckedAt?: Date;
  paymentCheckAttempts?: number;
  paymentCheckError?: string;
  paymentReviewRequired?: boolean;
  matchedPaymentReceiptId?: mongoose.Types.ObjectId;
  duplicateOfRequestId?: string;
  approvalSource?: 'automatic' | 'manual';
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
  interacReference: { type: String, trim: true },
  interacReferenceNormalized: { type: String, trim: true },
  payerEmailIdentityId: { type: Schema.Types.ObjectId, ref: 'InteracPayerEmail' },
  payerEmailVerifiedAt: { type: Date },
  paymentIntentId: { type: Schema.Types.ObjectId, ref: 'EtransferPaymentIntent' },
  submissionKey: { type: String, trim: true },
  amountCents: { type: Number, min: 1 },
  paymentVerificationStatus: {
    type: String,
    enum: ['manual', 'pending', 'not_found', 'matched', 'review', 'duplicate', 'failed'],
    default: 'manual'
  },
  nextPaymentCheckAt: { type: Date },
  lastPaymentCheckedAt: { type: Date },
  paymentCheckAttempts: { type: Number, default: 0 },
  paymentCheckError: { type: String },
  paymentReviewRequired: { type: Boolean, default: false },
  matchedPaymentReceiptId: { type: Schema.Types.ObjectId, ref: 'InteracReceipt' },
  duplicateOfRequestId: { type: String },
  approvalSource: { type: String, enum: ['automatic', 'manual'] },
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

CreditPurchaseRequestSchema.index(
  { userId: 1, submissionKey: 1 },
  { unique: true, partialFilterExpression: { submissionKey: { $type: 'string' } } }
);
CreditPurchaseRequestSchema.index({ status: 1, paymentMethod: 1, nextPaymentCheckAt: 1 });
CreditPurchaseRequestSchema.index({ interacReferenceNormalized: 1, createdAt: 1 });
CreditPurchaseRequestSchema.index({ payerEmailIdentityId: 1, amountCents: 1, createdAt: 1 });

// Function to generate the next requestId
async function generateRequestId() {
  return allocateSequentialId(
    'credit-purchase-request',
    'CR-REQ-',
    1000,
    mongoose.models.CreditPurchaseRequest
  );
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
