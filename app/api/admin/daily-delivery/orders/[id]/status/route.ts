import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import { sendDailyOrderStatusUpdateNotification } from '@/lib/services/notifications';
import User from '@/models/User';

// Define route params interface
interface RouteParams {
  params: {
    id: string;
  };
}

// Define the interface for the DailyOrder document
interface DailyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: any[];
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  voucherCost: {
    twoDish: number;
    threeDish: number;
  };
  specialInstructions?: string;
  deliveryAddress: {
    unitNumber?: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    buzzCode?: string;
  };
  phoneNumber: string;
  area: string;
  confirmedAt?: Date;
  deliveredAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Create a schema for daily orders
const DailyDeliveryOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  items: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  voucherCost: {
    twoDish: {
      type: Number,
      default: 0
    },
    threeDish: {
      type: Number,
      default: 0
    }
  },
  specialInstructions: String,
  deliveryAddress: {
    unitNumber: String,
    streetAddress: String,
    city: String,
    province: String,
    postalCode: String,
    country: String,
    buzzCode: String
  },
  phoneNumber: String,
  area: String,
  confirmedAt: Date,
  deliveredAt: Date,
  refundedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model
let DailyDeliveryOrder: mongoose.Model<DailyOrderDocument>;
try {
  // Check if the model already exists
  DailyDeliveryOrder = mongoose.models.DailyDeliveryOrder as mongoose.Model<DailyOrderDocument>;
} catch (error) {
  // Create the model if it doesn't exist
  DailyDeliveryOrder = mongoose.model<DailyOrderDocument>('DailyDeliveryOrder', DailyDeliveryOrderSchema);
}

// PATCH handler - update order status
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
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
    const order = await DailyDeliveryOrder.findOne({ orderId: id });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Update timestamp based on status
    const updateData: any = { status };
    
    if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'refunded') {
      updateData.refundedAt = new Date();
      
      // If refunded, return vouchers to user
      if (order.status !== 'refunded') {
        const user = await User.findById(order.userId);
        if (user) {
          user.twoDishVoucher += order.voucherCost.twoDish || 0;
          user.threeDishVoucher += order.voucherCost.threeDish || 0;
          await user.save();
        }
      }
    }
    
    // Update the order
    const updatedOrder = await DailyDeliveryOrder.findOneAndUpdate(
      { orderId: id },
      { $set: updateData },
      { new: true }
    );
    
    // Send notification to user about status change
    try {
      const user = await User.findById(order.userId);
      if (user && user.email) {
        await sendDailyOrderStatusUpdateNotification(
          user.email,
          user.name,
          id,
          status,
          order.items,
          order.status // Previous status
        );
      }
    } catch (notificationError) {
      console.error('Failed to send status update notification:', notificationError);
      // Don't fail the API call if notification sending fails
    }
    
    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to update order status', details: error.message },
      { status: 500 }
    );
  }
}
