import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import {
  resolveWeeklyStatusTransition,
  WEEKLY_OPERATOR_ORDER_STATUSES,
} from '@/lib/orders/weekly-status';
import { sendDailyOrderStatusUpdateNotification } from '@/lib/services/notifications';
import User from '@/models/User';
import WeeklyOrder from '@/models/WeeklyOrder';

// Define route params interface
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PATCH handler - update weekly subscription order status
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    // First connect to the database
    await connectToDatabase();
    
    const { status } = await request.json();

    if (typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Find the order by orderId
    const order = await WeeklyOrder.findOne({ orderId: id });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    const transition = resolveWeeklyStatusTransition(order, status);
    if (!transition.ok) {
      return NextResponse.json(
        {
          success: false,
          error: transition.error,
          allowedNextStatuses: transition.allowedNextStatuses,
          validStatuses: WEEKLY_OPERATOR_ORDER_STATUSES,
          currentStatus: transition.currentStatus,
        },
        { status: 409 }
      );
    }

    if (transition.noOp) {
      return NextResponse.json({
        success: true,
        data: order,
        meta: {
          currentStatus: transition.currentStatus,
          nextStatus: transition.nextStatus,
          noOp: true,
          allowedNextStatuses: transition.allowedNextStatuses,
        }
      });
    }

    const updateData = transition.patch || { status: transition.nextStatus };
    const updatedOrder = await WeeklyOrder.findOneAndUpdate(
      { orderId: id },
      { $set: updateData },
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found after update attempt' },
        { status: 404 }
      );
    }
    
    // Send notification to user about status change (skip for 'confirmed' and 'delivered' status)
    if (transition.nextStatus !== 'confirmed' && transition.nextStatus !== 'delivered') {
      try {
        const user = await User.findById(order.userId);
        if (user && user.email) {
          await sendDailyOrderStatusUpdateNotification(
            user.email,
            user.name,
            id,
            transition.nextStatus,
            order.items,
            order.status, // Previous status
            user.languagePreference || 'zh', // Pass user's language preference from database
            order.createdAt // Pass the actual order creation date
          );
        }
      } catch (notificationError) {
        console.error('Failed to send status update notification:', notificationError);
        // Don't fail the API call if notification sending fails
      }
    }
    
    return NextResponse.json({
      success: true,
      data: updatedOrder,
      meta: {
        currentStatus: transition.currentStatus,
        nextStatus: transition.nextStatus,
        noOp: false,
        allowedNextStatuses: transition.allowedNextStatuses,
      }
    });
  } catch (error: any) {
    console.error('Error updating weekly subscription order status:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to update order status', details: error.message },
      { status: 500 }
    );
  }
}
