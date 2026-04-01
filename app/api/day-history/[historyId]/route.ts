import { errorJson, handleRouteError, successJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import DayHistory from '@/models/DayHistory';

export async function GET(_request: Request, { params }: RouteContext<{ historyId: string }>) {
  let historyId = '';
  try {
    const { actor, response } = await requireAdminMfa(_request);
    if (!actor || response) {
      return response;
    }

    ({ historyId } = await params);

    await connectToDatabase();
    const history = await DayHistory.findOne({ historyId });

    if (!history) {
      return errorJson('History entry not found', 404);
    }

    return successJson(history);
  } catch (error: unknown) {
    return handleRouteError(error, `GET /api/day-history/${historyId || '[historyId]'}`);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext<{ historyId: string }>) {
  let historyId = '';
  try {
    const { actor, response } = await requireAdminMfa(_request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    ({ historyId } = await params);

    const history = await DayHistory.findOneAndDelete({ historyId });

    if (!history) {
      return errorJson('History entry not found', 404);
    }

    return successJson({});
  } catch (error: unknown) {
    return handleRouteError(error, `DELETE /api/day-history/${historyId || '[historyId]'}`);
  }
}
