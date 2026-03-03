import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
  type OrderCustomerOverride,
} from '@/lib/orders/effective-customer-info';

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
  orderCustomerOverride?: OrderCustomerOverride;
  orderCustomerOverrideLogs?: Array<{
    updatedAt: Date;
    updatedBy: string;
    changedFields: string[];
  }>;
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
  orderCustomerOverride: {
    name: String,
    phoneNumber: String,
    area: String,
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
    updatedAt: Date,
    updatedBy: String
  },
  orderCustomerOverrideLogs: [
    {
      updatedAt: Date,
      updatedBy: String,
      changedFields: [String]
    }
  ],
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

// GET handler - get a single order by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
    await connectToDatabase();
    
    const { id } = params;
    
    // Find the order by orderId
    const order = await DailyDeliveryOrder.findOne({ orderId: id }).lean();
    
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
      effectiveCustomerInfo: resolveEffectiveOrderCustomerInfo(order as any, user),
      hasOrderOnlyOverride: hasOrderCustomerOverride(order as any),
      orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order as any)
    };
    
    return NextResponse.json({
      success: true,
      data: orderWithUserInfo
    });
  } catch (error: any) {
    console.error('Error fetching order details:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order details', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE handler - delete order without notification (admin only)
// Optional: return vouchers/credits based on query parameter
// Does NOT send email notification
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
    await connectToDatabase();
    
    const { id } = params;
    
    // Get query parameter to check if vouchers should be returned
    const url = new URL(request.url);
    const returnVouchers = url.searchParams.get('returnVouchers') === 'true';
    
    // Find the order by orderId
    const order = await DailyDeliveryOrder.findOne({ orderId: id });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Return vouchers to user if requested and order was not already refunded
    if (returnVouchers && order.status !== 'refunded') {
      const user = await User.findById(order.userId);
      if (user) {
        const twoDishReturned = order.voucherCost?.twoDish || 0;
        const threeDishReturned = order.voucherCost?.threeDish || 0;
        
        user.twoDishVoucher += twoDishReturned;
        user.threeDishVoucher += threeDishReturned;
        await user.save();
        
        console.log(`Returned vouchers to user ${user.email}: ${twoDishReturned} 2-dish, ${threeDishReturned} 3-dish`);
      }
    }
    
    // Delete the order (no email notification)
    await DailyDeliveryOrder.deleteOne({ orderId: id });
    
    console.log(`Order ${id} deleted without notification (vouchers ${returnVouchers ? 'returned' : 'not returned'}) by admin`);
    
    return NextResponse.json({
      success: true,
      message: `Order deleted successfully without notification${returnVouchers ? ' (vouchers returned)' : ''}`
    });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete order', details: error.message },
      { status: 500 }
    );
  }
}
