import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import CreditPurchaseRequest from '@/models/CreditPurchaseRequest';
import User from '@/models/User';
import { sendAdminCreditRequestNotification } from '@/lib/services/email';

// POST handler - create a new credit purchase request
export async function POST(request: Request) {
  try {
    console.log('Credit request POST received');
    const data = await request.json();
    console.log('Credit request data:', JSON.stringify(data));
    
    // Validate required fields
    if (!data.userId || !data.amount || !data.imageProof) {
      console.log('Missing required fields:', { 
        userId: !!data.userId, 
        amount: !!data.amount, 
        imageProof: !!data.imageProof 
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user to ensure they exist
    const user = await User.findById(data.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Generate request ID
    const requestId = await CreditPurchaseRequest.generateRequestId();
    
    // Create new credit purchase request
    const newRequest = new CreditPurchaseRequest({
      requestId,
      userId: data.userId,
      amount: data.amount,
      imageProof: data.imageProof,
      notes: data.notes || '',
      planDescription: data.planDescription || '', // Store plan description
      status: 'pending'
    });
    
    const savedRequest = await newRequest.save();
    
    // Send notification to admin (temporarily disabled for debugging)
    console.log('Admin notification temporarily disabled for debugging');
    // try {
    //   console.log('Sending admin notification for request:', requestId);
    //   await sendAdminCreditRequestNotification({
    //     userId: user._id.toString(),
    //     userName: user.name || user.userID,
    //     userEmail: user.email,
    //     amount: data.amount,
    //     imageProofUrl: data.imageProof,
    //     notes: data.notes,
    //     requestId: requestId
    //   });
    //   console.log('Admin notification sent successfully');
    // } catch (emailError) {
    //   console.error('Error sending admin notification:', emailError);
    //   // Continue with the process even if email fails
    // }
    
    return NextResponse.json({
      success: true,
      data: savedRequest
    });
  } catch (error: any) {
    console.error('Error creating credit purchase request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create credit purchase request' },
      { status: 500 }
    );
  }
}

// GET handler - get credit purchase requests for a user
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Build query
    const query: any = { userId };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Find requests with pagination
    const requests = await CreditPurchaseRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
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
