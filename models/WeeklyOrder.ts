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
  creditCost: number;   // Legacy compatibility field; do not use as weekly voucher identity
  mealPlanType?: WeeklyMealPlanType;
  voucherDeducted: boolean;
  weeklyEntitlementGroupId?: string;
  allocatedMealCount?: number;
  specialInstructions?: string;
  deliveryAddress: IAddress;
  phoneNumber: string;
  area: string;
  orderCustomerOverride?: {
    name?: string;
    phoneNumber?: string;
    area?: string;
    specialInstructions?: string;
    deliveryAddress?: IAddress;
    updatedAt?: Date;
    updatedBy?: string;
  };
  orderCustomerOverrideLogs?: Array<{
    updatedAt?: Date;
    updatedBy?: string;
    changedFields?: string[];
    changedDetails?: Array<{
      field?: string;
      from?: string;
      to?: string;
    }>;
  }>;
  confirmedAt?: Date;
  deliveredAt?: Date;
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
    weeklyEntitlementGroupId: {
      type: String,
    },
    allocatedMealCount: {
      type: Number,
      min: 0,
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
    orderCustomerOverride: {
      name: {
        type: String,
      },
      phoneNumber: {
        type: String,
      },
      area: {
        type: String,
      },
      specialInstructions: {
        type: String,
      },
      deliveryAddress: {
        unitNumber: {
          type: String,
        },
        streetAddress: {
          type: String,
        },
        city: {
          type: String,
        },
        province: {
          type: String,
        },
        postalCode: {
          type: String,
        },
        country: {
          type: String,
        },
        buzzCode: {
          type: String,
        },
      },
      updatedAt: {
        type: Date,
      },
      updatedBy: {
        type: String,
      },
    },
    orderCustomerOverrideLogs: [
      {
        updatedAt: {
          type: Date,
        },
        updatedBy: {
          type: String,
        },
        changedFields: [
          {
            type: String,
          },
        ],
        changedDetails: [
          {
            field: {
              type: String,
            },
            from: {
              type: String,
            },
            to: {
              type: String,
            },
          },
        ],
      },
    ],
    confirmedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
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
  const weeklyEntitlementGroupIdPath = schema?.path?.('weeklyEntitlementGroupId');
  const allocatedMealCountPath = schema?.path?.('allocatedMealCount');
  const confirmedAtPath = schema?.path?.('confirmedAt');
  const deliveredAtPath = schema?.path?.('deliveredAt');
  const orderCustomerOverridePath = schema?.path?.('orderCustomerOverride');
  const orderCustomerOverrideLogsPath = schema?.path?.('orderCustomerOverrideLogs');

  return (
    !mealPlanTypePath ||
    !voucherDeductedPath ||
    !weeklyEntitlementGroupIdPath ||
    !allocatedMealCountPath ||
    !confirmedAtPath ||
    !deliveredAtPath ||
    !orderCustomerOverridePath ||
    !orderCustomerOverrideLogsPath ||
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
