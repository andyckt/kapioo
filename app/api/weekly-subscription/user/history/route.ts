import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyOrder from '@/models/WeeklyOrder';
import User from '@/models/User';
import mongoose from 'mongoose';

// GET handler - get user's weekly subscription order history
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Get user ID from session or query parameter
    const userIdParam = url.searchParams.get('userId');
    
    if (!userIdParam) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if user exists
    const user = await User.findById(userIdParam);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find orders for this user with pagination
    const orders = await WeeklyOrder.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalOrders = await WeeklyOrder.countDocuments({ userId: user._id });
    
    return NextResponse.json({
      success: true,
      data: {
        orders,
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching weekly subscription history:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription history',
        details: error.message
      },
      { status: 500 }
    );
  }
}