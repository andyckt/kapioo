import { NextResponse } from 'next/server';
import {
  ApiError,
  errorJson,
  handleRouteError,
  parseJsonBody,
  parseSearchParams,
  successJson,
} from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { createUserBodySchema, usersQuerySchema } from '@/lib/contracts/user';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/services/email';
import mongoose from 'mongoose';
import { withUserDisplayName } from '@/lib/users/display';

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

// GET handler - return all users (with pagination and search)
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: queryInput, error } = parseSearchParams(request, usersQuerySchema);
    if (error) {
      return error;
    }

    const page = queryInput.page ?? 1;
    const limit = queryInput.limit ?? 10;
    const search = queryInput.search ?? '';
    const searchType = queryInput.searchType ?? 'all';
    const skip = (page - 1) * limit;

    await connectToDatabase();
    
    // Build query based on search parameters
    let query: Record<string, unknown> = {};
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      
      switch (searchType) {
        case 'name':
          query = { $or: [{ name: searchRegex }, { nickname: searchRegex }] };
          break;
        case 'email':
          query = { email: searchRegex };
          break;
        case 'userID':
          query = { userID: searchRegex };
          break;
        case 'phone':
          query = { phone: searchRegex };
          break;
        default: // 'all'
          query = {
            $or: [
              { name: searchRegex },
              { nickname: searchRegex },
              { email: searchRegex },
              { userID: searchRegex },
              { phone: searchRegex },
            ]
          };
          break;
      }
    }
    
    // Find users with pagination and search, excluding password and salt fields
    const users = await User.find(query)
      .select('-password -salt -verificationCode -resetPasswordCode -verificationExpires -resetPasswordExpires')
      .sort({ joined: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination with the same search query
    const totalUsers = await User.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: users.map((user) => withUserDisplayName(user)),
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/users');
  }
}

// Define MongoDB error interface
interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

// POST handler - create a new user
export async function POST(request: Request) {
  try {
    console.log('Starting user creation process');
    const { data, error } = await parseJsonBody(request, createUserBodySchema);
    if (error) {
      return error;
    }
    
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Connected to database');
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    
    if (existingUser) {
      console.log('User with this email already exists');
      return errorJson('User with this email already exists', 409);
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
      // Handle address data if provided
      address: data.address || {},
      // Language preference - default to 'zh' for backward compatibility
      languagePreference: data.languagePreference || 'zh',
      // If isVerified is provided (from the verification flow), use it; otherwise, default to false
      isVerified: data.isVerified === true ? true : false
    });
    
    // Set hashed password
    console.log('Setting password');
    await user.setPassword(data.password);
    console.log('Password set successfully');
    
    // Only generate verification code if the user is not already verified
    if (!data.isVerified) {
      console.log('Generating verification code');
      const { code } = user.generateVerificationCode();
      console.log('Verification code generated');
    }
    
    // Save user
    console.log('Saving user to database');
    await user.save();
    console.log('User saved successfully with ID:', user._id);
    
    // Only send verification email if the user is not already verified
    if (!data.isVerified) {
      try {
        await sendVerificationEmail(user.email, user.verificationCode || '', user.languagePreference || 'zh');
        console.log('Verification email sent successfully');
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Continue with the registration process even if the email fails
        // We can implement a resend verification email feature later
      }
    }
    
    // Return user data immediately - don't wait for welcome email
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    delete userResponse.verificationCode;
    delete userResponse.verificationExpires;
    delete userResponse.resetPasswordCode;
    delete userResponse.resetPasswordExpires;
    
    console.log('User creation completed successfully');
    
    // Send welcome email in the background (non-blocking)
    // Using Promise without await so it doesn't block the response
    sendWelcomeEmail(user.email, user.name, user.languagePreference || 'zh')
      .then(() => {
        console.log('Welcome email sent successfully');
      })
      .catch((emailError) => {
        console.error('⚠️ Welcome email failed (non-blocking):', emailError);
        // Email failure doesn't affect user creation - user can still log in
      });
    
    return successJson(userResponse, 201);
  } catch (error: unknown) {
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
      return errorJson('Validation error', 400, {
        details: Object.keys(error.errors).join(', '),
      });
    }
    
    // Check for duplicate key error (MongoDB error code 11000)
    const mongoError = error as MongoError;
    if (mongoError.name === 'MongoError' && mongoError.code === 11000 && mongoError.keyValue) {
      console.error('Duplicate key error:', mongoError.keyValue);
      return handleRouteError(
        new ApiError('Duplicate key error', {
          status: 409,
          details: `field:${Object.keys(mongoError.keyValue)[0]}`,
        }),
        'POST /api/users'
      );
    }
    
    return handleRouteError(error, 'POST /api/users');
  }
} 