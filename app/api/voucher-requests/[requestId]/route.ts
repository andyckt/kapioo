import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import VoucherPurchaseRequest from '@/models/VoucherPurchaseRequest';
import User from '@/models/User';
import mongoose from 'mongoose';
import { sendCreditPurchaseStatusEmail } from '@/lib/services/email';

// GET handler - fetch a single voucher purchase request by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    await connectToDatabase();
    
    const { requestId } = params;
    
    // Find the request
    const voucherRequest = await VoucherPurchaseRequest.findOne({ requestId })
      .populate('userId', 'name email');
    
    if (!voucherRequest) {
      return NextResponse.json(
        { success: false, error: 'Voucher purchase request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: voucherRequest
    });
  } catch (error) {
    console.error('Error fetching voucher purchase request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch voucher purchase request' },
      { status: 500 }
    );
  }
}

// PUT handler - update a voucher purchase request (approve/decline)
export async function PUT(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    await connectToDatabase();
    
    const { requestId } = params;
    const body = await request.json();
    const { status, adminNotes } = body;
    
    // Validate status
    if (!status || !['approved', 'declined'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Find the request
    const voucherRequest = await VoucherPurchaseRequest.findOne({ requestId });
    
    if (!voucherRequest) {
      return NextResponse.json(
        { success: false, error: 'Voucher purchase request not found' },
        { status: 404 }
      );
    }
    
    // Check if request is already processed
    if (voucherRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been processed' },
        { status: 400 }
      );
    }
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update the request status
      const updateData: any = {
        status,
        adminNotes: adminNotes || undefined
      };
      
      // Add timestamp based on status
      if (status === 'approved') {
        updateData.approvedAt = new Date();
      } else if (status === 'declined') {
        updateData.declinedAt = new Date();
      }
      
      // Update the request
      const updatedRequest = await VoucherPurchaseRequest.findOneAndUpdate(
        { requestId },
        updateData,
        { new: true, session }
      ).populate('userId', 'name email');
      
      // If approved, update user's voucher balance
      if (status === 'approved') {
        const user = await User.findById(voucherRequest.userId);
        
        if (!user) {
          await session.abortTransaction();
          session.endSession();
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }
        
        // Update the appropriate voucher count
        if (voucherRequest.type === 'twoDish') {
          await User.findByIdAndUpdate(
            voucherRequest.userId,
            { $inc: { twoDishVoucher: voucherRequest.quantity } },
            { session }
          );
        } else if (voucherRequest.type === 'threeDish') {
          await User.findByIdAndUpdate(
            voucherRequest.userId,
            { $inc: { threeDishVoucher: voucherRequest.quantity } },
            { session }
          );
        }
        
        // Send email notification to user (commented out for now)
        /*
        try {
          await sendCreditPurchaseStatusEmail(
            user.email,
            user.name,
            requestId,
            'approved',
            voucherRequest.quantity
          );
        } catch (emailError) {
          console.error('Failed to send approval email to user:', emailError);
          // Continue even if email fails
        }
        */
      } else if (status === 'declined') {
        // Send decline email notification to user (commented out for now)
        /*
        try {
          const user = await User.findById(voucherRequest.userId);
          if (user) {
            await sendCreditPurchaseStatusEmail(
              user.email,
              user.name,
              requestId,
              'declined'
            );
          }
        } catch (emailError) {
          console.error('Failed to send decline email to user:', emailError);
          // Continue even if email fails
        }
        */
      }
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      return NextResponse.json({
        success: true,
        data: updatedRequest,
        message: `Voucher purchase request ${status}`
      });
    } catch (transactionError) {
      // Abort the transaction on error
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }
  } catch (error) {
    console.error('Error updating voucher purchase request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update voucher purchase request' },
      { status: 500 }
    );
  }
}
