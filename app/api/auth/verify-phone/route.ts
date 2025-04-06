import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// POST handler - verify phone number
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by phone
    const user = await User.findOne({
      phone: data.phone,
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Phone number not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is active
    if (user.status !== 'Active') {
      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 403 }
      );
    }
    
    // Return success and userID for password reset
    return NextResponse.json({
      success: true,
      userId: user.userID,
      message: 'Phone number verified successfully'
    });
  } catch (error) {
    console.error('Error during phone verification:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
} 