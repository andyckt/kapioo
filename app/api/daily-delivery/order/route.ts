import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
// Since we're having issues with the auth imports, we'll comment them out for now
// as they're not critical for the daily delivery functionality
// import { getServerSession } from "next-auth/next";
// import { getServerSession } from "next-auth";
// Define authOptions if it's not imported
const authOptions = {
  // Add your auth options here if needed
};
import mongoose from 'mongoose';
import { sendDailyOrderConfirmationEmail, sendAdminDailyOrderNotification } from '@/lib/services/email';
import { resolveEffectiveOrderCustomerInfo } from '@/lib/orders/effective-customer-info';

// Define the interface for the DailyOrder document
// Define item interface
interface DailyOrderItem {
  day: string;
  date: string;
  comboId: string;
  comboName: string;
  type: string;
  quantity: number;
  voucherType: string;
}

// Define request item interface
interface RequestItem {
  day?: string;
  date?: string;
  comboId?: string;
  comboName?: string;
  type?: string;
  quantity?: number;
  voucherType?: string;
  dishes?: string[];
  [key: string]: any;
}

interface DailyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: DailyOrderItem[];
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  voucherCost: {
    twoDish: number;
    threeDish: number;
  };
  taxIncluded: boolean;
  taxRate: number;
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

// Create a schema for daily orders - using a completely new approach
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
  // Store items as a mixed type to avoid schema validation issues
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
  taxIncluded: {
    type: Boolean,
    default: true
  },
  taxRate: {
    type: Number,
    default: 0.13 // 13% tax rate
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

// Log the schema paths without using JSON.stringify
console.log('DailyDeliveryOrderSchema paths:', Object.keys(DailyDeliveryOrderSchema.paths));

// Create a new model with a different name to avoid conflicts
// We're using DailyDeliveryOrder instead of DailyOrder to avoid any model caching issues
let DailyDeliveryOrder: mongoose.Model<DailyOrderDocument>;
try {
  // Always create a new model to avoid schema conflicts
  console.log('Creating new DailyDeliveryOrder model');
  
  // Delete the model if it already exists
  if (mongoose.models.DailyDeliveryOrder) {
    delete mongoose.models.DailyDeliveryOrder;
  }
  
  // Create the new model
  DailyDeliveryOrder = mongoose.model<DailyOrderDocument>('DailyDeliveryOrder', DailyDeliveryOrderSchema);
} catch (error) {
  console.error('Error creating DailyDeliveryOrder model:', error);
  throw error;
}

// In-memory store for idempotency (should use Redis in production)
const idempotencyStore = new Map<string, any>();

// POST handler - create a new daily order
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
    // Parse request body
    const data = await request.json();
    
    // Check for idempotency key
    const idempotencyKey = data.idempotencyKey;
    if (idempotencyKey) {
      // Check if we've already processed this request
      if (idempotencyStore.has(idempotencyKey)) {
        const cachedResponse = idempotencyStore.get(idempotencyKey);
        console.log(`Idempotent request detected: ${idempotencyKey}, returning cached response`);
        return NextResponse.json(cachedResponse, { status: 200 });
      }
    }
    
    // Debug logs
    console.log('Request data received:', JSON.stringify(data));
    console.log('Items type:', typeof data.items);
    console.log('Items value:', JSON.stringify(data.items));
    
    // If items is a string, try to parse it
    if (typeof data.items === 'string') {
      try {
        data.items = JSON.parse(data.items);
        console.log('Parsed items from string:', JSON.stringify(data.items));
      } catch (parseError) {
        console.error('Failed to parse items string:', parseError);
      }
    }
    
    const effectiveUserId =
      actor.role === 'admin' && data.userId
        ? data.userId
        : String(actor.user._id);

    if (
      actor.role !== 'admin' &&
      data.userId &&
      String(data.userId) !== String(actor.user._id) &&
      String(data.userId) !== String(actor.user.userID)
    ) {
      return NextResponse.json(
        { success: false, error: 'You cannot create orders for another user' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!effectiveUserId || !data.items || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findById(effectiveUserId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Calculate total vouchers needed by type
    const vouchersNeeded = data.items.reduce(
      (totals: { twoDish: number, threeDish: number }, item: any) => {
        if (item.voucherType === 'twoDish') {
          totals.twoDish += item.quantity;
        } else if (item.voucherType === 'threeDish') {
          totals.threeDish += item.quantity;
        }
        return totals;
      },
      { twoDish: 0, threeDish: 0 }
    );
    
    // Check if user has enough vouchers
    if (user.twoDishVoucher < vouchersNeeded.twoDish || user.threeDishVoucher < vouchersNeeded.threeDish) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient vouchers', 
          required: vouchersNeeded,
          available: {
            twoDish: user.twoDishVoucher,
            threeDish: user.threeDishVoucher
          }
        },
        { status: 400 }
      );
    }
    
    // Generate a unique order ID
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000); // 8-digit number
    const orderId = `DD-${randomNumbers}`;
    
    // Calculate total vouchers needed for the order
    const totalVouchers = {
      twoDish: vouchersNeeded.twoDish,
      threeDish: vouchersNeeded.threeDish
    };

    // Ensure items is a proper array of objects with the correct structure
    let itemsToSave = [];
    
    // Debug the items before processing
    console.log('Original items data:', typeof data.items, Array.isArray(data.items));
    
    // Process the items data carefully
    if (Array.isArray(data.items)) {
      // Map each item to ensure it has the correct structure
      itemsToSave = data.items.map((item: RequestItem) => ({
        day: String(item.day || ''),
        date: String(item.date || ''),
        comboId: String(item.comboId || ''),
        comboName: String(item.comboName || ''),
        type: String(item.type || ''),
        quantity: Number(item.quantity || 0),
        voucherType: String(item.voucherType || ''),
        dishes: Array.isArray(item.dishes) ? item.dishes : [] // Include dishes in the saved order
      }));
      
      console.log('Processed items array:', itemsToSave.length, 'items');
    } else {
      console.error('Items is not an array:', data.items);
      return NextResponse.json(
        { success: false, error: 'Items must be an array' },
        { status: 400 }
      );
    }
    
    // Log the processed items
    console.log('Items to save:', JSON.stringify(itemsToSave));
    
    // Create and save the order directly
    let dailyOrder;
    try {
      console.log('Creating order with new approach');
      
      // Create the order directly
      dailyOrder = await DailyDeliveryOrder.create({
        userId: user._id,
        orderId,
        // Store items as a plain object/array
        items: itemsToSave,
        status: 'pending',
        voucherCost: totalVouchers,
        taxIncluded: data.taxIncluded || true,
        taxRate: data.taxRate || 0.13, // 13% tax rate
        specialInstructions: data.specialInstructions || '',
        deliveryAddress: data.deliveryAddress || {},
        phoneNumber: data.phoneNumber || '',
        area: data.area || ''
      });
      
      console.log('Order created successfully:', dailyOrder._id);
    } catch (error: any) {
      console.error('Error creating order:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create order', details: error.message || 'Unknown error' },
        { status: 500 }
      );
    }
      
    // Deduct vouchers from user and update phone number if provided
    const updateFields: any = {
      $inc: { 
        twoDishVoucher: -vouchersNeeded.twoDish,
        threeDishVoucher: -vouchersNeeded.threeDish
      }
    };
    
    // Update phone number if provided in order
    if (data.phoneNumber && data.phoneNumber.trim()) {
      updateFields.$set = { phone: data.phoneNumber.trim() };
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateFields,
      { new: true }
    );
    
    // Prepare response BEFORE sending emails
    const responseData = { 
      success: true, 
      data: dailyOrder,
      remainingVouchers: {
        twoDish: updatedUser.twoDishVoucher,
        threeDish: updatedUser.threeDishVoucher
      }
    };
    
    // Store in idempotency cache (expires after 1 hour)
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, responseData);
      // Auto-delete after 1 hour to prevent memory leak
      setTimeout(() => {
        idempotencyStore.delete(idempotencyKey);
      }, 3600000);
    }
    
    // ✅ SKIP individual order confirmation emails
    // Summary email will be sent from frontend after all orders are placed
    console.log('⏭️ Skipping individual order confirmation email (summary email will be sent after all orders)');
    
    // ✅ SKIP individual admin notification emails
    // Admin summary email will be sent from frontend after all orders are placed
    console.log('⏭️ Skipping individual admin notification email (admin summary email will be sent after all orders)');

    // Return response after email attempt (or timeout)
    return NextResponse.json(
      responseData,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing daily order:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to process order' },
      { status: 500 }
    );
  }
}

// GET handler - get all orders for the current user
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
    // Get query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    if (!userId && actor.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (
      actor.role !== 'admin' &&
      userId &&
      String(userId) !== String(actor.user._id) &&
      String(userId) !== String(actor.user.userID)
    ) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to these orders' },
        { status: 403 }
      );
    }

    if (!userId && actor.role === 'admin') {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Build query
    const query: any = { userId };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Find orders for the user with pagination
    const orders = await DailyDeliveryOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const user = await User.findById(userId).select('name email').lean();
    const normalizedOrders = orders.map((order: any) => {
      const plain = typeof order.toObject === 'function' ? order.toObject() : order;
      const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(plain, user);
      return {
        ...plain,
        effectiveCustomerInfo,
        phoneNumber: effectiveCustomerInfo.phoneNumber,
        area: effectiveCustomerInfo.area,
        deliveryAddress: effectiveCustomerInfo.deliveryAddress,
        specialInstructions: effectiveCustomerInfo.specialInstructions
      };
    });
    
    // Get total count for pagination
    const totalOrders = await DailyDeliveryOrder.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: {
        orders: normalizedOrders,
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching daily orders:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}
