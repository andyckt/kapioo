import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import UserSubscription from '@/models/UserSubscription';
import User from '@/models/User';

// GET handler - return user's subscription history
export async function GET(request: Request) {
  try {
    // Get the user ID from the query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get user's subscription history
    const subscriptions = await UserSubscription.find({
      userId: user._id
    }).sort({ createdAt: -1 }).lean();
    
    return NextResponse.json(
      { success: true, data: subscriptions },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user subscription history:', error);
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}