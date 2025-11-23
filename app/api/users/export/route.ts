import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// GET handler - return all users without pagination for export
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Find all users, excluding password and sensitive fields
    const users = await User.find({})
      .select('-password -salt -verificationCode -resetPasswordCode -verificationExpires -resetPasswordExpires')
      .sort({ joined: -1 });
    
    return NextResponse.json({ 
      success: true, 
      data: users
    });
  } catch (error) {
    console.error('Error fetching all users for export:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users for export' },
      { status: 500 }
    );
  }
}
