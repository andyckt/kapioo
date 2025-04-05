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

// POST handler - deduct credits from a user account
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const { credits, description = 'Credit Deduction' } = await request.json();
    
    // Validate input
    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid credit amount is required' },
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
    
    // Check if user has enough credits
    if ((user.credits || 0) < credits) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits' },
        { status: 400 }
      );
    }
    
    // Generate transaction ID
    let transactionId;
    try {
      // Try using the static method
      transactionId = await Transaction.generateTransactionId('Deduct');
    } catch (methodError) {
      console.error('Error generating transaction ID with static method:', methodError);
      
      // Fallback: Create a manual transaction ID
      const count = await Transaction.countDocuments({ type: 'Deduct' });
      transactionId = `DEDUCT-${2000 + count}`;
      console.log('Generated fallback transaction ID:', transactionId);
    }
    
    // Deduct credits from user
    const newCreditBalance = user.credits - credits;
    user.credits = newCreditBalance;
    await user.save();
    
    // Create transaction record
    const transaction = new Transaction({
      transactionId,
      userId: user._id,
      type: 'Deduct',
      amount: credits,
      description,
    });
    
    const savedTransaction = await transaction.save();
    console.log("Deduction transaction saved:", savedTransaction);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        credits: newCreditBalance,
        transaction: savedTransaction
      }
    });
  } catch (error: any) {
    console.error(`Error deducting credits from user ${params.id}:`, error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error instanceof mongoose.Error) {
      console.error('Mongoose error type:', error.name);
    }
    return NextResponse.json(
      { success: false, error: 'Failed to deduct credits', details: error.message },
      { status: 500 }
    );
  }
}