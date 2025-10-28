import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import VoucherPurchaseRequest from '@/models/VoucherPurchaseRequest';
import User from '@/models/User';
import mongoose from 'mongoose';
import { sendAdminVoucherRequestNotification, sendUserVoucherRequestConfirmation } from '@/lib/services/email';

// GET handler - fetch voucher purchase requests
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    if (userId) {
      query.userId = userId;
    }
    if (status && ['pending', 'approved', 'declined'].includes(status)) {
      query.status = status;
    }
    
    // Execute query with pagination
    const totalCount = await VoucherPurchaseRequest.countDocuments(query);
    const requests = await VoucherPurchaseRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching voucher purchase requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch voucher purchase requests' },
      { status: 500 }
    );
  }
}

// POST handler - create a new voucher purchase request
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Parse request body
    const body = await request.json();
    const { userId, type, quantity, amount, imageProof, referenceNumber, notes } = body;
    
    // Validate required fields
    if (!userId || !type || !quantity || !amount || !imageProof || !referenceNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate voucher type
    if (type !== 'twoDish' && type !== 'threeDish') {
      return NextResponse.json(
        { success: false, error: 'Invalid voucher type' },
        { status: 400 }
      );
    }
    
    // Validate quantity and amount
    if (quantity <= 0 || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity and amount must be positive numbers' },
        { status: 400 }
      );
    }
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Generate a unique request ID
    const requestId = await VoucherPurchaseRequest.generateRequestId();
    
    // Create the voucher purchase request
    const newRequest = new VoucherPurchaseRequest({
      requestId,
      userId: new mongoose.Types.ObjectId(userId),
      type,
      quantity,
      amount,
      imageProof,
      referenceNumber,
      notes,
      status: 'pending'
    });
    
    // Save the request to the database
    await newRequest.save();
    
    // Send notification to admin
    try {
      await sendAdminVoucherRequestNotification({
        userId,
        userName: user.name,
        userEmail: user.email,
        type,
        quantity,
        amount,
        imageProofUrl: imageProof,
        referenceNumber,
        notes,
        requestId
      });
      console.log('Admin notification sent successfully for voucher request:', requestId);
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
      // Continue even if email fails
    }
    
    // Send confirmation email to user
    try {
      console.log('Sending confirmation email to user:', user.email);
      await sendUserVoucherRequestConfirmation({
        userId,
        userName: user.name,
        userEmail: user.email,
        type,
        quantity,
        amount,
        referenceNumber,
        notes,
        requestId
      });
      console.log('User confirmation email sent successfully for voucher request:', requestId);
    } catch (emailError) {
      console.error('Failed to send user confirmation email:', emailError);
      // Continue even if email fails
    }
    
    return NextResponse.json({
      success: true,
      data: newRequest,
      message: 'Voucher purchase request submitted successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating voucher purchase request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create voucher purchase request' },
      { status: 500 }
    );
  }
}
