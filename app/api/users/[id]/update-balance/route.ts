import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

// Define the route params interface
interface RouteParams {
  params: {
    id: string;
  };
}

// POST handler - update user balance (credits or vouchers)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    // No authentication check for simplicity
    // In a production environment, you would want to add proper authentication

    const { id } = params;
    const { field, amount, operation, description } = await request.json();
    
    // Validate input
    if (!field || !amount || !operation || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }
    
    // Make sure field is one of the allowed fields
    const allowedFields = [
      'credits', 
      'twoDishVoucher', 
      'threeDishVoucher', 
      'weeklySIXmeals', 
      'weeklyEIGHTmeals', 
      'weeklyTENmeals', 
      'weeklyTWELVEmeals'
    ];
    
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { success: false, error: 'Invalid field' },
        { status: 400 }
      );
    }
    
    // Make sure operation is either add or deduct
    if (operation !== 'add' && operation !== 'deduct') {
      return NextResponse.json(
        { success: false, error: 'Invalid operation' },
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
    
    // Check if user has enough balance for deduction
    if (operation === 'deduct' && user[field] < amount) {
      return NextResponse.json(
        { success: false, error: `Insufficient ${field} balance` },
        { status: 400 }
      );
    }
    
    // Calculate the new balance
    const currentBalance = user[field] || 0;
    const newBalance = operation === 'add' 
      ? currentBalance + amount 
      : currentBalance - amount;
    
    // Update the user's balance
    user[field] = newBalance;
    await user.save();
    
    // Create a transaction record if it's a credit operation
    if (field === 'credits') {
      const transaction = new Transaction({
        userId: user._id,
        type: operation === 'add' ? 'credit' : 'debit',
        amount: amount,
        description: description || `${operation === 'add' ? 'Added' : 'Deducted'} ${amount} credits`,
        status: 'completed',
        transactionId: `${operation === 'add' ? 'CR' : 'DB'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      });
      
      await transaction.save();
    }
    
    // Return the updated user without sensitive information
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    delete userResponse.verificationCode;
    delete userResponse.verificationExpires;
    delete userResponse.resetPasswordCode;
    delete userResponse.resetPasswordExpires;
    
    return NextResponse.json({ 
      success: true, 
      data: userResponse,
      message: `${operation === 'add' ? 'Added' : 'Deducted'} ${amount} ${field} ${operation === 'add' ? 'to' : 'from'} user's account`
    });
  } catch (error) {
    console.error(`Error updating user balance:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user balance' },
      { status: 500 }
    );
  }
}