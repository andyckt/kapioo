import { NextResponse } from 'next/server';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// Interface for route params
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST handler - change user password
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }
    const { currentPassword, newPassword } = await request.json();
    
    // Validate inputs
    if (!newPassword || (!currentPassword && actor.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
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
    
    // Verify current password
    if (actor.role !== 'admin') {
      const isPasswordValid = await user.comparePassword(currentPassword);
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }
    
    // Set new password
    await user.setPassword(newPassword);
    user.sessionVersion = Number(user.sessionVersion || 1) + 1;
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    const { id } = await params;
    console.error(`Error changing password for user ${id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    );
  }
} 