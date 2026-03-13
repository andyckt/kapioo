import mongoose, { Schema, Document } from 'mongoose';
import { IAddress } from './UserSubscription';

export const WEEKLY_MEAL_PLAN_TYPES = ['legacy', '6aweek', '8aweek', '10aweek', '12aweek', '16aweek'] as const;
export type WeeklyMealPlanType = (typeof WEEKLY_MEAL_PLAN_TYPES)[number];

// Define WeeklyOrderItem interface
export interface IWeeklyOrderItem {
  dayId: string;        // 'sunday' or 'tuesday'
  optionId: string;     // ID of the meal option
  optionName: string;   // Name of the meal option
  quantity: number;     // Number of meals ordered
  date: string;         // Formatted date string for delivery
}

// Define WeeklyOrder interface
export interface IWeeklyOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;      // A unique order ID for reference
  items: IWeeklyOrderItem[];
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  creditCost: number;   // Total credits used for this order
  mealPlanType?: WeeklyMealPlanType;
  voucherDeducted: boolean;
  specialInstructions?: string;
  deliveryAddress: IAddress;
  phoneNumber: string;
  area: string;
  refundedAt?: Date;    // Date when the order was refunded (if applicable)
  createdAt: Date;
  updatedAt: Date;
}

// Define WeeklyOrderItem schema
const WeeklyOrderItemSchema = new Schema({
  dayId: {
    type: String,
    required: true,
    enum: ['sunday', 'tuesday']
  },
  optionId: {
    type: String,
    required: true
  },
  optionName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  date: {
    type: String,
    required: true
  }
});

// Define Address schema (copied from UserSubscription)
const AddressSchema = new Schema({
  unitNumber: {
    type: String,
  },
  streetAddress: {
    type: String,
    required: true,
  },
  province: {
    type: String,
    required: true,
  },
  postalCode: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: false,
    default: 'Canada',
  },
  buzzCode: {
    type: String,
  },
});

// Define WeeklyOrder schema
const WeeklyOrderSchema: Schema = new Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true
    },
    items: [WeeklyOrderItemSchema],
    status: { 
      type: String, 
      enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },
    creditCost: {
      type: Number,
      required: true,
      min: 0
    },
    mealPlanType: {
      type: String,
      enum: WEEKLY_MEAL_PLAN_TYPES,
      default: 'legacy',
    },
    voucherDeducted: {
      type: Boolean,
      default: false,
    },
    specialInstructions: {
      type: String,
      default: '',
    },
    deliveryAddress: AddressSchema,
    phoneNumber: {
      type: String,
      required: true,
    },
    area: {
      type: String,
      required: true,
    },
    refundedAt: {
      type: Date,
    }
  },
  { 
    timestamps: true,
  }
);

function shouldRefreshWeeklyOrderModel(model: mongoose.Model<IWeeklyOrder> | undefined) {
  const schema = model?.schema as any;
  const mealPlanTypePath = schema?.path?.('mealPlanType');
  const voucherDeductedPath = schema?.path?.('voucherDeducted');

  return (
    !mealPlanTypePath ||
    !voucherDeductedPath ||
    !Array.isArray(mealPlanTypePath.enumValues) ||
    !mealPlanTypePath.enumValues.includes('legacy')
  );
}

export function getWeeklyOrderModel() {
  const existingModel = mongoose.models.WeeklyOrder as mongoose.Model<IWeeklyOrder> | undefined;

  if (shouldRefreshWeeklyOrderModel(existingModel)) {
    delete (mongoose.models as Record<string, unknown>).WeeklyOrder;
  }

  return (mongoose.models.WeeklyOrder as mongoose.Model<IWeeklyOrder> | undefined) ||
    mongoose.model<IWeeklyOrder>('WeeklyOrder', WeeklyOrderSchema);
}

// Create model if it doesn't exist already (for Next.js hot reloading)
export default getWeeklyOrderModel();
