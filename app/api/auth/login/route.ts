import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// POST handler - login user
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.login || !data.password) {
      return NextResponse.json(
        { success: false, error: 'Login ID/email and password are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by userID or email
    const user = await User.findOne({
      $or: [
        { userID: data.login }, 
        { email: data.login.toLowerCase() }
      ]
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check if the user is active
    if (user.status !== 'Active') {
      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 403 }
      );
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(data.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Return user data without sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    
    return NextResponse.json({
      success: true,
      data: {
        user: userResponse,
        // In a real app, you would generate a JWT token here
        // token: generateJWT(user),
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
} 