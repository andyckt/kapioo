import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas';

// GET handler - get all unique areas from orders
export async function GET(request: Request) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
    await connectToDatabase();

    // Use canonical area list only (single source of truth).
    // This prevents legacy/duplicate DB values (case variants, old names) from leaking into UI.
    const areas = [...ALL_WEEKLY_AREAS];
    
    return NextResponse.json({
      success: true,
      areas
    });
  } catch (error) {
    console.error('Error fetching unique areas:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch areas' },
      { status: 500 }
    );
  }
}
