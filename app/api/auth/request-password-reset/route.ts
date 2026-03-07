import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rate-limit';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    // Validate required fields
    if (!data.email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const rateLimitResult = checkRateLimit(
      `password-reset:${ipAddress}:${String(data.email).toLowerCase()}`,
      5,
      15 * 60 * 1000
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findOne({ email: data.email.toLowerCase() });
    
    // For security reasons, don't reveal whether the email exists or not
    // Just return success even if the user doesn't exist
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a password reset code will be sent'
      });
    }
    
    // Generate password reset code
    const { code } = user.generatePasswordResetCode();
    
    await user.save();
    
    // Send password reset email with code
    try {
      await sendPasswordResetEmail(user.email, code, user.languagePreference || 'zh');
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      return NextResponse.json(
        { success: false, error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password reset code sent successfully'
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
} 