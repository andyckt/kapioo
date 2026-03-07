import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import Dish from '@/models/Dish';

// GET all dishes
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const dishes = await Dish.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: dishes });
  } catch (error) {
    console.error('Error fetching dishes:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create or update a dish (upsert)
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json(
        { success: false, error: 'Dish name is required' },
        { status: 400 }
      );
    }
    
    // Upsert: Create if not exists, update if exists
    const dish = await Dish.findOneAndUpdate(
      { name: data.name },
      { 
        name: data.name,
        nameEn: data.nameEn || undefined
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    );
    
    return NextResponse.json({ success: true, data: dish }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating dish:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

