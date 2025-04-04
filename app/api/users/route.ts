import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// GET handler - return all users (with pagination)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    // Add pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    await connectToDatabase();
    
    // Find users with pagination, excluding password and salt fields
    const users = await User.find({})
      .select('-password -salt')
      .sort({ joined: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments({});
    
    return NextResponse.json({ 
      success: true, 
      data: users,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST handler - create a new user
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.userID || !data.email || !data.password) {
      return NextResponse.json(
        { success: false, error: 'User ID, email, and password are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if user with this email or userID already exists
    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { userID: data.userID }]
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email or user ID already exists' },
        { status: 409 }
      );
    }
    
    // Create the user
    const user = new User({
      userID: data.userID,
      email: data.email,
      joined: data.joined || new Date(),
      status: data.status || 'Active',
      credits: data.credits || 0,
      phone: data.phone || '',
      address: data.address || {}
    });
    
    // Set hashed password
    await user.setPassword(data.password);
    
    // Save user
    await user.save();
    
    // Return user without password and salt
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    
    return NextResponse.json(
      { success: true, data: userResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 