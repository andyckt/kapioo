import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findOne({ email: data.email.toLowerCase() });
    
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
    
    // Generate new verification code
    const { code } = user.generateVerificationCode();
    
    await user.save();
    
    // Send verification email with code
    await sendVerificationEmail(user.email, code);
    
    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
} 