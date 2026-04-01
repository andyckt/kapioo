import { errorJson, handleRouteError, successJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyDeliveryHistory from '@/models/WeeklyDeliveryHistory';

// DELETE: Delete a specific history entry
export async function DELETE(_request: Request, { params }: RouteContext<{ historyId: string }>) {
  let historyId = '';
  try {
    const { actor, response } = await requireAdminMfa(_request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    ({ historyId } = await params);

    const history = await WeeklyDeliveryHistory.findOneAndDelete({ historyId });

    if (!history) {
      return errorJson('History entry not found', 404);
    }

    return successJson({});
  } catch (error: unknown) {
    return handleRouteError(error, `DELETE /api/weekly-delivery-history/${historyId || '[historyId]'}`);
  }
}
