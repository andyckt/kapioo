import { errorJson, handleRouteError, successJson, type RouteContext } from '@/lib/api';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import { findUserByIdentifier } from '@/lib/api/users';
import connectToDatabase from '@/lib/db';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';
import WeeklyOrder from '@/models/WeeklyOrder';

export async function GET(
  request: Request,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
    // Check if user exists
    const user = await findUserByIdentifier(id);
    
    if (!user) {
      return errorJson('User not found', 404);
    }
    
    const [dailyOrdersCount, weeklyOrdersCount, upcomingDailyCount, upcomingWeeklyCount] = await Promise.all([
      DailyDeliveryOrder.countDocuments({ userId: user._id }),
      WeeklyOrder.countDocuments({ userId: user._id }),
      DailyDeliveryOrder.countDocuments({
        userId: user._id,
        status: { $in: ['pending', 'confirmed', 'delivery'] }
      }),
      WeeklyOrder.countDocuments({
        userId: user._id,
        status: { $in: ['pending', 'confirmed', 'delivery'] }
      }),
    ]);

    const totalOrdersCount = dailyOrdersCount + weeklyOrdersCount;
    const upcomingDeliveriesCount = upcomingDailyCount + upcomingWeeklyCount;
    
    return successJson({ 
        totalOrders: totalOrdersCount,
        upcomingDeliveries: upcomingDeliveriesCount
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/users/[id]/orders/count');
  }
} 