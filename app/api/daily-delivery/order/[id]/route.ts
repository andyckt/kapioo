import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';
import { resolveEffectiveOrderCustomerInfo } from '@/lib/orders/effective-customer-info';

// Interface for route params
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Define the interface for the DailyOrder document
interface DailyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: Array<{
    day: string;
    date: string;
    comboId: string;
    comboName: string;
    type: string;
    quantity: number;
    voucherType: string;
  }>;
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

// Create or get the model
let DailyDeliveryOrder: mongoose.Model<DailyOrderDocument>;

// GET handler - get a specific order by ID
export async function GET(request: Request, { params }: RouteParams) {
  let orderId = '';

  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const resolvedParams = await params;
    orderId = resolvedParams.id;
    
    await connectToDatabase();
    
    // Initialize the model if it doesn't exist
    if (!mongoose.models.DailyDeliveryOrder) {
      DailyDeliveryOrder = mongoose.model<DailyOrderDocument>('DailyDeliveryOrder', DailyDeliveryOrderSchema);
    } else {
      DailyDeliveryOrder = mongoose.model<DailyOrderDocument>('DailyDeliveryOrder');
    }
    
    // Find the order by orderId
    const order = await DailyDeliveryOrder.findOne({ orderId });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (actor.role !== 'admin' && String(order.userId) !== String(actor.user._id)) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this order' },
        { status: 403 }
      );
    }
    
    const user = await User.findById(order.userId).select('name email').lean();
    const plainOrder = typeof (order as any).toObject === 'function' ? (order as any).toObject() : order;
    const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(plainOrder as any, user);

    return NextResponse.json({
      success: true,
      data: {
        ...plainOrder,
        effectiveCustomerInfo,
        phoneNumber: effectiveCustomerInfo.phoneNumber,
        area: effectiveCustomerInfo.area,
        deliveryAddress: effectiveCustomerInfo.deliveryAddress,
        specialInstructions: effectiveCustomerInfo.specialInstructions
      }
    });
  } catch (error: any) {
    console.error(`Error fetching order ${orderId}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order', details: error.message },
      { status: 500 }
    );
  }
}