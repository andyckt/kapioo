import mongoose, { Schema, Document } from 'mongoose';

// Define CartItem interface
export interface ICartItem {
  dayId: string;
  optionId: string;
  quantity: number;
}

// Define UserSubscription interface
export interface IUserSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  status: 'active' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// Define CartItem schema
const CartItemSchema = new Schema({
  dayId: {
    type: String,
    required: true,
  },
  optionId: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
});

// Define UserSubscription schema
const UserSubscriptionSchema: Schema = new Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
    },
    items: [CartItemSchema],
    status: { 
      type: String, 
      enum: ['active', 'cancelled', 'completed'],
      default: 'active',
    },
  },
  { 
    timestamps: true,
  }
);

// Create model if it doesn't exist already (for Next.js hot reloading)
export default mongoose.models.UserSubscription || mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);
