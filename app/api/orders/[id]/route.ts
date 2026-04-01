import { NextResponse } from 'next/server';
import type { RouteContext } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import { annotateLegacyOrderRoute, LEGACY_ORDER_DOMAIN } from '@/lib/orders/domain-contract';

function legacyOrderJson(body: unknown, init?: ResponseInit) {
  return annotateLegacyOrderRoute(
    NextResponse.json(body, init),
    LEGACY_ORDER_DOMAIN.detailRoute
  );
}

// GET handler - legacy route retired in Phase 2E
export async function GET(request: Request, { params }: RouteContext<{ id: string }>) {
  const { actor, response } = await requireUser();
  if (!actor || response) {
    return annotateLegacyOrderRoute(response!, LEGACY_ORDER_DOMAIN.detailRoute);
  }

  void request;
  void params;
  return legacyOrderJson(
    {
      success: false,
      error: 'Legacy order detail lookup has been retired. Use /api/daily-delivery/order/[id] instead.',
    },
    { status: 410 }
  );
}

// PATCH handler - update order status
export async function PATCH(request: Request, { params }: RouteContext<{ id: string }>) {
  void request;
  void params;
  return legacyOrderJson(
    {
      success: false,
      error: 'Legacy order updates have been retired. Use /api/admin/daily-delivery/orders/[id]/status instead.',
    },
    { status: 410 }
  );
} 