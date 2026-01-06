import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Dish from '@/models/Dish';

// GET a specific dish by name
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    await connectToDatabase();
    
    const dish = await Dish.findOne({ name: decodeURIComponent(name) });
    
    if (!dish) {
      return NextResponse.json(
        { success: false, error: 'Dish not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: dish });
  } catch (error) {
    console.error('Error fetching dish:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update a dish's English translation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const data = await request.json();
    await connectToDatabase();
    
    const dish = await Dish.findOneAndUpdate(
      { name: decodeURIComponent(name) },
      { nameEn: data.nameEn },
      { new: true, upsert: true, runValidators: true }
    );
    
    if (!dish) {
      return NextResponse.json(
        { success: false, error: 'Dish not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: dish });
  } catch (error) {
    console.error('Error updating dish:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

