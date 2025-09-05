import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Combo from '@/models/Combo';

export async function GET(
  request: Request,
  { params }: { params: { dayId: string } }
) {
  try {
    await connectToDatabase();
    const { dayId } = params;
    const combos = await Combo.find({ dayId });
    
    return NextResponse.json({ success: true, data: combos });
  } catch (error) {
    console.error('Error fetching combos for day:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
