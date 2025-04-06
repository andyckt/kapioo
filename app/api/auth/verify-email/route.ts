import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.code || !data.email) {
      return NextResponse.json(
        { success: false, error: 'Verification code and email are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by email and verification code and ensure it hasn't expired
    const user = await User.findOne({
      email: data.email.toLowerCase(),
      verificationCode: data.code,
      verificationExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }
    
    // Mark user as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    
    await user.save();
    
    // Return user data without sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    delete userResponse.resetPasswordCode;
    delete userResponse.resetPasswordExpires;
    
    return NextResponse.json({
      success: true,
      message: 'Email successfully verified',
      user: userResponse
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { success: false, error: 'Email verification failed' },
      { status: 500 }
    );
  }
} 