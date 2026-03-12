import { NextResponse } from 'next/server';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import mongoose from 'mongoose';

// Interface for route params (Next.js 15: params is a Promise)
interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET handler - get order count for a specific user
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
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
    
    // Count orders for this user
    const count = await Order.countDocuments({ userId: user._id });
    
    return NextResponse.json({
      success: true,
      count
    });
  } catch (error: any) {
    console.error(`Error counting orders for user ${id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to count user orders', details: error.message },
      { status: 500 }
    );
  }
} 