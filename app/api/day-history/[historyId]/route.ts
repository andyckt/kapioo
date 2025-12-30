import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import DayHistory from '@/models/DayHistory';

export async function GET(
  request: Request,
  { params }: { params: { historyId: string } }
) {
  try {
    await connectToDatabase();
    const { historyId } = params;
    const history = await DayHistory.findOne({ historyId });
    
    if (!history) {
      return NextResponse.json(
        { success: false, error: 'History entry not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching history entry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { historyId: string } }
) {
  try {
    await connectToDatabase();
    const { historyId } = params;
    
    const history = await DayHistory.findOneAndDelete({ historyId });
    
    if (!history) {
      return NextResponse.json(
        { success: false, error: 'History entry not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting history entry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

