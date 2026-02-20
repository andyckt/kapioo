import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import PromoCode from '@/models/PromoCode';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const promo = await PromoCode.findById(id).lean();

    if (!promo) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: promo });
  } catch (error: any) {
    console.error('Error fetching promo code:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch promo code' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid promo code id' }, { status: 400 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      'description',
      'active',
      'discountType',
      'discountValue',
      'startsAt',
      'expiresAt',
      'maxUses',
      'oneUsePerUser',
      'promoOnlyEmt',
      'appliesTo'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.startsAt) updateData.startsAt = new Date(updateData.startsAt as string);
    if (updateData.expiresAt) updateData.expiresAt = new Date(updateData.expiresAt as string);
    if (updateData.maxUses !== undefined && updateData.maxUses !== null) {
      updateData.maxUses = Number(updateData.maxUses);
    }
    if (updateData.discountValue !== undefined) {
      updateData.discountValue = Number(updateData.discountValue);
    }

    const updated = await PromoCode.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ success: false, error: 'Failed to update promo code' }, { status: 500 });
  }
}
