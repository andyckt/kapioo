import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.code || !data.password || !data.email) {
      return NextResponse.json(
        { success: false, error: 'Code, email, and new password are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by email and reset code and ensure it hasn't expired
    const user = await User.findOne({
      email: data.email.toLowerCase(),
      resetPasswordCode: data.code,
      resetPasswordExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset code' },
        { status: 400 }
      );
    }
    
    // Set the new password
    await user.setPassword(data.password);
    
    // Clear the reset code
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 