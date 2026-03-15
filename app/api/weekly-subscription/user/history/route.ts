import { NextResponse } from 'next/server';
import { requireAdminMfa, requireUser } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { buildWeeklyEntitlementSummary } from '@/lib/orders/weekly-entitlement-display';
import WeeklyOrder from '@/models/WeeklyOrder';
import WeeklyEntitlementGroup from '@/models/WeeklyEntitlementGroup';
import User from '@/models/User';
import mongoose from 'mongoose';
import { resolveEffectiveOrderCustomerInfo } from '@/lib/orders/effective-customer-info';

// GET handler - get user's weekly subscription order history
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Get user ID from session or query parameter
    const userIdParam = url.searchParams.get('userId');
    
    if (!userIdParam) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (
      actor.role !== 'admin' &&
      String(userIdParam) !== String(actor.user._id) &&
      String(userIdParam) !== String(actor.user.userID)
    ) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this subscription history' },
        { status: 403 }
      );
    }

    if (
      actor.role === 'admin' &&
      String(userIdParam) !== String(actor.user._id) &&
      String(userIdParam) !== String(actor.user.userID)
    ) {
      const { response: adminMfaResponse } = await requireAdminMfa(request);
      if (adminMfaResponse) {
        return adminMfaResponse;
      }
    }
    
    await connectToDatabase();
    
    // Check if user exists
    const user = await User.findById(userIdParam);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find orders for this user with pagination
    const orders = await WeeklyOrder.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const groupIds = Array.from(
      new Set(
        orders
          .map((order: any) => order.weeklyEntitlementGroupId)
          .filter((groupId: unknown): groupId is string => typeof groupId === 'string' && groupId.length > 0)
      )
    );

    const entitlementGroups = groupIds.length > 0
      ? await WeeklyEntitlementGroup.find({ groupId: { $in: groupIds } }).lean()
      : [];
    const entitlementGroupMap = new Map(
      entitlementGroups.map((group: any) => [String(group.groupId), group])
    );

    const normalizedOrders = orders.map((order: any) => {
      const plain = typeof order.toObject === 'function' ? order.toObject() : order;
      const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(plain, user);
      const weeklyEntitlementSummary = buildWeeklyEntitlementSummary(
        plain,
        entitlementGroupMap.get(String(plain.weeklyEntitlementGroupId || ''))
      );
      return {
        ...plain,
        effectiveCustomerInfo,
        weeklyEntitlementSummary,
        phoneNumber: effectiveCustomerInfo.phoneNumber,
        area: effectiveCustomerInfo.area,
        deliveryAddress: effectiveCustomerInfo.deliveryAddress,
        specialInstructions: effectiveCustomerInfo.specialInstructions
      };
    });
    
    // Get total count for pagination
    const totalOrders = await WeeklyOrder.countDocuments({ userId: user._id });
    
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
    console.error('Error fetching weekly subscription history:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription history',
        details: error.message
      },
      { status: 500 }
    );
  }
}