import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyDeliveryHistory from '@/models/WeeklyDeliveryHistory';

// GET: Fetch all history entries
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const reason = url.searchParams.get('reason');
    
    // Build query
    const query: any = {};
    if (reason) {
      query.archivedReason = reason;
    }
    
    const history = await WeeklyDeliveryHistory.find(query)
      .sort({ archivedAt: -1 })
      .limit(limit);
    
    return NextResponse.json({ 
      success: true, 
      data: history 
    });
  } catch (error) {
    console.error('Error fetching weekly delivery history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// POST: Create new history entry
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const data = await request.json();
    
    // Validate required fields
    if (!data.historyId || !data.originalDay || data.originalWeekOffset === undefined || !data.date || !data.archivedReason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const history = await WeeklyDeliveryHistory.create(data);
    return NextResponse.json({ success: true, data: history }, { status: 201 });
  } catch (error) {
    console.error('Error creating weekly delivery history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

