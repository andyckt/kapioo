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
  deliveryAddress?: {
    unitNumber?: string;
    streetAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    buzzCode?: string;
  };
  phoneNumber?: string;
  area?: string;
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
    confirmedAt: Date,
    deliveredAt: Date,
    refundedAt: Date,
  },
  {
    timestamps: true,
  }
);

export function getDailyDeliveryOrderModel() {
  return (mongoose.models.DailyDeliveryOrder as mongoose.Model<IDailyDeliveryOrder> | undefined) ||
    mongoose.model<IDailyDeliveryOrder>('DailyDeliveryOrder', DailyDeliveryOrderSchema);
}

export default getDailyDeliveryOrderModel();
