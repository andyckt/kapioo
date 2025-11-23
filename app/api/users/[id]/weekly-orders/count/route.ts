import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyOrder from '@/models/WeeklyOrder';
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
    
    // Count total weekly orders for the user
    const weeklyOrdersCount = await WeeklyOrder.countDocuments({ userId: user._id });
    
    return NextResponse.json({
      success: true,
      count: weeklyOrdersCount
    });
  } catch (error: any) {
    console.error('Error counting user weekly orders:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to count weekly orders' },
      { status: 500 }
    );
  }
}
