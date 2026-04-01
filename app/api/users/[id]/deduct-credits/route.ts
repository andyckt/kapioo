import { errorJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';

// POST handler - legacy route retired in Phase 2E
export async function POST(request: Request, { params }: RouteContext<{ id: string }>) {
  const { actor, response } = await requireAdminMfa(request);
  if (!actor || response) {
    return response;
  }

  void params;
  return errorJson('This route has been retired. Use /api/users/[id]/update-balance instead.', 410);
}