import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Day from '@/models/Day';

export async function GET(
  request: Request,
  { params }: { params: { dayId: string } }
) {
  try {
    await connectToDatabase();
    const { dayId } = params;
    const day = await Day.findOne({ dayId });
    
    if (!day) {
      return NextResponse.json(
        { success: false, error: 'Day not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: day });
  } catch (error) {
    console.error('Error fetching day:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { dayId: string } }
) {
  try {
    await connectToDatabase();
    const { dayId } = params;
    const data = await request.json();
    
    const day = await Day.findOneAndUpdate(
      { dayId },
      data,
      { new: true, runValidators: true }
    );
    
    if (!day) {
      return NextResponse.json(
        { success: false, error: 'Day not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: day });
  } catch (error) {
    console.error('Error updating day:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { dayId: string } }
) {
  try {
    await connectToDatabase();
    const { dayId } = params;
    
    // Find and delete the day
    const day = await Day.findOneAndDelete({ dayId });
    
    if (!day) {
      return NextResponse.json(
        { success: false, error: 'Day not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting day:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
