import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/api-utils';
import mongoose from 'mongoose';

// Create a schema for daily orders
const DailyOrderSchema = new mongoose.Schema({
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
  items: [{
    day: String,
    date: String,
    comboId: String,
    comboName: String,
    type: String,
    quantity: Number,
    voucherType: String
  }],
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

// Create or get the model
let DailyOrder;
try {
  DailyOrder = mongoose.model('DailyOrder');
} catch {
  DailyOrder = mongoose.model('DailyOrder', DailyOrderSchema);
}

// POST handler - create a new daily order
export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.userId || !data.items || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findById(data.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Calculate total items/credits needed
    const totalItems = data.items.reduce((total: number, item: any) => total + item.quantity, 0);
    
    // Check if user has enough credits
    if (user.credits < totalItems) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient credits', 
          requiredCredits: totalItems, 
          availableCredits: user.credits 
        },
        { status: 400 }
      );
    }
    
    // Generate a unique order ID
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000); // 8-digit number
    const orderId = `DD-${randomNumbers}`;
    
    // Create a new daily order
    const dailyOrder = await DailyOrder.create({
      userId: user._id,
      orderId,
      items: data.items,
      status: 'pending',
      creditCost: totalItems,
      specialInstructions: data.specialInstructions || '',
      deliveryAddress: data.deliveryAddress || {},
      phoneNumber: data.phoneNumber || '',
      area: data.area || ''
    });
    
    // Deduct credits from user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: { credits: -totalItems }
      },
      { new: true }
    );
    
    return NextResponse.json(
      { 
        success: true, 
        data: dailyOrder,
        remainingCredits: updatedUser.credits
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing daily order:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to process order' },
      { status: 500 }
    );
  }
}

// GET handler - get all orders for the current user
export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    // Get query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find orders for the user
    const orders = await DailyOrder.find({ userId })
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching daily orders:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
