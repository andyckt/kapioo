import { handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { dayBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Day from '@/models/Day';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Parse query parameters
    const url = new URL(request.url);
    const isActiveParam = url.searchParams.get('isActive');
    
    // Build query
    const query: Record<string, unknown> = {};
    if (isActiveParam !== null) {
      query.isActive = isActiveParam === 'true';
    }
    
    const days = await Day.find(query).sort({ week: 1 });
    return successJson(days);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/days');
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { data, error } = await parseJsonBody(request, dayBodySchema);
    if (error) {
      return error;
    }
    
    const day = await Day.create(data);
    return successJson(day, 201);
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/days');
  }
}
