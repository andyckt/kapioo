import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RatingDish from '@/models/RatingDish';

export async function GET() {
  try {
    await connectToDatabase();
    const dishes = await RatingDish.find({ active: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return NextResponse.json(dishes);
  } catch (error) {
    console.error('[meal-rating/dishes] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dishes' },
      { status: 500 }
    );
  }
}
