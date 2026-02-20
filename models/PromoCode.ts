import mongoose, { Schema, Document, Model } from 'mongoose';

export type PromoDiscountType = 'percentage' | 'fixed';
export type PromoAppliesTo = 'daily_topup' | 'weekly_topup' | 'all';

export interface IPromoCode extends Document {
  code: string;
  description?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  currency: 'CAD';
  active: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  maxUses?: number;
  usageCount: number;
  oneUsePerUser: boolean;
  promoOnlyEmt: boolean;
  appliesTo: PromoAppliesTo;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPromoCodeModel extends Model<IPromoCode> {}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      trim: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      enum: ['CAD'],
      default: 'CAD'
    },
    active: {
      type: Boolean,
      default: true
    },
    startsAt: {
      type: Date
    },
    expiresAt: {
      type: Date
    },
    maxUses: {
      type: Number,
      min: 1
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    oneUsePerUser: {
      type: Boolean,
      default: true
    },
    promoOnlyEmt: {
      type: Boolean,
      default: false
    },
    appliesTo: {
      type: String,
      enum: ['daily_topup', 'weekly_topup', 'all'],
      default: 'all'
    }
  },
  {
    timestamps: true
  }
);

PromoCodeSchema.index({ code: 1 }, { unique: true });
PromoCodeSchema.index({ active: 1, expiresAt: 1 });

const PromoCode: IPromoCodeModel =
  (mongoose.models.PromoCode as IPromoCodeModel) ||
  mongoose.model<IPromoCode, IPromoCodeModel>('PromoCode', PromoCodeSchema);

export default PromoCode;
