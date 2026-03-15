import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { annotateLegacyOrderRoute, LEGACY_ORDER_DOMAIN } from '@/lib/orders/domain-contract';

function legacyOrderJson(body: unknown, init?: ResponseInit) {
  return annotateLegacyOrderRoute(
    NextResponse.json(body, init),
    LEGACY_ORDER_DOMAIN.listRoute
  );
}

// GET handler - legacy route retired in Phase 2E
export async function GET(request: Request) {
  const { actor, response } = await requireUser();
  if (!actor || response) {
    return annotateLegacyOrderRoute(response!, LEGACY_ORDER_DOMAIN.listRoute);
  }

  void request;
  return legacyOrderJson(
    {
      success: false,
      error: 'Legacy order listing has been retired. Use /api/daily-delivery/order instead.',
    },
    { status: 410 }
  );
}

// POST handler - legacy route retired in Phase 2B
export async function POST(request: Request) {
  void request;
  return legacyOrderJson(
    {
      success: false,
      error: 'Legacy order creation has been retired. Use /api/daily-delivery/order instead.',
    },
    { status: 410 }
  );
}