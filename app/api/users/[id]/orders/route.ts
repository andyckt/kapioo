import { NextResponse } from 'next/server';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import { annotateLegacyOrderRoute, LEGACY_ORDER_DOMAIN } from '@/lib/orders/domain-contract';

// Interface for route params
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

function legacyOrderJson(body: unknown, init?: ResponseInit) {
  return annotateLegacyOrderRoute(
    NextResponse.json(body, init),
    LEGACY_ORDER_DOMAIN.userListRoute
  );
}

// GET handler - legacy route retired in Phase 2E
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { actor, response } = await requireSelfOrAdmin(id);
  if (!actor || response) {
    return annotateLegacyOrderRoute(response!, LEGACY_ORDER_DOMAIN.userListRoute);
  }

  void request;
  return legacyOrderJson(
    {
      success: false,
      error: 'Legacy user order listing has been retired. Use /api/daily-delivery/order?userId=[id] instead.',
    },
    { status: 410 }
  );
} 