import { errorJson, handleRouteError, successJson, type RouteContext } from '@/lib/api';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import { findUserByIdentifier } from '@/lib/api/users';
import connectToDatabase from '@/lib/db';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';

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
    
    // Count total daily orders for the user
    const dailyOrdersCount = await DailyDeliveryOrder.countDocuments({ userId: user._id });
    
    return successJson({
      count: dailyOrdersCount
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/users/[id]/daily-orders/count');
  }
}
