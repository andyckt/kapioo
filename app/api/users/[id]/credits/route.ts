import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';

// Interface for route params
interface RouteParams {
  params: {
    id: string;
  };
}

// POST handler - add credits to a user's account
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const { amount, description } = await request.json();
    
    // Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid positive amount is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by ID
    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Add credits to user
      user.credits = (user.credits || 0) + amount;
      await user.save({ session });
      
      // Create transaction record
      const transactionId = await Transaction.generateTransactionId('Add');
      const transaction = new Transaction({
        transactionId,
        userId: user._id,
        type: 'Add',
        amount,
        description: description || `Admin added ${amount} credits`
      });
      
      await transaction.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      
      return NextResponse.json({
        success: true,
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            credits: user.credits
          },
          transaction
        }
      });
    } catch (transactionError: any) {
      // Abort transaction on error
      await session.abortTransaction();
      throw transactionError;
    } finally {
      // End session
      session.endSession();
    }
  } catch (error: any) {
    console.error(`Error adding credits to user ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to add credits', details: error.message },
      { status: 500 }
    );
  }
} 