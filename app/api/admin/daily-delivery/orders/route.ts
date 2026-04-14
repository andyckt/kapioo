import { NextResponse } from 'next/server';
import { handleRouteError, parseSearchParams } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { adminDailyOrdersQuerySchema } from '@/lib/contracts/daily-order';
import connectToDatabase from '@/lib/db';
import { buildAdminDailyOrdersMongoQuery } from '@/lib/orders/admin-daily-query';
import User from '@/models/User';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
} from '@/lib/orders/effective-customer-info';

// GET handler - get all orders with pagination and filtering
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    const { data, error } = parseSearchParams(request, adminDailyOrdersQuerySchema);
    if (error) {
      return error;
    }

    const page = data.page ?? 1;
    const limit = data.limit ?? 10;
    const skip = (page - 1) * limit;

    const query = await buildAdminDailyOrdersMongoQuery(data);
    
    // Find orders with pagination
    const orders = await DailyDeliveryOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email phoneNumber')
      .lean();
    
    // Get total count for pagination
    const totalOrders = await DailyDeliveryOrder.countDocuments(query);
    
    // Fetch user information for each order
    const ordersWithUserInfo = await Promise.all(orders.map(async (order) => {
      try {
        const user = (await User.findById(order.userId).select('name email').lean()) as
          | { _id?: unknown; name?: string; email?: string }
          | null;
        const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(order, user);
        return {
          ...order,
          user,
          effectiveCustomerInfo,
          hasOrderOnlyOverride: hasOrderCustomerOverride(order),
          orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order)
        };
      } catch {
        return {
          ...order,
          user: null,
          effectiveCustomerInfo: resolveEffectiveOrderCustomerInfo(order, null),
          hasOrderOnlyOverride: hasOrderCustomerOverride(order),
          orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order)
        };
      }
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        orders: ordersWithUserInfo,
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/admin/daily-delivery/orders');
  }
}
