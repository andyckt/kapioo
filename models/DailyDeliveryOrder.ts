import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyDeliveryOrderItem {
  day: string;
  date: string;
  comboId: string;
  comboName: string;
  type: string;
  quantity: number;
  voucherType: string;
  dishes?: Array<{ dishId?: string; name?: string } | string>;
}

export interface IDailyDeliveryOrderAddress {
  unitNumber?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  buzzCode?: string;
}

export interface IDailyOrderCustomerOverride {
  name?: string;
  phoneNumber?: string;
  area?: string;
  specialInstructions?: string;
  deliveryAddress?: IDailyDeliveryOrderAddress;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface IDailyOrderCustomerOverrideLog {
  updatedAt?: Date;
  updatedBy?: string;
  changedFields?: string[];
  changedDetails?: Array<{
    field?: string;
    from?: string;
    to?: string;
  }>;
}

export interface IDailyDeliveryOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: IDailyDeliveryOrderItem[];
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  voucherCost: {
    twoDish: number;
    threeDish: number;
  };
  taxIncluded: boolean;
  taxRate: number;
  specialInstructions?: string;
  deliveryAddress?: IDailyDeliveryOrderAddress;
  phoneNumber?: string;
  area?: string;
  orderCustomerOverride?: IDailyOrderCustomerOverride;
  orderCustomerOverrideLogs?: IDailyOrderCustomerOverrideLog[];
  confirmedAt?: Date;
  deliveredAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyDeliveryOrderSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    items: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },
    voucherCost: {
      twoDish: {
        type: Number,
        default: 0,
      },
      threeDish: {
        type: Number,
        default: 0,
      },
    },
    taxIncluded: {
      type: Boolean,
      default: true,
    },
    taxRate: {
      type: Number,
      default: 0.13,
    },
    specialInstructions: String,
    deliveryAddress: {
      unitNumber: String,
      streetAddress: String,
      city: String,
      province: String,
      postalCode: String,
      country: String,
      buzzCode: String,
    },
    phoneNumber: String,
    area: String,
    orderCustomerOverride: {
      name: String,
      phoneNumber: String,
      area: String,
      specialInstructions: String,
      deliveryAddress: {
        unitNumber: String,
        streetAddress: String,
        city: String,
        province: String,
        postalCode: String,
        country: String,
        buzzCode: String,
      },
      updatedAt: Date,
      updatedBy: String,
    },
    orderCustomerOverrideLogs: [
      {
        updatedAt: Date,
        updatedBy: String,
        changedFields: [String],
        changedDetails: [
          {
            field: String,
            from: String,
            to: String,
          },
        ],
      },
    ],
    confirmedAt: Date,
    deliveredAt: Date,
    refundedAt: Date,
  },
  {
    timestamps: true,
  }
);

function shouldRefreshDailyDeliveryOrderModel(
  model: mongoose.Model<IDailyDeliveryOrder> | undefined
) {
  const schema = model?.schema as
    | {
        path?: (pathName: string) => unknown;
      }
    | undefined;

  return !schema?.path?.('orderCustomerOverride') || !schema.path?.('orderCustomerOverrideLogs');
}

export function getDailyDeliveryOrderModel() {
  const existingModel = mongoose.models.DailyDeliveryOrder as
    | mongoose.Model<IDailyDeliveryOrder>
    | undefined;

  if (shouldRefreshDailyDeliveryOrderModel(existingModel)) {
    delete (mongoose.models as Record<string, unknown>).DailyDeliveryOrder;
  }

  return (mongoose.models.DailyDeliveryOrder as mongoose.Model<IDailyDeliveryOrder> | undefined) ||
    mongoose.model<IDailyDeliveryOrder>('DailyDeliveryOrder', DailyDeliveryOrderSchema);
}

export default getDailyDeliveryOrderModel();
