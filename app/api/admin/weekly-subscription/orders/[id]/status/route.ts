import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { restoreWeeklyOrderEntitlement } from '@/lib/orders/weekly-refund';
import { sendDailyOrderStatusUpdateNotification } from '@/lib/services/notifications';
import User from '@/models/User';
import WeeklyOrder from '@/models/WeeklyOrder';

// Define route params interface
interface RouteParams {
  params: {
    id: string;
  };
}

// PATCH handler - update weekly subscription order status
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    // First connect to the database
    await connectToDatabase();
    
    const { id } = params;
    const { status } = await request.json();
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
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
    
    // Store the previous status for notifications
    const previousStatus = order.status;
    
    // Update timestamp based on status
    const updateData: any = { status };
    
    if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'refunded') {
      updateData.refundedAt = new Date();
      
      // Refund the same entitlement type that was originally consumed.
      if (order.status !== 'refunded') {
        const user = await User.findById(order.userId);
        if (user) {
          restoreWeeklyOrderEntitlement(user, order);
          await user.save();
        }
      }
    }
    
    // Update the order
    const updatedOrder = await WeeklyOrder.findOneAndUpdate(
      { orderId: id },
      { $set: updateData },
      { new: true }
    );
    
    // Send notification to user about status change (skip for 'confirmed' and 'delivered' status)
    if (status !== 'confirmed' && status !== 'delivered') {
      try {
        const user = await User.findById(order.userId);
        if (user && user.email) {
          await sendDailyOrderStatusUpdateNotification(
            user.email,
            user.name,
            id,
            status,
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
      data: updatedOrder
    });
  } catch (error: any) {
    console.error('Error updating weekly subscription order status:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to update order status', details: error.message },
      { status: 500 }
    );
  }
}
