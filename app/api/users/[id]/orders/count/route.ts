import { NextRequest, NextResponse } from 'next/server';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';
import User from '@/models/User';
import WeeklyOrder from '@/models/WeeklyOrder';
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
    
    const [dailyOrdersCount, weeklyOrdersCount, upcomingDailyCount, upcomingWeeklyCount] = await Promise.all([
      DailyDeliveryOrder.countDocuments({ userId: user._id }),
      WeeklyOrder.countDocuments({ userId: user._id }),
      DailyDeliveryOrder.countDocuments({
        userId: user._id,
        status: { $in: ['pending', 'confirmed', 'delivery'] }
      }),
      WeeklyOrder.countDocuments({
        userId: user._id,
        status: { $in: ['pending', 'confirmed', 'delivery'] }
      }),
    ]);

    const totalOrdersCount = dailyOrdersCount + weeklyOrdersCount;
    const upcomingDeliveriesCount = upcomingDailyCount + upcomingWeeklyCount;
    
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