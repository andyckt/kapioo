import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import CreditPurchaseRequest from '@/models/CreditPurchaseRequest';
import User from '@/models/User';
import { sendAdminCreditRequestNotification, sendUserCreditRequestConfirmation } from '@/lib/services/email';

// POST handler - create a new credit purchase request
export async function POST(request: Request) {
  try {
    console.log('Credit request POST received');
    const data = await request.json();
    console.log('Credit request data:', JSON.stringify(data));
    
    // Validate required fields
    if (!data.userId || !data.amount || !data.imageProof || !data.paymentMethod || !data.originalPrice || !data.referenceNumber) {
      console.log('Missing required fields:', { 
        userId: !!data.userId, 
        amount: !!data.amount, 
        imageProof: !!data.imageProof,
        paymentMethod: !!data.paymentMethod,
        originalPrice: !!data.originalPrice,
        referenceNumber: !!data.referenceNumber
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate payment method
    if (data.paymentMethod !== 'wechat' && data.paymentMethod !== 'emt') {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
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
      paymentMethod: data.paymentMethod,
      originalPrice: data.originalPrice,
      imageProof: data.imageProof,
      referenceNumber: data.referenceNumber,
      notes: data.notes || '',
      planDescription: data.planDescription || '', // Store plan description
      mealPlanType: data.mealPlanType, // Store meal plan type (6aweek, 8aweek, etc.)
      mealPlanQuantity: data.mealPlanQuantity, // Store number of plans (1, 2, or 4 weeks)
      status: 'pending'
    });
    
    const savedRequest = await newRequest.save();
    
    // Send notification to admin
    try {
      console.log('Sending admin notification for request:', requestId);
      
      // Format user address for the email
      const userAddress = user.address ? {
        unitNumber: user.address.unitNumber || '',
        streetAddress: user.address.streetAddress || '',
        city: user.address.city || '',
        province: user.address.province || '',
        postalCode: user.address.postalCode || '',
        country: user.address.country || '',
        buzzCode: user.address.buzzCode || ''
      } : null;
      
      await sendAdminCreditRequestNotification({
        userId: user._id.toString(),
        userName: user.name || user.userID,
        userEmail: user.email,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        originalPrice: data.originalPrice,
        imageProofUrl: data.imageProof,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        planDescription: data.planDescription || '',
        requestId: requestId,
        userAddress: userAddress
      });
      console.log('Admin notification sent successfully');
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
      // Continue with the process even if email fails
    }
    
    // Send confirmation email to user
    try {
      console.log('Sending confirmation email to user:', user.email);
      await sendUserCreditRequestConfirmation({
        userId: user._id.toString(),
        userName: user.name || user.userID,
        userEmail: user.email,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        originalPrice: data.originalPrice,
        referenceNumber: data.referenceNumber,
        planDescription: data.planDescription || '',
        requestId: requestId
      }, user.languagePreference || 'zh'); // Pass user's language preference
      console.log('User confirmation email sent successfully');
    } catch (emailError) {
      console.error('Error sending user confirmation email:', emailError);
      // Continue with the process even if email fails
    }
    
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
