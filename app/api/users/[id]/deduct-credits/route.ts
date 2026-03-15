import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';

// Interface for route params
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST handler - legacy route retired in Phase 2E
export async function POST(request: Request, { params }: RouteParams) {
  const { actor, response } = await requireAdminMfa(request);
  if (!actor || response) {
    return response;
  }

  void params;
  return NextResponse.json(
    {
      success: false,
      error: 'This route has been retired. Use /api/users/[id]/update-balance instead.',
    },
    { status: 410 }
  );
}