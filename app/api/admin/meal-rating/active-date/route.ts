import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'date is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }
    if (!DATE_REGEX.test(date)) {
      return NextResponse.json(
        { error: 'date must be YYYY-MM-DD' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await Settings.findOneAndUpdate(
      { key: 'mealRatingActiveDate' },
      { key: 'mealRatingActiveDate', value: date, description: 'Date shown on meal rating form (admin-selected)' },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, date });
  } catch (error) {
    console.error('[admin/meal-rating/active-date] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update active date' },
      { status: 500 }
    );
  }
}
