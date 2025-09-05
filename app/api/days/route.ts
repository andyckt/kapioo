import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Day from '@/models/Day';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Parse query parameters
    const url = new URL(request.url);
    const isActiveParam = url.searchParams.get('isActive');
    
    // Build query
    const query: any = {};
    if (isActiveParam !== null) {
      query.isActive = isActiveParam === 'true';
    }
    
    const days = await Day.find(query).sort({ week: 1 });
    return NextResponse.json({ success: true, data: days });
  } catch (error) {
    console.error('Error fetching days:', error);
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
    if (!data.dayId || !data.displayName || !data.date || !data.week) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const day = await Day.create(data);
    return NextResponse.json({ success: true, data: day }, { status: 201 });
  } catch (error) {
    console.error('Error creating day:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
