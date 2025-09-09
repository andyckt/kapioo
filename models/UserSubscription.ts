import mongoose, { Schema, Document } from 'mongoose';

// Define CartItem interface
export interface ICartItem {
  dayId: string;
  optionId: string;
  quantity: number;
}

// Define Address interface
export interface IAddress {
  unitNumber?: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  buzzCode?: string;
}

// Define UserSubscription interface
export interface IUserSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  status: 'active' | 'cancelled' | 'completed';
  specialInstructions?: string;
  deliveryAddress?: IAddress;
  phoneNumber?: string;
  area?: string;
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

// Define Address schema
const AddressSchema = new Schema({
  unitNumber: {
    type: String,
  },
  streetAddress: {
    type: String,
    required: true,
  },
  city: {
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
    required: true,
  },
  buzzCode: {
    type: String,
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
    specialInstructions: {
      type: String,
      default: '',
    },
    deliveryAddress: AddressSchema,
    phoneNumber: {
      type: String,
      default: '',
    },
    area: {
      type: String,
      required: true,
    },
  },
  { 
    timestamps: true,
  }
);

// Create model if it doesn't exist already (for Next.js hot reloading)
export default mongoose.models.UserSubscription || mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);
