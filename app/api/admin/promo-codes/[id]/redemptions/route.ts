import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import PromoCode from '@/models/PromoCode';
import PromoCodeRedemption from '@/models/PromoCodeRedemption';
import CreditPurchaseRequest from '@/models/CreditPurchaseRequest';
import VoucherPurchaseRequest from '@/models/VoucherPurchaseRequest';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid promo code id' }, { status: 400 });
    }

    const promo = await PromoCode.findById(id).lean();
    if (!promo) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = Math.min(200, Number(url.searchParams.get('limit') || 100));

    const redemptions = await PromoCodeRedemption.find({ promoCodeId: promo._id })
      .sort({ consumedAt: -1 })
      .limit(limit)
      .lean();

    const weeklyRequestIds = redemptions
      .filter((item) => item.purchaseType === 'weekly_topup')
      .map((item) => item.requestId);
    const dailyRequestIds = redemptions
      .filter((item) => item.purchaseType === 'daily_topup')
      .map((item) => item.requestId);

    const [weeklyRequests, dailyRequests] = await Promise.all([
      weeklyRequestIds.length
        ? CreditPurchaseRequest.find({ requestId: { $in: weeklyRequestIds } })
            .populate('userId', 'name email userID')
            .lean()
        : [],
      dailyRequestIds.length
        ? VoucherPurchaseRequest.find({ requestId: { $in: dailyRequestIds } })
            .populate('userId', 'name email')
            .lean()
        : []
    ]);

    const weeklyMap = new Map(weeklyRequests.map((item: any) => [item.requestId, item]));
    const dailyMap = new Map(dailyRequests.map((item: any) => [item.requestId, item]));

    const items = redemptions.map((redemption) => {
      const requestDoc =
        redemption.purchaseType === 'weekly_topup'
          ? weeklyMap.get(redemption.requestId)
          : dailyMap.get(redemption.requestId);

      return {
        _id: redemption._id,
        requestId: redemption.requestId,
        purchaseType: redemption.purchaseType,
        consumedAt: redemption.consumedAt,
        discountAmount: redemption.discountAmount,
        originalSubtotal: redemption.originalSubtotal,
        finalTotal: redemption.finalTotal,
        request: requestDoc || null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        promoCode: {
          _id: promo._id,
          code: promo.code
        },
        items
      }
    });
  } catch (error: any) {
    console.error('Error fetching promo redemptions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promo redemptions' },
      { status: 500 }
    );
  }
}
