import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/api-utils';

// Get the DailyOrder model
let DailyOrder;
try {
  DailyOrder = mongoose.model('DailyOrder');
} catch {
  // If model doesn't exist yet, we'll need to define the schema
  // This is a simplified version of the schema since the full one is in the main route.ts
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
    creditCost: Number,
    specialInstructions: String,
    deliveryAddress: Object,
    phoneNumber: String,
    area: String,
    confirmedAt: Date,
    deliveredAt: Date,
    refundedAt: Date,
    createdAt: Date,
    updatedAt: Date
  });
  
  DailyOrder = mongoose.model('DailyOrder', DailyOrderSchema);
}

// GET handler - get a specific order by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    
    const orderId = params.id;
    
    // Find the order
    const order = await DailyOrder.findOne({ orderId }).populate('userId', 'name email userID');
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PATCH handler - update order status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    const orderId = params.id;
    const { status } = await request.json();
    
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Find the order
    const order = await DailyOrder.findOne({ orderId });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: any = { status };
    
    // Add timestamps based on status
    if (status === 'confirmed' && !order.confirmedAt) {
      updateData.confirmedAt = new Date();
    } else if (status === 'delivered' && !order.deliveredAt) {
      updateData.deliveredAt = new Date();
    } else if (status === 'refunded' && !order.refundedAt) {
      updateData.refundedAt = new Date();
    }
    
    // Update the order
    const updatedOrder = await DailyOrder.findByIdAndUpdate(
      order._id,
      { $set: updateData },
      { new: true }
    ).populate('userId', 'name email userID');
    
    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
