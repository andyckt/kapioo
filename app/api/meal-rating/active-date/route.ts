import { NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/api';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  try {
    await connectToDatabase();
    const setting = await Settings.findOne({ key: 'mealRatingActiveDate' });
    const date = setting?.value && typeof setting.value === 'string' && DATE_REGEX.test(setting.value)
      ? setting.value
      : null;
    return NextResponse.json({ date });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/meal-rating/active-date');
  }
}
