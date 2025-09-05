import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Combo from '@/models/Combo';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const combos = await Combo.find({});
    return NextResponse.json({ success: true, data: combos });
  } catch (error) {
    console.error('Error fetching combos:', error);
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
    if (!data.comboId || !data.dayId || !data.name || data.calories === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const combo = await Combo.create(data);
    return NextResponse.json({ success: true, data: combo }, { status: 201 });
  } catch (error) {
    console.error('Error creating combo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
