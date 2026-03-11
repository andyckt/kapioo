import { NextResponse } from 'next/server';
import { requireAdminMfa, requireUser } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyOrder from '@/models/WeeklyOrder';
import User from '@/models/User';
import mongoose from 'mongoose';
import { resolveEffectiveOrderCustomerInfo } from '@/lib/orders/effective-customer-info';

// Interface for route params (Next.js 15+: params is a Promise)
interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET handler - get a specific weekly order by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    // Find order by ID or orderId
    const order = await WeeklyOrder.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null },
        { orderId: id }
      ]
    });
    
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
    const { id } = await params;
    console.error(`Error fetching weekly order ${id}:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch order details',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PATCH handler - update a weekly order (e.g., change status)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    const data = await request.json();
    
    await connectToDatabase();
    
    // Find order by ID or orderId
    const order = await WeeklyOrder.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null },
        { orderId: id }
      ]
    });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Update only allowed fields
    const allowedUpdates = ['status', 'specialInstructions'];
    const updates: Record<string, any> = {};
    
    Object.keys(data).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = data[key];
      }
    });
    
    // Add refundedAt timestamp if status is being set to 'refunded'
    if (data.status === 'refunded' && order.status !== 'refunded') {
      updates.refundedAt = new Date();
    }
    
    // Update the order
    const updatedOrder = await WeeklyOrder.findByIdAndUpdate(
      order._id,
      { $set: updates },
      { new: true }
    );
    
    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error: any) {
    const { id } = await params;
    console.error(`Error updating weekly order ${id}:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update order',
        details: error.message
      },
      { status: 500 }
    );
  }
}
