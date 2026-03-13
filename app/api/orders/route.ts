import { NextResponse } from 'next/server';
import { requireAdminMfa, requireUser } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { annotateLegacyOrderRoute, LEGACY_ORDER_DOMAIN } from '@/lib/orders/domain-contract';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import mongoose from 'mongoose';
import { handleOrderNotification, NotificationType } from '@/lib/services/notifications';

function legacyOrderJson(body: unknown, init?: ResponseInit) {
  return annotateLegacyOrderRoute(
    NextResponse.json(body, init),
    LEGACY_ORDER_DOMAIN.listRoute
  );
}

// GET handler - get orders with optional userId filtering
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return annotateLegacyOrderRoute(response!, LEGACY_ORDER_DOMAIN.listRoute);
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected');
    
    // Build query
    const query: any = {};
    
    // Filter by userId if provided
    if (userId) {
      const isSelf =
        String(actor.user._id) === String(userId) ||
        String(actor.user.userID) === String(userId);
      if (!isSelf && actor.role !== 'admin') {
        return legacyOrderJson(
          { success: false, error: 'You do not have access to these orders' },
          { status: 403 }
        );
      }

      if (!isSelf && actor.role === 'admin') {
        const { response: adminMfaResponse } = await requireAdminMfa(request);
        if (adminMfaResponse) {
          return annotateLegacyOrderRoute(adminMfaResponse, LEGACY_ORDER_DOMAIN.listRoute);
        }
      }

      if (mongoose.Types.ObjectId.isValid(userId)) {
        query['$or'] = [
          { userId: new mongoose.Types.ObjectId(userId) },
          { userId: userId }
        ];
      } else {
        query.userId = userId;
      }
    } else if (actor.role !== 'admin') {
      query['$or'] = [
        { userId: actor.user._id },
        { userId: String(actor.user._id) }
      ];
    } else {
      return legacyOrderJson(
        { success: false, error: 'User ID is required for admin order access' },
        { status: 400 }
      );
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    console.log('Executing order query:', JSON.stringify(query));
    
    try {
      // Find orders with pagination
      const orders = await Order.find(query)
        .sort({ createdAt: -1 }) // Sort by most recent first
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email userID'); // Include user details
      
      console.log(`Found ${orders.length} orders`);
      
      // Get total count for pagination
      const totalOrders = await Order.countDocuments(query);
      
      return legacyOrderJson({ 
        success: true, 
        data: {
          orders,
          page,
          limit,
          total: totalOrders,
          pages: Math.ceil(totalOrders / limit)
        }
      });
    } catch (dbError: any) {
      console.error('Database error when fetching orders:', dbError);
      return legacyOrderJson(
        { success: false, error: 'Database error when fetching orders', details: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return legacyOrderJson(
      { success: false, error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}

// POST handler - create a new order
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response ? annotateLegacyOrderRoute(response, LEGACY_ORDER_DOMAIN.listRoute) : response;
    }

    const {
      userId,
      selectedMeals,
      creditCost,
      specialInstructions,
      deliveryAddress,
      phoneNumber
    } = await request.json();
    
    const effectiveUserId =
      actor.role === 'admin' && userId
        ? userId
        : String(actor.user._id);

    if (
      actor.role !== 'admin' &&
      userId &&
      String(userId) !== String(actor.user._id) &&
      String(userId) !== String(actor.user.userID)
    ) {
      return legacyOrderJson(
        { success: false, error: 'You cannot create orders for another user' },
        { status: 403 }
      );
    }
    
    // Check if at least one meal is selected, supporting both old and new structure
    const hasSelectedMeals = selectedMeals && (
      // Check for old structure (boolean values)
      (typeof Object.values(selectedMeals)[0] === 'boolean' && 
       Object.values(selectedMeals).some(selected => !!selected)) ||
      // Check for new structure (objects with selected property)
      (typeof Object.values(selectedMeals)[0] === 'object' && 
       Object.values(selectedMeals).some((meal: any) => meal?.selected))
    );
    
    if (!hasSelectedMeals) {
      return legacyOrderJson(
        { success: false, error: 'At least one meal must be selected' },
        { status: 400 }
      );
    }
    
    if (!creditCost || creditCost <= 0) {
      return legacyOrderJson(
        { success: false, error: 'Valid credit cost is required' },
        { status: 400 }
      );
    }
    
    if (!deliveryAddress || !deliveryAddress.streetAddress || 
        !deliveryAddress.province || !deliveryAddress.postalCode) {
      return legacyOrderJson(
        { success: false, error: 'Complete delivery address is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user
    const user = await User.findById(effectiveUserId);
    if (!user) {
      return legacyOrderJson(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has enough credits
    if ((user.credits || 0) < creditCost) {
      return legacyOrderJson(
        { success: false, error: 'Insufficient credits' },
        { status: 400 }
      );
    }
    
    // Generate order ID
    const orderId = await Order.generateOrderId();
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create new order
      const newOrder = new Order({
        orderId,
        userId: effectiveUserId,
        selectedMeals,
        creditCost,
        specialInstructions,
        deliveryAddress,
        phoneNumber,
        status: 'pending'
      });
      
      const savedOrder = await newOrder.save({ session });
      
      // Deduct credits from user and update phone number if provided
      user.credits -= creditCost;
      if (phoneNumber && phoneNumber.trim()) {
        user.phone = phoneNumber.trim();
      }
      await user.save({ session });
      
      // Create transaction record for the credit deduction
      const transactionId = await Transaction.generateTransactionId('debit');
      const transaction = new Transaction({
        transactionId,
        userId: user._id,
        type: 'debit',
        amount: creditCost,
        description: `Order payment: ${orderId}`
      });
      
      await transaction.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      
      // Send notifications
      await handleOrderNotification(
        NotificationType.NEW_ORDER,
        savedOrder,
        user
      );

      
      return legacyOrderJson({
        success: true,
        data: {
          order: savedOrder,
          transaction,
          remainingCredits: user.credits
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
    console.error('Error creating order:', error);
    return legacyOrderJson(
      { success: false, error: 'Failed to create order', details: error.message },
      { status: 500 }
    );
  }
} 