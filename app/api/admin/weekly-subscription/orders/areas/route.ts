import { NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas';

// GET handler - get all unique areas from orders
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();

    // Use canonical area list only (single source of truth).
    // This prevents legacy/duplicate DB values (case variants, old names) from leaking into UI.
    const areas = [...ALL_WEEKLY_AREAS];
    
    return NextResponse.json({
      success: true,
      areas
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/admin/weekly-subscription/orders/areas');
  }
}
