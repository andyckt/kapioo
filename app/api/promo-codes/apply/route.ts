import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PromoCode from '@/models/PromoCode';
import User from '@/models/User';
import {
  PromoErrorCode,
  normalizePromoCode,
  validatePromoForPreview,
  type PromoPurchaseType,
  type PromoPaymentMethod
} from '@/lib/promo-code';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const code = normalizePromoCode(body.code);
    const userId = body.userId as string;
    const purchaseType = body.purchaseType as PromoPurchaseType;
    const paymentMethod = body.paymentMethod as PromoPaymentMethod;
    const subtotal = Number(body.subtotal);
    const taxRate = Number(body.taxRate ?? 0.13);

    if (!code || !userId || !purchaseType || !paymentMethod || Number.isNaN(subtotal)) {
      return NextResponse.json(
        { success: false, errorCode: PromoErrorCode.INTERNAL_VALIDATION_ERROR, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select('phone').lean() as { phone?: string } | null;
    if (!user) {
      return NextResponse.json(
        { success: false, errorCode: PromoErrorCode.INTERNAL_VALIDATION_ERROR, error: 'User not found' },
        { status: 404 }
      );
    }

    const promo = await PromoCode.findOne({ code });
    const result = await validatePromoForPreview({
      promo,
      input: {
        code,
        userPhone: user.phone,
        purchaseType,
        paymentMethod,
        subtotal
      },
      taxRate
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          errorCode: result.errorCode || PromoErrorCode.INTERNAL_VALIDATION_ERROR,
          error: result.message || 'Promo code is not valid'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        code,
        breakdown: result.breakdown
      }
    });
  } catch (error: any) {
    console.error('Error applying promo code:', error);
    return NextResponse.json(
      {
        success: false,
        errorCode: PromoErrorCode.INTERNAL_VALIDATION_ERROR,
        error: 'Failed to apply promo code'
      },
      { status: 500 }
    );
  }
}
