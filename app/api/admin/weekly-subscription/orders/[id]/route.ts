import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import {
  describeWeeklyRefundTarget,
  resolveWeeklyRefundTarget,
  restoreWeeklyOrderEntitlement,
} from '@/lib/orders/weekly-refund';
import User from '@/models/User';
import WeeklyOrder from '@/models/WeeklyOrder';
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
} from '@/lib/orders/effective-customer-info';

// Define route params interface
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET handler - get a single weekly subscription order by ID
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    // Find the order by orderId
    const order = await WeeklyOrder.findOne({ orderId: id }).lean();
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Get user information
    const user = await User.findById(order.userId).select('name email').lean();
    
    // Add user info to the order
    const orderWithUserInfo = {
      ...order,
      user,
      effectiveCustomerInfo: resolveEffectiveOrderCustomerInfo(order as any, user as any),
      hasOrderOnlyOverride: hasOrderCustomerOverride(order as any),
      orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order as any)
    };
    
    return NextResponse.json({
      success: true,
      data: orderWithUserInfo
    });
  } catch (error: any) {
    console.error('Error fetching weekly subscription order details:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order details', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE handler - delete order without notification (admin only)
// Optional: return the consumed entitlement based on query parameter
// Does NOT send email notification
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    // Keep the legacy query parameter name for compatibility.
    const url = new URL(request.url);
    const returnCredits = url.searchParams.get('returnCredits') === 'true';
    
    // Find the order by orderId
    const order = await WeeklyOrder.findOne({ orderId: id });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    const shouldRestoreEntitlement = returnCredits && order.status !== 'refunded';
    const refundTarget = shouldRestoreEntitlement
      ? resolveWeeklyRefundTarget(order)
      : { kind: 'none', amount: 0 } as const;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (shouldRestoreEntitlement && refundTarget.kind !== 'none') {
          const user = await User.findById(order.userId).session(session);
          if (!user) {
            throw new Error('User not found for entitlement restoration');
          }
          restoreWeeklyOrderEntitlement(user, order);
          await user.save({ session });
        }

        const deleteResult = await WeeklyOrder.deleteOne({ orderId: id }, { session });
        if (deleteResult.deletedCount !== 1) {
          throw new Error('Order could not be deleted');
        }
      });
    } finally {
      await session.endSession();
    }

    console.log(
      `Weekly order ${id} deleted without notification (${describeWeeklyRefundTarget(refundTarget)}) by admin`
    );
    
    return NextResponse.json({
      success: true,
      message: `Order deleted successfully without notification${shouldRestoreEntitlement ? ` (${describeWeeklyRefundTarget(refundTarget)})` : ''}`,
      meta: {
        refundTarget,
        refundSummary: shouldRestoreEntitlement ? describeWeeklyRefundTarget(refundTarget) : null,
      }
    });
  } catch (error: any) {
    console.error('Error deleting weekly order:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete order', details: error.message },
      { status: 500 }
    );
  }
}
