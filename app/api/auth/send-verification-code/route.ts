import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rate-limit';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    // Validate required fields
    if (!data.email || !data.name || !data.code) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and verification code are required' },
        { status: 400 }
      );
    }

    const rateLimitResult = checkRateLimit(
      `send-verification:${ipAddress}:${String(data.email).toLowerCase()}`,
      5,
      15 * 60 * 1000
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many verification requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    await connectToDatabase();
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Send verification email with the provided code
    try {
      // Use language from request or default to 'zh'
      const language = data.language || 'zh';
      await sendVerificationEmail(data.email, data.code, language);
      console.log('Verification email sent successfully to:', data.email);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      );
    }
    
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
