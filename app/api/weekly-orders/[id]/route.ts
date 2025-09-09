import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyOrder from '@/models/WeeklyOrder';
import mongoose from 'mongoose';

// Interface for route params
interface RouteParams {
  params: {
    id: string;
  };
}

// GET handler - get a specific weekly order by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
    await connectToDatabase();
    
    // Find order by ID or orderId
    const order = await WeeklyOrder.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null },
        { orderId: id }
      ]
    });
    
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
  } catch (error: any) {
    console.error(`Error fetching weekly order ${params.id}:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch order details',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PATCH handler - update a weekly order (e.g., change status)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const data = await request.json();
    
    await connectToDatabase();
    
    // Find order by ID or orderId
    const order = await WeeklyOrder.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null },
        { orderId: id }
      ]
    });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Update only allowed fields
    const allowedUpdates = ['status', 'specialInstructions'];
    const updates: Record<string, any> = {};
    
    Object.keys(data).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = data[key];
      }
    });
    
    // Add refundedAt timestamp if status is being set to 'refunded'
    if (data.status === 'refunded' && order.status !== 'refunded') {
      updates.refundedAt = new Date();
    }
    
    // Update the order
    const updatedOrder = await WeeklyOrder.findByIdAndUpdate(
      order._id,
      { $set: updates },
      { new: true }
    );
    
    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error: any) {
    console.error(`Error updating weekly order ${params.id}:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update order',
        details: error.message
      },
      { status: 500 }
    );
  }
}
