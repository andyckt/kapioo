import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import DayHistory from '@/models/DayHistory';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const reason = url.searchParams.get('reason');
    
    // Build query
    const query: any = {};
    if (reason) {
      query.archivedReason = reason;
    }
    
    // Fetch history with pagination, sorted by most recent first
    const history = await DayHistory.find(query)
      .sort({ archivedAt: -1 })
      .limit(limit)
      .skip(skip);
    
    // Get total count for pagination
    const total = await DayHistory.countDocuments(query);
    
    return NextResponse.json({ 
      success: true, 
      data: history,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + history.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching day history:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Validate required fields
    if (!data.historyId || !data.originalDayId || !data.displayName || !data.date || !data.week || !data.archivedReason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const historyEntry = await DayHistory.create(data);
    return NextResponse.json({ success: true, data: historyEntry }, { status: 201 });
  } catch (error) {
    console.error('Error creating day history:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

