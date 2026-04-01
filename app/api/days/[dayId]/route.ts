import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { dayBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Day from '@/models/Day';

export async function GET(
  request: Request,
  { params }: RouteContext<{ dayId: string }>
) {
  try {
    await connectToDatabase();
    const { dayId } = await params;
    const day = await Day.findOne({ dayId });
    
    if (!day) {
      return errorJson('Day not found', 404);
    }
    
    return successJson(day);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/days/[dayId]');
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext<{ dayId: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { dayId } = await params;
    const { data, error } = await parseJsonBody(request, dayBodySchema.partial());
    if (error) {
      return error;
    }
    
    const day = await Day.findOneAndUpdate(
      { dayId },
      data,
      { new: true, runValidators: true }
    );
    
    if (!day) {
      return errorJson('Day not found', 404);
    }
    
    return successJson(day);
  } catch (error: unknown) {
    return handleRouteError(error, 'PUT /api/days/[dayId]');
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<{ dayId: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { dayId } = await params;
    
    console.log('DELETE request received for dayId:', dayId);
    
    // First, check if the day exists
    const existingDay = await Day.findOne({ dayId });
    console.log('Day lookup result:', existingDay ? 'Found' : 'Not found');
    
    if (!existingDay) {
      // List all days to help debug
      const allDays = await Day.find({}, 'dayId displayName');
      console.log('All days in database:', allDays.map(d => ({ dayId: d.dayId, displayName: d.displayName })));
    }
    
    // Find and delete the day
    const day = await Day.findOneAndDelete({ dayId });
    
    if (!day) {
      return errorJson('Day not found', 404);
    }
    
    console.log('Day deleted successfully:', dayId);
    return successJson({});
  } catch (error: unknown) {
    return handleRouteError(error, 'DELETE /api/days/[dayId]');
  }
}
