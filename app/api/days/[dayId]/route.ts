import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
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
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

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
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { dayId } = params;
    
    console.log('DELETE request received for dayId:', dayId);
    
    // First, check if the day exists
    const existingDay = await Day.findOne({ dayId });
    console.log('Day lookup result:', existingDay ? 'Found' : 'Not found');
    
    if (!existingDay) {
      // List all days to help debug
      const allDays = await Day.find({}, 'dayId displayName');
      console.log('All days in database:', allDays.map(d => ({ dayId: d.dayId, displayName: d.displayName })));
    }
    
    // Find and delete the day
    const day = await Day.findOneAndDelete({ dayId });
    
    if (!day) {
      return NextResponse.json(
        { success: false, error: 'Day not found' },
        { status: 404 }
      );
    }
    
    console.log('Day deleted successfully:', dayId);
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting day:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
