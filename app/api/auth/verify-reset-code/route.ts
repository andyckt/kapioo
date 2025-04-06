import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.code || !data.email) {
      return NextResponse.json(
        { success: false, error: 'Code and email are required' },
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