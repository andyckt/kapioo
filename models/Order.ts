import mongoose, { Schema, Document } from 'mongoose';

/**
 * @deprecated Legacy order model retained only for Phase 2B migration.
 * Canonical daily-delivery order work should target `models/DailyDeliveryOrder.ts`.
 */

export interface OrderItem {
  dayId: string;
  date: string;
  comboId: string;
  comboName: string;
  type: 'A' | 'B';
  quantity: number;
  voucherType: 'twoDish' | 'threeDish';
}

export interface OrderDocument extends Document {
  userId: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  totalVouchers: {
    twoDish: number;
    threeDish: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema({
  dayId: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  comboId: {
    type: String,
    required: true
  },
  comboName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['A', 'B'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  voucherType: {
    type: String,
    enum: ['twoDish', 'threeDish'],
    required: true
  }
});

const OrderSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  items: [OrderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
    default: 'pending'
  },
  totalVouchers: {
    twoDish: {
      type: Number,
      default: 0
    },
    threeDish: {
      type: Number,
      default: 0
    }
  }
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model<OrderDocument>('Order', OrderSchema);