import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PromoCode from '@/models/PromoCode';
import PromoCodeRedemption from '@/models/PromoCodeRedemption';
import { normalizePromoCode } from '@/lib/promo-code';

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const active = url.searchParams.get('active');
    const query: Record<string, unknown> = {};

    if (active === 'true') query.active = true;
    if (active === 'false') query.active = false;

    const promoCodes = await PromoCode.find(query).sort({ createdAt: -1 }).lean();

    const promoIds = promoCodes.map((promo) => promo._id);
    const usageRows = await PromoCodeRedemption.aggregate([
      { $match: { promoCodeId: { $in: promoIds } } },
      { $group: { _id: '$promoCodeId', count: { $sum: 1 } } }
    ]);

    const usageMap = new Map<string, number>(
      usageRows.map((row) => [String(row._id), row.count as number])
    );

    const data = promoCodes.map((promo) => ({
      ...promo,
      usageCountFromRedemptions: usageMap.get(String(promo._id)) || 0
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promo codes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const code = normalizePromoCode(body.code);
    const discountType = body.discountType;
    const discountValue = Number(body.discountValue);

    if (!code || !discountType || Number.isNaN(discountValue)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid discount type' },
        { status: 400 }
      );
    }

    if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
      return NextResponse.json(
        { success: false, error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (discountType === 'fixed' && discountValue <= 0) {
      return NextResponse.json(
        { success: false, error: 'Fixed discount must be greater than 0' },
        { status: 400 }
      );
    }

    const existing = await PromoCode.findOne({ code });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Promo code already exists' },
        { status: 409 }
      );
    }

    const promoCode = new PromoCode({
      code,
      description: body.description || '',
      discountType,
      discountValue,
      currency: 'CAD',
      active: body.active !== false,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      maxUses: body.maxUses ? Number(body.maxUses) : undefined,
      usageCount: 0,
      oneUsePerUser: body.oneUsePerUser !== false,
      promoOnlyEmt: body.promoOnlyEmt === true,
      appliesTo: body.appliesTo || 'all'
    });

    await promoCode.save();

    return NextResponse.json({
      success: true,
      data: promoCode
    });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create promo code' },
      { status: 500 }
    );
  }
}
