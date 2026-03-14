import { NextResponse } from 'next/server';
import { requireAdminMfa, requireUser } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { annotateLegacyOrderRoute, LEGACY_ORDER_DOMAIN } from '@/lib/orders/domain-contract';
import Order from '@/models/Order';
import User from '@/models/User';
import mongoose from 'mongoose';

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

// POST handler - legacy route retired in Phase 2B
export async function POST(request: Request) {
  void request;
  return legacyOrderJson(
    {
      success: false,
      error: 'Legacy order creation has been retired. Use /api/daily-delivery/order instead.',
    },
    { status: 410 }
  );
}