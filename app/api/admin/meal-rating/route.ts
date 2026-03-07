import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import MealRating from '@/models/MealRating';

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (startDate || endDate) {
      filter.deliveryDate = {};
      if (startDate) (filter.deliveryDate as Record<string, string>).$gte = startDate;
      if (endDate) (filter.deliveryDate as Record<string, string>).$lte = endDate;
    }

    const [items, total] = await Promise.all([
      MealRating.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit).lean(),
      MealRating.countDocuments(filter),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[admin/meal-rating] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
