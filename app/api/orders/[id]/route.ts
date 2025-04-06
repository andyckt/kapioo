import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { handleOrderNotification, NotificationType } from '@/lib/services/notifications';

// Interface for route params
interface RouteParams {
  params: {
    id: string;
  };
}

// GET handler - get order details
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
    await connectToDatabase();
    
    // Find order by orderId or _id
    const order = await Order.findOne({
      $or: [
        { orderId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null }
      ]
    }).populate('userId', 'name email userID');
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
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
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error: any) {
    console.error(`Error fetching order with ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH handler - update order status
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const { status, refundCredits } = await request.json();
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find order by orderId or _id
    const order = await Order.findOne({
      $or: [
        { orderId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null }
      ]
    });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Store the previous status for notifications
    const previousStatus = order.status;

    // If changing to refunded status, process the refund
    if (status === 'refunded' && order.status !== 'refunded') {
      // Find user to refund credits
      const user = await User.findById(order.userId);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found for refund processing' },
          { status: 404 }
        );
      }
      
      // Start a session for transaction
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Update order status
        order.status = status;
        order.refundedAt = new Date();
        await order.save({ session });
        
        // Add credits back to user
        user.credits += order.creditCost;
        await user.save({ session });
        
        // Create transaction record for the refund
        const transactionId = await Transaction.generateTransactionId('refund');
        const transaction = new Transaction({
          transactionId,
          userId: user._id,
          type: 'refund',
          amount: order.creditCost,
          description: `Refund for order: ${order.orderId}`
        });
        
        await transaction.save({ session });
        
        // Commit the transaction
        await session.commitTransaction();
        
        // Send notification for order status change
        await handleOrderNotification(
          NotificationType.ORDER_REFUNDED,
          order,
          user,
          previousStatus
        );
        
        return NextResponse.json({
          success: true,
          data: {
            order,
            transaction,
            updatedCredits: user.credits
          }
        });
      } catch (transactionError: any) {
        // Abort transaction on error
        await session.abortTransaction();
        console.error('Transaction error during refund:', transactionError);
        return NextResponse.json(
          { success: false, error: 'Failed to process refund', details: transactionError.message },
          { status: 500 }
        );
      } finally {
        // End session
        session.endSession();
      }
    }
    // If changing to cancelled status with refundCredits option, process the cancellation with refund
    else if (status === 'cancelled' && refundCredits === true && order.status !== 'cancelled' && order.status !== 'refunded') {
      // Find user to refund credits
      const user = await User.findById(order.userId);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found for cancellation refund processing' },
          { status: 404 }
        );
      }
      
      // Start a session for transaction
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Update order status
        order.status = status;
        await order.save({ session });
        
        // Add credits back to user
        user.credits += order.creditCost;
        await user.save({ session });
        
        // Create transaction record for the cancellation refund
        const transactionId = await Transaction.generateTransactionId('refund');
        const transaction = new Transaction({
          transactionId,
          userId: user._id,
          type: 'refund',
          amount: order.creditCost,
          description: `Refund for cancelled order: ${order.orderId}`
        });
        
        await transaction.save({ session });
        
        // Commit the transaction
        await session.commitTransaction();

        // Send notification for order cancellation
        await handleOrderNotification(
          NotificationType.ORDER_CANCELLED,
          order,
          user,
          previousStatus
        );
        
        return NextResponse.json({
          success: true,
          data: {
            order,
            transaction,
            updatedCredits: user.credits
          }
        });
      } catch (transactionError: any) {
        // Abort transaction on error
        await session.abortTransaction();
        console.error('Transaction error during cancellation refund:', transactionError);
        return NextResponse.json(
          { success: false, error: 'Failed to process cancellation refund', details: transactionError.message },
          { status: 500 }
        );
      } finally {
        // End session
        session.endSession();
      }
    }
    else {
      // Normal status update without refund
      // Update status
      order.status = status;
      
      // Set timestamp based on status
      if (status === 'confirmed' && !order.confirmedAt) {
        order.confirmedAt = new Date();
      } else if (status === 'delivered' && !order.deliveredAt) {
        order.deliveredAt = new Date();
      }
      
      await order.save();

      // Find user for notification
      const user = await User.findById(order.userId);
      
      if (user) {
        // Map status to notification type
        let notificationType;
        switch (status) {
          case 'confirmed':
            notificationType = NotificationType.ORDER_CONFIRMED;
            break;
          case 'delivery':
            notificationType = NotificationType.ORDER_DELIVERY;
            break;
          case 'delivered':
            notificationType = NotificationType.ORDER_DELIVERED;
            break;
          case 'cancelled':
            notificationType = NotificationType.ORDER_CANCELLED;
            break;
          default:
            notificationType = null;
        }
        
        // Send notification if applicable
        if (notificationType) {
          await handleOrderNotification(
            notificationType,
            order,
            user,
            previousStatus
          );
        }
      }
      
      return NextResponse.json({
        success: true,
        data: order
      });
    }
  } catch (error: any) {
    console.error(`Error updating order with ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order', details: error.message },
      { status: 500 }
    );
  }
} 