import mongoose, { Schema, Document, Model } from 'mongoose';
import { allocateSequentialId } from '@/lib/ids/atomic-sequence';

// Interface for the document
export interface IVoucherPurchaseRequest extends Document {
  requestId: string;
  userId: mongoose.Types.ObjectId;
  planId?: string;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  amount: number; // Final amount transferred via e-Transfer (including tax)
  originalPrice?: number; // Original price before tax
  taxRate?: number; // Tax rate (e.g., 0.13 for 13%)
  currency?: 'CAD';
  originalSubtotal?: number;
  finalTotal?: number;
  promoCode?: string;
  promoDiscountType?: 'percentage' | 'fixed';
  promoDiscountValue?: number;
  promoDiscountAmount?: number;
  promoId?: mongoose.Types.ObjectId;
  promoErrorCode?: string;
  imageProof: string; // URL to the uploaded proof image
  referenceNumber: string; // Email address used to send the Interac transfer
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
  planId: {
    type: String
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

VoucherPurchaseRequestSchema.index(
  { userId: 1, submissionKey: 1 },
  { unique: true, partialFilterExpression: { submissionKey: { $type: 'string' } } }
);
VoucherPurchaseRequestSchema.index({ status: 1, nextPaymentCheckAt: 1 });
VoucherPurchaseRequestSchema.index({ interacReferenceNormalized: 1, createdAt: 1 });
VoucherPurchaseRequestSchema.index({ payerEmailIdentityId: 1, amountCents: 1, createdAt: 1 });

// Function to generate the next requestId
async function generateRequestId() {
  return allocateSequentialId(
    'voucher-purchase-request',
    'VPR-',
    1000,
    mongoose.models.VoucherPurchaseRequest
  );
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
