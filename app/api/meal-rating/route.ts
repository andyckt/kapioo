import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MealRating from '@/models/MealRating';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deliveryDate, overallRating, dishRatings = [], comment, userEmail } = body;

    if (!deliveryDate || typeof deliveryDate !== 'string') {
      return NextResponse.json(
        { error: 'deliveryDate is required' },
        { status: 400 }
      );
    }
    if (!DATE_REGEX.test(deliveryDate)) {
      return NextResponse.json(
        { error: 'deliveryDate must be YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (typeof overallRating !== 'number' || overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { error: 'overallRating must be 1-5' },
        { status: 400 }
      );
    }

    const validDishRatings = Array.isArray(dishRatings)
      ? dishRatings
          .filter(
            (r: any) =>
              r &&
              typeof r.dishId === 'string' &&
              typeof r.dishName === 'string' &&
              typeof r.rating === 'number' &&
              r.rating >= 1 &&
              r.rating <= 5
          )
          .map((r: any) => ({
            dishId: r.dishId,
            dishName: r.dishName,
            rating: r.rating,
            comment: typeof r.comment === 'string' && r.comment.trim() ? r.comment.trim() : undefined,
          }))
      : [];

    await connectToDatabase();

    let storedUserEmail: string | undefined;
    if (typeof userEmail === 'string') {
      const trimmed = userEmail.trim();
      if (
        trimmed &&
        trimmed.length <= EMAIL_MAX_LENGTH &&
        EMAIL_REGEX.test(trimmed)
      ) {
        storedUserEmail = trimmed;
      }
    }

    const doc = await MealRating.create({
      overallRating,
      deliveryDate,
      dishRatings: validDishRatings,
      comment: typeof comment === 'string' ? comment.trim() || undefined : undefined,
      userEmail: storedUserEmail,
      submittedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      id: doc._id,
    });
  } catch (error) {
    console.error('[meal-rating] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}
