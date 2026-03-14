import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import {
  applyBalanceMutations,
  BalanceMutationError,
  type BalanceMutationEntry,
} from '@/lib/balances/mutations';
import connectToDatabase from '@/lib/db';
import CreditPurchaseRequest from '@/models/CreditPurchaseRequest';
import User from '@/models/User';
import mongoose from 'mongoose';
import { sendCreditPurchaseStatusEmail } from '@/lib/services/email';
import { toWeeklyPlanId } from '@/lib/plans/service';

// GET handler - get all credit purchase requests with filtering and pagination
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

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
      .populate('userId', 'name email userID address.province'); // Populate user details
    
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
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

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
        // Get approved meal plan quantities from admin input
        const approvedSixMeals = data.approvedSixMeals || 0;
        const approvedEightMeals = data.approvedEightMeals || 0;
        const approvedTenMeals = data.approvedTenMeals || 0;
        const approvedTwelveMeals = data.approvedTwelveMeals || 0;
        const approvedSixteenMeals = data.approvedSixteenMeals || 0;
        
        // For backward compatibility, also get approvedCredits
        const approvedCredits = data.approvedCredits || 0;
        
        // Check if at least one meal plan type has a value or approvedCredits is provided
        if (approvedSixMeals <= 0 && approvedEightMeals <= 0 && 
            approvedTenMeals <= 0 && approvedTwelveMeals <= 0 && 
            approvedSixteenMeals <= 0 && approvedCredits <= 0) {
          return NextResponse.json(
            { success: false, error: 'At least one meal plan type must have a value' },
            { status: 400 }
          );
        }
        
        // Update request status
        const approvedPlans = [
          { planId: toWeeklyPlanId(6, 1), quantity: approvedSixMeals },
          { planId: toWeeklyPlanId(8, 1), quantity: approvedEightMeals },
          { planId: toWeeklyPlanId(10, 1), quantity: approvedTenMeals },
          { planId: toWeeklyPlanId(12, 1), quantity: approvedTwelveMeals },
          { planId: toWeeklyPlanId(16, 1), quantity: approvedSixteenMeals }
        ].filter((entry) => entry.quantity > 0);

        creditRequest.status = 'approved';
        creditRequest.approvedSixMeals = approvedSixMeals;
        creditRequest.approvedEightMeals = approvedEightMeals;
        creditRequest.approvedTenMeals = approvedTenMeals;
        creditRequest.approvedTwelveMeals = approvedTwelveMeals;
        creditRequest.approvedSixteenMeals = approvedSixteenMeals;
        creditRequest.approvedPlans = approvedPlans;
        creditRequest.approvedCredits = approvedCredits; // For backward compatibility
        creditRequest.adminNotes = data.adminNotes || '';
        creditRequest.approvedAt = new Date();
        await creditRequest.save({ session });

        const balanceMutations: BalanceMutationEntry[] = [];
        if (approvedSixMeals > 0) balanceMutations.push({ field: 'weeklySIXmeals', amount: approvedSixMeals, operation: 'add' });
        if (approvedEightMeals > 0) balanceMutations.push({ field: 'weeklyEIGHTmeals', amount: approvedEightMeals, operation: 'add' });
        if (approvedTenMeals > 0) balanceMutations.push({ field: 'weeklyTENmeals', amount: approvedTenMeals, operation: 'add' });
        if (approvedTwelveMeals > 0) balanceMutations.push({ field: 'weeklyTWELVEmeals', amount: approvedTwelveMeals, operation: 'add' });
        if (approvedSixteenMeals > 0) balanceMutations.push({ field: 'weeklySIXTEENmeals', amount: approvedSixteenMeals, operation: 'add' });
        if (approvedCredits > 0) balanceMutations.push({ field: 'credits', amount: approvedCredits, operation: 'add' });

        await applyBalanceMutations({
          user,
          mutations: balanceMutations,
          description: `Meal plan purchase approved (Request ID: ${creditRequest.requestId})`,
          session,
        });
        
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
            approvedCredits,
            creditRequest.planDescription,
            user.languagePreference || 'zh' // Pass user's language preference
          );
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
              credits: user.credits,
              weeklySIXmeals: user.weeklySIXmeals,
              weeklyEIGHTmeals: user.weeklyEIGHTmeals,
              weeklyTENmeals: user.weeklyTENmeals,
              weeklyTWELVEmeals: user.weeklyTWELVEmeals,
              weeklySIXTEENmeals: user.weeklySIXTEENmeals,
              planBalances: user.planBalances || {}
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
            'declined',
            undefined,
            creditRequest.planDescription,
            user.languagePreference || 'zh' // Pass user's language preference
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
    if (error instanceof BalanceMutationError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.details },
        { status: error.status }
      );
    }

    console.error('Error processing credit purchase request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process credit purchase request' },
      { status: 500 }
    );
  }
}
