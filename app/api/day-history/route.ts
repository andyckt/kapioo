import { NextResponse } from 'next/server';

import { handleRouteError, parseJsonBody, parseSearchParams, successJson } from '@/lib/api';
import { dayHistoryCreateBodySchema, dayHistoryListQuerySchema } from '@/lib/contracts/admin-history';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import DayHistory from '@/models/DayHistory';

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(request, dayHistoryListQuerySchema);
    if (queryError) {
      return queryError;
    }

    await connectToDatabase();

    const limit = query.limit ?? 50;
    const skip = query.skip ?? 0;
    const { reason } = query;

    // Build query
    const dbQuery: Record<string, unknown> = {};
    if (reason) {
      dbQuery.archivedReason = reason;
    }

    // Fetch history with pagination, sorted by most recent first
    const history = await DayHistory.find(dbQuery).sort({ archivedAt: -1 }).limit(limit).skip(skip);

    // Get total count for pagination
    const total = await DayHistory.countDocuments(dbQuery);

    return NextResponse.json({
      success: true,
      data: history,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + history.length < total,
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/day-history');
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { data, error } = await parseJsonBody(request, dayHistoryCreateBodySchema);
    if (error) {
      return error;
    }

    const historyEntry = await DayHistory.create(data);
    return successJson(historyEntry, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/day-history');
  }
}
