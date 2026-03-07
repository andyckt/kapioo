import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rate-limit';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    // Validate required fields
    if (!data.code || !data.email) {
      return NextResponse.json(
        { success: false, error: 'Code and email are required' },
        { status: 400 }
      );
    }

    const rateLimitResult = checkRateLimit(
      `verify-reset:${ipAddress}:${String(data.email).toLowerCase()}`,
      10,
      15 * 60 * 1000
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
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
    
    return NextResponse.json({
      success: true,
      message: 'Reset code is valid'
    });
  } catch (error) {
    console.error('Error verifying reset code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify reset code' },
      { status: 500 }
    );
  }
} 