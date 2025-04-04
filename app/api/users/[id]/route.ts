import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// Interface for route params
interface RouteParams {
  params: {
    id: string;
  };
}

// GET handler - return a specific user by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
    await connectToDatabase();
    
    // Find user excluding password and salt fields
    const user = await User.findOne({ 
      $or: [{ _id: id }, { userID: id }] 
    }).select('-password -salt');
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error(`Error fetching user ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH handler - update a user
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const data = await request.json();
    
    await connectToDatabase();
    
    // Find user
    const user = await User.findOne({ 
      $or: [{ _id: id }, { userID: id }] 
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Handle email update - check if new email is already in use
    if (data.email && data.email !== user.email) {
      const existingUserWithEmail = await User.findOne({ email: data.email });
      if (existingUserWithEmail) {
        return NextResponse.json(
          { success: false, error: 'Email is already in use' },
          { status: 409 }
        );
      }
    }
    
    // Handle userID update - check if new userID is already in use
    if (data.userID && data.userID !== user.userID) {
      const existingUserWithID = await User.findOne({ userID: data.userID });
      if (existingUserWithID) {
        return NextResponse.json(
          { success: false, error: 'User ID is already in use' },
          { status: 409 }
        );
      }
    }
    
    // Handle password update
    if (data.password) {
      await user.setPassword(data.password);
      // Remove password from data to avoid overwriting the hashed password
      delete data.password;
    }
    
    // Update user fields
    Object.keys(data).forEach((key) => {
      if (key !== 'password' && key !== 'salt') {
        user[key] = data[key];
      }
    });
    
    await user.save();
    
    // Return updated user without password and salt
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    
    return NextResponse.json({ success: true, data: userResponse });
  } catch (error) {
    console.error(`Error updating user ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE handler - delete a user
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
    await connectToDatabase();
    
    // Find and delete user
    const user = await User.findOneAndDelete({ 
      $or: [{ _id: id }, { userID: id }] 
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error(`Error deleting user ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 