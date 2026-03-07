import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { AUTH_SECRET } from '@/lib/env';
import User from '@/models/User';
import crypto from 'crypto';

// POST handler - unsubscribe user from specific email type
export async function POST(request: Request) {
  try {
    const { email, type, token } = await request.json();
    
    // Validate required fields
    if (!email || !type || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify token
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${email}-${type}-${AUTH_SECRET}`)
      .digest('hex')
      .substring(0, 32);
    
    if (token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid unsubscribe token' },
        { status: 401 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Map email type to preference field
    const preferenceMap: Record<string, string> = {
      'next-week-menu': 'emailPreferences.nextWeekMenuUpdates',
      'weekly-menu': 'emailPreferences.weeklyMenuUpdates',
      'daily-menu': 'emailPreferences.dailyMenuUpdates',
      'order-updates': 'emailPreferences.orderUpdates',
      'marketing': 'emailPreferences.marketing'
    };
    
    const preferenceField = preferenceMap[type];
    
    if (!preferenceField) {
      return NextResponse.json(
        { success: false, error: 'Invalid email type' },
        { status: 400 }
      );
    }
    
    // Update user's email preference
    const updateObj: any = {};
    updateObj[preferenceField] = false;
    
    await User.findByIdAndUpdate(user._id, { $set: updateObj });
    
    console.log(`Processed unsubscribe request for type=${type}`);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed'
    });
  } catch (error) {
    console.error('Error unsubscribing user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
