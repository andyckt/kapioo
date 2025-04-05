import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    // Extract userId from params
    const { id } = params;
    
    // Check if user exists
    const user = await User.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null },
        { userID: id }
      ]
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Count total orders for the user
    const totalOrdersCount = await Order.countDocuments({ userId: user._id });
    
    // Count upcoming deliveries (orders with status: pending, confirmed, delivery)
    const upcomingDeliveriesCount = await Order.countDocuments({ 
      userId: user._id,
      status: { $in: ['pending', 'confirmed', 'delivery'] }
    });
    
    return NextResponse.json({
      success: true,
      data: { 
        totalOrders: totalOrdersCount,
        upcomingDeliveries: upcomingDeliveriesCount
      },
    });
  } catch (error: any) {
    console.error('Error counting user orders:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to count orders' },
      { status: 500 }
    );
  }
} 