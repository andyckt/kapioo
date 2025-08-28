import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import CreditPurchaseRequest from '@/models/CreditPurchaseRequest';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';
import { sendCreditPurchaseStatusEmail } from '@/lib/services/email';

// GET handler - get all credit purchase requests with filtering and pagination
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    await connectToDatabase();
    
    // Build query
    const query: any = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Find requests with pagination
    const requests = await CreditPurchaseRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email userID'); // Populate user details
    
    // Get total count for pagination
    const totalRequests = await CreditPurchaseRequest.countDocuments(query);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        requests,
        page,
        limit,
        total: totalRequests,
        pages: Math.ceil(totalRequests / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching credit purchase requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credit purchase requests' },
      { status: 500 }
    );
  }
}

// POST handler - approve or decline a credit purchase request
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.requestId || !data.action || !['approve', 'decline'].includes(data.action)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields or invalid action' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find the request
    const creditRequest = await CreditPurchaseRequest.findOne({ requestId: data.requestId });
    if (!creditRequest) {
      return NextResponse.json(
        { success: false, error: 'Credit purchase request not found' },
        { status: 404 }
      );
    }
    
    // Check if request is already processed
    if (creditRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Request is already ${creditRequest.status}` },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findById(creditRequest.userId);
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
      if (data.action === 'approve') {
        // Set approved credits from admin input
        const approvedCredits = data.approvedCredits;
        
        // Validate that approvedCredits is provided
        if (!approvedCredits || approvedCredits <= 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid approved credits amount' },
            { status: 400 }
          );
        }
        
        // Update request status
        creditRequest.status = 'approved';
        creditRequest.approvedCredits = approvedCredits;
        creditRequest.adminNotes = data.adminNotes || '';
        creditRequest.approvedAt = new Date();
        await creditRequest.save({ session });
        
        // Create transaction
                  // Generate transaction ID with the correct type
          const transactionId = await Transaction.generateTransactionId('Add');
          
          const transaction = new Transaction({
            userId: user._id,
            type: 'Add', // Using 'Add' instead of 'credit' to match the enum
            amount: approvedCredits,
            description: `Credit purchase approved (Request ID: ${creditRequest.requestId})`,
            transactionId: transactionId
          });
        await transaction.save({ session });
        
        // Add credits to user
        user.credits = (user.credits || 0) + approvedCredits;
        await user.save({ session });
        
        // Commit the transaction
        await session.commitTransaction();
        
        // Send email notifications to user
        try {
          // Send status update email
          await sendCreditPurchaseStatusEmail(
            user.email,
            user.name || user.userID,
            creditRequest.requestId,
            'approved',
            approvedCredits
          );
          
          // Also send the same notification as the "Add Credits" button
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notificationType: 'credits_added',
              userId: user._id,
              transactionId: transaction.transactionId,
              amount: approvedCredits
            }),
          });
        } catch (emailError) {
          console.error('Error sending approval email:', emailError);
          // Continue even if email fails
        }
        
        return NextResponse.json({
          success: true,
          data: {
            request: creditRequest,
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              credits: user.credits
            }
          }
        });
      } else {
        // Decline the request
        creditRequest.status = 'declined';
        creditRequest.adminNotes = data.adminNotes || '';
        creditRequest.declinedAt = new Date();
        await creditRequest.save({ session });
        
        // Commit the transaction
        await session.commitTransaction();
        
        // Send email notification to user
        try {
          await sendCreditPurchaseStatusEmail(
            user.email,
            user.name || user.userID,
            creditRequest.requestId,
            'declined'
          );
        } catch (emailError) {
          console.error('Error sending decline email:', emailError);
          // Continue even if email fails
        }
        
        return NextResponse.json({
          success: true,
          data: {
            request: creditRequest
          }
        });
      }
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }
  } catch (error: any) {
    console.error('Error processing credit purchase request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process credit purchase request' },
      { status: 500 }
    );
  }
}
