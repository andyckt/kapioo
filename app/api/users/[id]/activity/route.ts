import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Transaction from '@/models/Transaction';
import CreditPurchaseRequest from '@/models/CreditPurchaseRequest';
import VoucherPurchaseRequest from '@/models/VoucherPurchaseRequest';
import Order from '@/models/Order';
import WeeklyOrder from '@/models/WeeklyOrder';
import mongoose from 'mongoose';

// Interface for route params
interface RouteParams {
  params: {
    id: string;
  };
}

// GET handler - get all activity for a specific user
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const activityType = url.searchParams.get('type') || 'all';
    const skip = (page - 1) * limit;
    
    await connectToDatabase();
    
    // Prepare userId for queries (support both ObjectId and string formats)
    let userIdQuery;
    if (mongoose.Types.ObjectId.isValid(id)) {
      userIdQuery = { 
        $or: [
          { userId: new mongoose.Types.ObjectId(id) },
          { userId: id }
        ]
      };
    } else {
      userIdQuery = { userId: id };
    }
    
    // Array to store all activities
    let activities = [];
    let totalCount = 0;
    
    // Fetch different types of activities based on the filter
    if (activityType === 'all' || activityType === 'transaction') {
      // Fetch transactions
      const transactions = await Transaction.find(userIdQuery)
        .sort({ createdAt: -1 });
      
      activities = activities.concat(transactions.map(t => ({
        ...t.toObject(),
        activityType: 'transaction',
        date: t.createdAt,
        title: `${t.type === 'Add' || t.type === 'credit' || t.type === 'refund' ? 'Added' : 'Used'} ${t.amount} credits`,
        details: t.description
      })));
    }
    
    if (activityType === 'all' || activityType === 'credit-request') {
      // Fetch credit purchase requests
      const creditRequests = await CreditPurchaseRequest.find(userIdQuery)
        .sort({ createdAt: -1 });
      
      activities = activities.concat(creditRequests.map(cr => ({
        ...cr.toObject(),
        activityType: 'credit-request',
        date: cr.createdAt,
        title: `Weekly Meal Plan Request (${cr.status})`,
        details: `Amount: $${cr.amount}, ${cr.mealPlanType ? `Plan: ${cr.mealPlanType}` : 'Credits requested'}`
      })));
    }
    
    if (activityType === 'all' || activityType === 'voucher-request') {
      // Fetch voucher purchase requests
      const voucherRequests = await VoucherPurchaseRequest.find(userIdQuery)
        .sort({ createdAt: -1 });
      
      activities = activities.concat(voucherRequests.map(vr => ({
        ...vr.toObject(),
        activityType: 'voucher-request',
        date: vr.createdAt,
        title: `${vr.type === 'twoDish' ? '2-Dish' : '3-Dish'} Voucher Request (${vr.status})`,
        details: `Quantity: ${vr.quantity}, Amount: $${vr.amount}`
      })));
    }
    
    if (activityType === 'all' || activityType === 'order') {
      // Fetch regular orders
      const orders = await Order.find(userIdQuery)
        .sort({ createdAt: -1 });
      
      activities = activities.concat(orders.map(o => ({
        ...o.toObject(),
        activityType: 'order',
        date: o.createdAt,
        title: `Daily Delivery Order (${o.status})`,
        details: `Order ID: ${o._id}, Items: ${o.items.length}`
      })));
    }
    
    if (activityType === 'all' || activityType === 'weekly-order') {
      // Fetch weekly orders
      const weeklyOrders = await WeeklyOrder.find(userIdQuery)
        .sort({ createdAt: -1 });
      
      activities = activities.concat(weeklyOrders.map(wo => ({
        ...wo.toObject(),
        activityType: 'weekly-order',
        date: wo.createdAt,
        title: `Weekly Subscription Order (${wo.status})`,
        details: `Order ID: ${wo.orderId}, Credits: ${wo.creditCost}`
      })));
    }
    
    // Sort all activities by date (newest first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Count total before pagination
    totalCount = activities.length;
    
    // Apply pagination
    const paginatedActivities = activities.slice(skip, skip + limit);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        activities: paginatedActivities,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error(`Error fetching user activity for ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}
