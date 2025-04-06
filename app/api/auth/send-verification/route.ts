import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by ID
    const user = await User.findOne({ 
      $or: [
        { _id: data.userId },
        { userID: data.userId }
      ]
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if already verified
    if (user.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Email is already verified' },
        { status: 400 }
      );
    }
    
    // Generate verification code
    const { code } = user.generateVerificationCode();
    
    await user.save();
    
    // Send verification email with code
    await sendVerificationEmail(user.email, code);
    
    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
} 