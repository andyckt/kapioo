import { errorJson, handleRouteError, successJson, type RouteContext } from '@/lib/api';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import { findUserByIdentifier } from '@/lib/api/users';
import connectToDatabase from '@/lib/db';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';
import WeeklyOrder from '@/models/WeeklyOrder';

// GET handler - get order count for a specific user
export async function GET(request: Request, { params }: RouteContext<{ id: string }>) {
  const { id } = await params;
  try {
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
    
    const [dailyCount, weeklyCount] = await Promise.all([
      DailyDeliveryOrder.countDocuments({ userId: user._id }),
      WeeklyOrder.countDocuments({ userId: user._id }),
    ]);
    const count = dailyCount + weeklyCount;
    
    return successJson({
      count
    });
  } catch (error: unknown) {
    return handleRouteError(error, `GET /api/users/${id}/order-count`);
  }
} 