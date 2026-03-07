import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import RatingDish from '@/models/RatingDish';

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const dishes = await RatingDish.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json(dishes);
  } catch (error) {
    console.error('[admin/rating-dishes] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dishes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const body = await request.json();
    const { name, nameEn, sortOrder = 0 } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const doc = await RatingDish.create({
      name: name.trim(),
      nameEn: typeof nameEn === 'string' ? nameEn.trim() || undefined : undefined,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      active: true,
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error('[admin/rating-dishes] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add dish' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await connectToDatabase();

    const doc = await RatingDish.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );
    if (!doc) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/rating-dishes] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dish' },
      { status: 500 }
    );
  }
}
