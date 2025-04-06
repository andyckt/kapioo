import { NextResponse } from 'next/server';
import { handleOrderNotification, NotificationType } from '@/lib/services/notifications';
import Order from '@/models/Order';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { notificationType, orderId, userId, previousStatus, transactionId, amount } = await request.json();
    
    // Validate input
    if (!notificationType) {
      return NextResponse.json(
        { success: false, error: 'Notification type is required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Find order and user if needed
    let order = null;
    let user = null;
    
    if (orderId) {
      order = await Order.findOne({ orderId });
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }
    }
    
    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
    }
    
    // Send the notification
    await handleOrderNotification(
      notificationType as NotificationType,
      order,
      user,
      previousStatus,
      transactionId,
      amount
    );
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification', details: error.message },
      { status: 500 }
    );
  }
} 