import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import CreditPurchaseRequest from '@/models/CreditPurchaseRequest';
import User from '@/models/User';
import mongoose from 'mongoose';
import PromoCode from '@/models/PromoCode';
import PromoCodeRedemption from '@/models/PromoCodeRedemption';
import { sendAdminCreditRequestNotification, sendUserCreditRequestConfirmation } from '@/lib/services/email';
import {
  PromoErrorCode,
  calculatePromoBreakdown,
  normalizePhone,
  normalizePromoCode,
  validatePromoForPreview
} from '@/lib/promo-code';

// POST handler - create a new credit purchase request
export async function POST(request: Request) {
  try {
    console.log('Credit request POST received');
    const data = await request.json();
    console.log('Credit request data:', JSON.stringify(data));
    
    // Validate required fields
    if (!data.userId || !data.imageProof || !data.paymentMethod || !data.referenceNumber) {
      console.log('Missing required fields:', { 
        userId: !!data.userId, 
        imageProof: !!data.imageProof,
        paymentMethod: !!data.paymentMethod,
        referenceNumber: !!data.referenceNumber
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate payment method
    if (data.paymentMethod !== 'wechat' && data.paymentMethod !== 'emt') {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user to ensure they exist
    const user = await User.findById(data.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const mealPriceMap: Record<number, Record<number, number>> = {
      1: { 6: 112, 8: 148, 10: 183, 12: 217, 16: 286 },
      2: { 6: 219, 8: 290, 10: 359, 12: 428, 16: 562 },
      4: { 6: 398, 8: 525, 10: 648, 12: 765, 16: 998 },
      8: { 6: 744, 8: 979, 10: 1210, 12: 1428, 16: 1870 }
    };

    const duration = Number(data.mealPlanQuantity || data.duration);
    const mealsPerWeek = Number(data.mealsPerWeek || String(data.mealPlanType || '').replace('aweek', ''));
    const planBasePrice = mealPriceMap[duration]?.[mealsPerWeek];

    if (!planBasePrice) {
      return NextResponse.json(
        { success: false, error: 'Invalid weekly plan combination' },
        { status: 400 }
      );
    }

    const deliveryFeePerWeek =
      user.address?.province === 'Hamilton' || user.address?.province === 'Burlington' ? 15.99 : 9.99;
    const originalSubtotal = parseFloat((planBasePrice + deliveryFeePerWeek * duration).toFixed(2));

    const taxRate = 0.13;
    const effectivePaymentMethod = data.paymentMethod as 'wechat' | 'emt';
    const normalizedPromoCode = normalizePromoCode(data.promoCode || '');
    let promoDoc: any = null;

    let pricing = {
      currency: 'CAD' as const,
      originalSubtotal,
      discountAmount: 0,
      discountedSubtotal: originalSubtotal,
      taxRate: effectivePaymentMethod === 'emt' ? taxRate : 0,
      taxAmount: 0,
      finalTotal: 0
    };

    if (effectivePaymentMethod === 'wechat') {
      // Existing WeChat path: 10% off, no promo allowed.
      pricing.discountAmount = parseFloat((originalSubtotal * 0.1).toFixed(2));
      pricing.discountedSubtotal = parseFloat((originalSubtotal - pricing.discountAmount).toFixed(2));
      pricing.taxAmount = 0;
      pricing.finalTotal = pricing.discountedSubtotal;
      if (normalizedPromoCode) {
        return NextResponse.json(
          {
            success: false,
            errorCode: PromoErrorCode.PAYMENT_METHOD_NOT_ELIGIBLE,
            error: 'Promo code is only valid for EMT payment on weekly top-up.'
          },
          { status: 400 }
        );
      }
    } else {
      if (normalizedPromoCode) {
        promoDoc = await PromoCode.findOne({ code: normalizedPromoCode });
        const preview = await validatePromoForPreview({
          promo: promoDoc,
          input: {
            code: normalizedPromoCode,
            userPhone: user.phone,
            purchaseType: 'weekly_topup',
            paymentMethod: 'emt',
            subtotal: originalSubtotal
          },
          taxRate
        });

        if (!preview.ok) {
          return NextResponse.json(
            {
              success: false,
              errorCode: preview.errorCode || PromoErrorCode.INVALID_CODE,
              error: preview.message || 'Promo code is not valid'
            },
            { status: 400 }
          );
        }
        pricing = preview.breakdown!;
      } else {
        pricing = calculatePromoBreakdown({
          subtotal: originalSubtotal,
          taxRate,
          discountType: 'fixed',
          discountValue: 0
        });
      }
    }
    
    // Generate request ID
    const requestId = data.requestId || (await CreditPurchaseRequest.generateRequestId());
    const existingRequest = await CreditPurchaseRequest.findOne({ requestId });
    if (existingRequest) {
      return NextResponse.json({
        success: true,
        data: existingRequest
      });
    }

    let savedRequest: any;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (promoDoc) {
          const normalizedPhone = normalizePhone(user.phone);
          if (!normalizedPhone) {
            throw new Error(PromoErrorCode.PHONE_REQUIRED_FOR_PROMO);
          }

          const alreadyUsed = await PromoCodeRedemption.exists({
            promoCodeId: promoDoc._id,
            userPhoneNormalized: normalizedPhone
          }).session(session);
          if (alreadyUsed) {
            throw new Error(PromoErrorCode.ALREADY_USED);
          }

          if (promoDoc.maxUses !== undefined && promoDoc.maxUses !== null) {
            const usageUpdated = await PromoCode.findOneAndUpdate(
              { _id: promoDoc._id, usageCount: { $lt: promoDoc.maxUses } },
              { $inc: { usageCount: 1 } },
              { new: true, session }
            );
            if (!usageUpdated) {
              throw new Error(PromoErrorCode.MAX_USES_REACHED);
            }
          } else {
            await PromoCode.updateOne({ _id: promoDoc._id }, { $inc: { usageCount: 1 } }, { session });
          }

          await PromoCodeRedemption.create(
            [
              {
                promoCodeId: promoDoc._id,
                promoCode: promoDoc.code,
                userId: user._id,
                userPhoneNormalized: normalizedPhone,
                requestId,
                purchaseType: 'weekly_topup',
                currency: pricing.currency,
                originalSubtotal: pricing.originalSubtotal,
                discountAmount: pricing.discountAmount,
                discountedSubtotal: pricing.discountedSubtotal,
                taxAmount: pricing.taxAmount,
                finalTotal: pricing.finalTotal
              }
            ],
            { session }
          );
        }

        const created = await CreditPurchaseRequest.create(
          [
            {
              requestId,
              userId: data.userId,
              amount: pricing.finalTotal,
              paymentMethod: effectivePaymentMethod,
              originalPrice: pricing.originalSubtotal,
              currency: pricing.currency,
              originalSubtotal: pricing.originalSubtotal,
              finalTotal: pricing.finalTotal,
              promoCode: promoDoc?.code,
              promoDiscountType: promoDoc?.discountType,
              promoDiscountValue: promoDoc?.discountValue,
              promoDiscountAmount: pricing.discountAmount,
              promoId: promoDoc?._id,
              imageProof: data.imageProof,
              referenceNumber: data.referenceNumber,
              notes: data.notes || '',
              planDescription: data.planDescription || '',
              mealPlanType: data.mealPlanType,
              mealPlanQuantity: duration,
              status: 'pending'
            }
          ],
          { session }
        );
        savedRequest = created[0];
      });
    } catch (txError: any) {
      const code = txError?.message as PromoErrorCode;
      if (Object.values(PromoErrorCode).includes(code)) {
        return NextResponse.json(
          { success: false, errorCode: code, error: code.replaceAll('_', ' ') },
          { status: 400 }
        );
      }
      throw txError;
    } finally {
      await session.endSession();
    }
    
    // Send notification to admin
    try {
      console.log('Sending admin notification for request:', requestId);
      
      // Format user address for the email
      const userAddress = user.address ? {
        unitNumber: user.address.unitNumber || '',
        streetAddress: user.address.streetAddress || '',
        city: user.address.city || '',
        province: user.address.province || '',
        postalCode: user.address.postalCode || '',
        country: user.address.country || '',
        buzzCode: user.address.buzzCode || ''
      } : null;
      
      await sendAdminCreditRequestNotification({
        userId: user._id.toString(),
        userName: user.name || user.userID,
        userEmail: user.email,
        amount: savedRequest.amount,
        paymentMethod: effectivePaymentMethod,
        originalPrice: savedRequest.originalPrice,
        originalSubtotal: savedRequest.originalSubtotal,
        finalTotal: savedRequest.finalTotal,
        taxRate: savedRequest.taxRate,
        promoCode: savedRequest.promoCode,
        promoDiscountAmount: savedRequest.promoDiscountAmount,
        imageProofUrl: data.imageProof,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        planDescription: data.planDescription || '',
        requestId: requestId,
        userAddress: userAddress
      });
      console.log('Admin notification sent successfully');
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
      // Continue with the process even if email fails
    }
    
    // Send confirmation email to user
    try {
      console.log('Sending confirmation email to user:', user.email);
      await sendUserCreditRequestConfirmation({
        userId: user._id.toString(),
        userName: user.name || user.userID,
        userEmail: user.email,
        amount: savedRequest.amount,
        paymentMethod: effectivePaymentMethod,
        originalPrice: savedRequest.originalPrice,
        originalSubtotal: savedRequest.originalSubtotal,
        finalTotal: savedRequest.finalTotal,
        taxRate: savedRequest.taxRate,
        promoCode: savedRequest.promoCode,
        promoDiscountAmount: savedRequest.promoDiscountAmount,
        referenceNumber: data.referenceNumber,
        planDescription: data.planDescription || '',
        requestId: requestId
      }, user.languagePreference || 'zh'); // Pass user's language preference
      console.log('User confirmation email sent successfully');
    } catch (emailError) {
      console.error('Error sending user confirmation email:', emailError);
      // Continue with the process even if email fails
    }
    
    return NextResponse.json({
      success: true,
      data: savedRequest
    });
  } catch (error: any) {
    console.error('Error creating credit purchase request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create credit purchase request' },
      { status: 500 }
    );
  }
}

// GET handler - get credit purchase requests for a user
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Build query
    const query: any = { userId };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Find requests with pagination
    const requests = await CreditPurchaseRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const toSafeNumber = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const normalizedRequests = requests.map((request: any) => {
      const plain = typeof request?.toObject === 'function' ? request.toObject() : request;
      return {
        ...plain,
        amount: toSafeNumber(plain?.amount),
        originalPrice: toSafeNumber(plain?.originalPrice),
        originalSubtotal: toSafeNumber(plain?.originalSubtotal),
        finalTotal: toSafeNumber(plain?.finalTotal),
        promoDiscountValue: toSafeNumber(plain?.promoDiscountValue),
        promoDiscountAmount: toSafeNumber(plain?.promoDiscountAmount),
        mealPlanQuantity: toSafeNumber(plain?.mealPlanQuantity)
      };
    });
    
    // Get total count for pagination
    const totalRequests = await CreditPurchaseRequest.countDocuments(query);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        requests: normalizedRequests,
        page,
        limit,
        total: totalRequests,
        pages: Math.ceil(totalRequests / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching credit purchase requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credit purchase requests' },
      { status: 500 }
    );
  }
}
