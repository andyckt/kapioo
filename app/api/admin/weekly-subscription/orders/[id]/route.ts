import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';

// Define route params interface
interface RouteParams {
  params: {
    id: string;
  };
}

// Define the interface for the WeeklyOrder document
interface WeeklyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: any[];
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  creditCost: number;
  specialInstructions?: string;
  deliveryAddress: {
    unitNumber?: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    buzzCode?: string;
  };
  phoneNumber: string;
  area: string;
  confirmedAt?: Date;
  deliveredAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Create a schema for weekly orders
const WeeklyOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  items: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  creditCost: {
    type: Number,
    required: true
  },
  specialInstructions: String,
  deliveryAddress: {
    unitNumber: String,
    streetAddress: String,
    city: String,
    province: String,
    postalCode: String,
    country: String,
    buzzCode: String
  },
  phoneNumber: String,
  area: String,
  confirmedAt: Date,
  deliveredAt: Date,
  refundedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model
let WeeklyOrder: mongoose.Model<WeeklyOrderDocument>;
try {
  // Check if the model already exists
  WeeklyOrder = mongoose.models.WeeklyOrder as mongoose.Model<WeeklyOrderDocument>;
} catch (error) {
  // Create the model if it doesn't exist
  WeeklyOrder = mongoose.model<WeeklyOrderDocument>('WeeklyOrder', WeeklyOrderSchema);
}

// GET handler - get a single weekly subscription order by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
    await connectToDatabase();
    
    const { id } = params;
    
    // Find the order by orderId
    const order = await WeeklyOrder.findOne({ orderId: id }).lean();
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Get user information
    const user = await User.findById(order.userId).select('name email').lean();
    
    // Add user info to the order
    const orderWithUserInfo = {
      ...order,
      user
    };
    
    return NextResponse.json({
      success: true,
      data: orderWithUserInfo
    });
  } catch (error: any) {
    console.error('Error fetching weekly subscription order details:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order details', details: error.message },
      { status: 500 }
    );
  }
}
