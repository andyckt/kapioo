import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Combo from '@/models/Combo';

export async function GET(
  request: Request,
  { params }: { params: { comboId: string } }
) {
  try {
    await connectToDatabase();
    const { comboId } = params;
    const combo = await Combo.findOne({ comboId });
    
    if (!combo) {
      return NextResponse.json(
        { success: false, error: 'Combo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: combo });
  } catch (error) {
    console.error('Error fetching combo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { comboId: string } }
) {
  try {
    await connectToDatabase();
    const { comboId } = params;
    const data = await request.json();
    
    const combo = await Combo.findOneAndUpdate(
      { comboId },
      data,
      { new: true, runValidators: true }
    );
    
    if (!combo) {
      return NextResponse.json(
        { success: false, error: 'Combo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: combo });
  } catch (error) {
    console.error('Error updating combo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { comboId: string } }
) {
  try {
    await connectToDatabase();
    const { comboId } = params;
    
    const combo = await Combo.findOneAndDelete({ comboId });
    
    if (!combo) {
      return NextResponse.json(
        { success: false, error: 'Combo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting combo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
