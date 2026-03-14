import { NextRequest, NextResponse } from 'next/server';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
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
    
    // Count total daily orders for the user
    const dailyOrdersCount = await DailyDeliveryOrder.countDocuments({ userId: user._id });
    
    return NextResponse.json({
      success: true,
      count: dailyOrdersCount
    });
  } catch (error: any) {
    console.error('Error counting user daily orders:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to count daily orders' },
      { status: 500 }
    );
  }
}
