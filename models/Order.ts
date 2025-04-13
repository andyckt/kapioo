import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the document
export interface IOrder extends Document {
  orderId: string;
  userId: mongoose.Types.ObjectId;
  selectedMeals: {
    monday: { selected: boolean; date?: string };
    tuesday: { selected: boolean; date?: string };
    wednesday: { selected: boolean; date?: string };
    thursday: { selected: boolean; date?: string };
    friday: { selected: boolean; date?: string };
    saturday: { selected: boolean; date?: string };
    sunday: { selected: boolean; date?: string };
  };
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  creditCost: number;
  specialInstructions?: string;
  phoneNumber?: string;
  deliveryAddress: {
    unitNumber?: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    buzzCode?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
  refundedAt?: Date;
}

// Interface for the model with static methods
export interface IOrderModel extends Model<IOrder> {
  generateOrderId(): Promise<string>;
}

// Define Order schema
const OrderSchema = new Schema<IOrder>({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  selectedMeals: {
    monday: {
      type: {
        selected: { type: Boolean, default: false },
        date: { type: String, default: "" }
      },
      default: { selected: false, date: "" }
    },
    tuesday: {
      type: {
        selected: { type: Boolean, default: false },
        date: { type: String, default: "" }
      },
      default: { selected: false, date: "" }
    },
    wednesday: {
      type: {
        selected: { type: Boolean, default: false },
        date: { type: String, default: "" }
      },
      default: { selected: false, date: "" }
    },
    thursday: {
      type: {
        selected: { type: Boolean, default: false },
        date: { type: String, default: "" }
      },
      default: { selected: false, date: "" }
    },
    friday: {
      type: {
        selected: { type: Boolean, default: false },
        date: { type: String, default: "" }
      },
      default: { selected: false, date: "" }
    },
    saturday: {
      type: {
        selected: { type: Boolean, default: false },
        date: { type: String, default: "" }
      },
      default: { selected: false, date: "" }
    },
    sunday: {
      type: {
        selected: { type: Boolean, default: false },
        date: { type: String, default: "" }
      },
      default: { selected: false, date: "" }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
    required: true
  },
  creditCost: {
    type: Number,
    required: true
  },
  specialInstructions: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  deliveryAddress: {
    unitNumber: { type: String },
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    buzzCode: { type: String }
  },
  confirmedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Function to generate the next orderId
async function generateOrderId() {
  const prefix = 'ORD-';
  const baseNumber = 1000;
  
  // Use the Order model directly
  const Order = mongoose.models.Order;
  
  // Find the highest existing order ID
  const highestOrder = await Order.findOne(
    { orderId: new RegExp(`^${prefix}\\d+$`) },
    { orderId: 1 },
    { sort: { orderId: -1 } }
  );
  
  if (!highestOrder) {
    // If no orders exist, start with base number
    return `${prefix}${baseNumber}`;
  }
  
  // Extract the number from the highest order ID
  const currentNumber = parseInt(highestOrder.orderId.replace(prefix, ''), 10);
  
  // Return the next number in sequence
  return `${prefix}${currentNumber + 1}`;
}

// Add the static method
OrderSchema.static('generateOrderId', generateOrderId);

// Create or get the model with proper typing
let Order: IOrderModel;

try {
  // Try to get the existing model
  Order = mongoose.model<IOrder, IOrderModel>('Order');
} catch {
  // Create the model if it doesn't exist
  Order = mongoose.model<IOrder, IOrderModel>('Order', OrderSchema);
}

// Ensure the static method is attached to the model
if (!Order.generateOrderId) {
  Order.generateOrderId = generateOrderId;
}

export default Order; 