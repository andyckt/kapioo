import mongoose, { Schema, Document, Model } from 'mongoose';

export type RedemptionPurchaseType = 'daily_topup' | 'weekly_topup';

export interface IPromoCodeRedemption extends Document {
  promoCodeId: mongoose.Types.ObjectId;
  promoCode: string;
  userId: mongoose.Types.ObjectId;
  userPhoneNormalized: string;
  requestId: string;
  purchaseType: RedemptionPurchaseType;
  currency: 'CAD';
  originalSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  taxAmount: number;
  finalTotal: number;
  consumedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPromoCodeRedemptionModel extends Model<IPromoCodeRedemption> {}

const PromoCodeRedemptionSchema = new Schema<IPromoCodeRedemption>(
  {
    promoCodeId: {
      type: Schema.Types.ObjectId,
      ref: 'PromoCode',
      required: true
    },
    promoCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userPhoneNormalized: {
      type: String,
      required: true,
      trim: true
    },
    requestId: {
      type: String,
      required: true,
      trim: true
    },
    purchaseType: {
      type: String,
      enum: ['daily_topup', 'weekly_topup'],
      required: true
    },
    currency: {
      type: String,
      enum: ['CAD'],
      default: 'CAD'
    },
    originalSubtotal: {
      type: Number,
      required: true
    },
    discountAmount: {
      type: Number,
      required: true
    },
    discountedSubtotal: {
      type: Number,
      required: true
    },
    taxAmount: {
      type: Number,
      required: true
    },
    finalTotal: {
      type: Number,
      required: true
    },
    consumedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Idempotency key for redemption creation (promo + user + request).
PromoCodeRedemptionSchema.index(
  { promoCodeId: 1, userPhoneNormalized: 1, requestId: 1 },
  { unique: true, name: 'unique_redemption_for_request' }
);

// One-use-per-user lookup path.
PromoCodeRedemptionSchema.index({ promoCodeId: 1, userPhoneNormalized: 1 });

const PromoCodeRedemption: IPromoCodeRedemptionModel =
  (mongoose.models.PromoCodeRedemption as IPromoCodeRedemptionModel) ||
  mongoose.model<IPromoCodeRedemption, IPromoCodeRedemptionModel>(
    'PromoCodeRedemption',
    PromoCodeRedemptionSchema
  );

export default PromoCodeRedemption;
