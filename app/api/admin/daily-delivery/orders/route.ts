import { NextResponse } from 'next/server';
import { handleRouteError, parseSearchParams } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { adminDailyOrdersQuerySchema } from '@/lib/contracts/daily-order';
import connectToDatabase from '@/lib/db';
import { buildAdminDailyOrdersMongoQuery } from '@/lib/orders/admin-daily-query';
import { enrichAdminOrderResponse } from '@/lib/orders/admin-order-response';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';

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
      .lean();
    
    // Get total count for pagination
    const totalOrders = await DailyDeliveryOrder.countDocuments(query);
    
    // Fetch user information for each order
    const ordersWithUserInfo = await Promise.all(
      orders.map(async (order) => enrichAdminOrderResponse(order))
    );
    
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
