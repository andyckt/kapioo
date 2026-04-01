import { handleRouteError, parseJsonBody, parseSearchParams, successJson } from '@/lib/api';
import {
  weeklyDeliveryHistoryCreateBodySchema,
  weeklyDeliveryHistoryListQuerySchema,
} from '@/lib/contracts/admin-history';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyDeliveryHistory from '@/models/WeeklyDeliveryHistory';

// GET: Fetch all history entries
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(request, weeklyDeliveryHistoryListQuerySchema);
    if (queryError) {
      return queryError;
    }

    await connectToDatabase();

    const limit = query.limit ?? 50;
    const { reason } = query;

    // Build query
    const dbQuery: Record<string, unknown> = {};
    if (reason) {
      dbQuery.archivedReason = reason;
    }

    const history = await WeeklyDeliveryHistory.find(dbQuery).sort({ archivedAt: -1 }).limit(limit);

    return successJson(history);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/weekly-delivery-history');
  }
}

// POST: Create new history entry
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { data, error } = await parseJsonBody(request, weeklyDeliveryHistoryCreateBodySchema);
    if (error) {
      return error;
    }

    const history = await WeeklyDeliveryHistory.create(data);
    return successJson(history, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/weekly-delivery-history');
  }
}
