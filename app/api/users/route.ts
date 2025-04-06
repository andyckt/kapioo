import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/services/email';
import mongoose from 'mongoose';

// Function to generate a unique userID
async function generateUniqueUserID() {
  const basePrefix = 'user';
  let isUnique = false;
  let userId = '';
  
  while (!isUnique) {
    // Generate a random 3-digit number
    const randomNum = Math.floor(Math.random() * 900) + 100; // Ensures a 3-digit number
    userId = `${basePrefix}${randomNum}`;
    
    // Check if this userID already exists
    const existingUser = await User.findOne({ userID: userId });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return userId;
}

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
      .select('-password -salt -verificationCode -resetPasswordCode -verificationExpires -resetPasswordExpires')
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

// Define MongoDB error interface
interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, any>;
}

// POST handler - create a new user
export async function POST(request: Request) {
  try {
    console.log('Starting user creation process');
    const data = await request.json();
    console.log('Received data:', { ...data, password: data.password ? '******' : undefined });
    
    // Validate required fields
    if (!data.name || !data.email || !data.password) {
      console.log('Validation failed: Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Connected to database');
    
    // Check if user with this email already exists
    console.log('Checking if email already exists:', data.email.toLowerCase());
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    
    if (existingUser) {
      console.log('User with this email already exists');
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Generate a unique userID
    console.log('Generating unique userID');
    const userID = await generateUniqueUserID();
    console.log('Generated userID:', userID);
    
    // Create the user
    console.log('Creating new user object');
    const user = new User({
      userID,
      name: data.name,
      email: data.email.toLowerCase(),
      joined: data.joined || new Date(),
      status: data.status || 'Active',
      credits: data.credits || 0,
      phone: data.phone || '',
      // Address will use the default empty object from the schema
      // We've updated the schema to make address fields optional during registration
      // Users can update their address details after registration
      isVerified: false
    });
    
    // Set hashed password
    console.log('Setting password');
    await user.setPassword(data.password);
    console.log('Password set successfully');
    
    // Generate verification code
    console.log('Generating verification code');
    const { code } = user.generateVerificationCode();
    console.log('Verification code generated');
    
    // Save user
    console.log('Saving user to database');
    await user.save();
    console.log('User saved successfully with ID:', user._id);
    
    // Send verification email with code
    try {
      console.log('Sending verification email to:', user.email);
      await sendVerificationEmail(user.email, code);
      console.log('Verification email sent successfully');
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with the registration process even if the email fails
      // We can implement a resend verification email feature later
    }
    
    // Send welcome email
    try {
      console.log('Sending welcome email to:', user.email);
      await sendWelcomeEmail(user.email, user.name);
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue with the registration process even if the welcome email fails
    }
    
    // Return user without sensitive information
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    delete userResponse.verificationCode;
    delete userResponse.verificationExpires;
    delete userResponse.resetPasswordCode;
    delete userResponse.resetPasswordExpires;
    
    console.log('User creation completed successfully');
    return NextResponse.json(
      { success: true, data: userResponse },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check for specific error types
    if (error instanceof mongoose.Error.ValidationError) {
      console.error('Mongoose validation error:', error.errors);
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    // Check for duplicate key error (MongoDB error code 11000)
    const mongoError = error as MongoError;
    if (mongoError.name === 'MongoError' && mongoError.code === 11000 && mongoError.keyValue) {
      console.error('Duplicate key error:', mongoError.keyValue);
      return NextResponse.json(
        { success: false, error: 'Duplicate key error', field: Object.keys(mongoError.keyValue)[0] },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 