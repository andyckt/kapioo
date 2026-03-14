import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { annotateLegacyOrderRoute, LEGACY_ORDER_DOMAIN } from '@/lib/orders/domain-contract';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import Transaction from '@/models/Transaction';

// Interface for route params
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

function legacyOrderJson(body: unknown, init?: ResponseInit) {
  return annotateLegacyOrderRoute(
    NextResponse.json(body, init),
    LEGACY_ORDER_DOMAIN.detailRoute
  );
}

// GET handler - get order details
export async function GET(request: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return annotateLegacyOrderRoute(response!, LEGACY_ORDER_DOMAIN.detailRoute);
    }
    
    await connectToDatabase();
    
    // Find order by orderId or _id
    const order = await Order.findOne({
      $or: [
        { orderId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null }
      ]
    }).populate('userId', 'name email userID');
    
    if (!order) {
      return legacyOrderJson(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderUserId =
      typeof order.userId === 'object' && order.userId
        ? String((order.userId as any)._id || order.userId)
        : String(order.userId);

    if (actor.role !== 'admin' && orderUserId !== String(actor.user._id)) {
      return legacyOrderJson(
        { success: false, error: 'You do not have access to this order' },
        { status: 403 }
      );
    }
    
    // Check for refund transaction if the order is cancelled
    let refundTransaction = null;
    if (order.status === 'cancelled') {
      refundTransaction = await Transaction.findOne({
        userId: order.userId,
        type: 'refund',
        description: { $regex: `Refund for cancelled order: ${order.orderId}` }
      });
    }
    
    // Create response data with type assertion
    const responseData: any = order.toObject();
    
    // Add refund transaction if found
    if (refundTransaction) {
      responseData.refundTransaction = refundTransaction;
    }
    
    return legacyOrderJson({
      success: true,
      data: responseData
    });
  } catch (error: any) {
    console.error(`Error fetching order with ID ${id}:`, error);
    return legacyOrderJson(
      { success: false, error: 'Failed to fetch order', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH handler - update order status
export async function PATCH(request: Request, { params }: RouteParams) {
  void request;
  void params;
  return legacyOrderJson(
    {
      success: false,
      error: 'Legacy order updates have been retired. Use /api/admin/daily-delivery/orders/[id]/status instead.',
    },
    { status: 410 }
  );
} 