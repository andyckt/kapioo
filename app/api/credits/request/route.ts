import { errorJson, handleRouteError, parseJsonBody, parseSearchParams, successJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import {
  createCreditRequestBodySchema,
  creditRequestsQuerySchema,
} from '@/lib/contracts/credit-request';
import connectToDatabase from '@/lib/db';
import CreditPurchaseRequest, { type ICreditPurchaseRequest } from '@/models/CreditPurchaseRequest';
import User from '@/models/User';
import mongoose from 'mongoose';
import PromoCode, { type IPromoCode } from '@/models/PromoCode';
import PromoCodeRedemption from '@/models/PromoCodeRedemption';
import { sendAdminCreditRequestNotification, sendUserCreditRequestConfirmation } from '@/lib/services/email';
import {
  PromoErrorCode,
  calculatePromoBreakdown,
  normalizePhone,
  normalizePromoCode,
  validatePromoForPreview
} from '@/lib/promo-code';
import {
  derivePlanIdFromWeeklyType,
  getWeeklyPlanBy,
  getWeeklyPlanById,
  getWeeklyDeliveryFee,
  toWeeklyPlanId
} from '@/lib/plans/service';

// POST handler - create a new credit purchase request
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    console.log('Credit request POST received');
    const { data, error } = await parseJsonBody(request, createCreditRequestBodySchema);
    if (error) {
      return error;
    }
    console.log('Credit request data:', JSON.stringify(data));

    const effectiveUserId =
      actor.role === 'admin' && data.userId
        ? data.userId
        : String(actor.user._id);

    if (
      actor.role !== 'admin' &&
      data.userId &&
      String(data.userId) !== String(actor.user._id) &&
      String(data.userId) !== String(actor.user.userID)
    ) {
      return errorJson('You cannot submit requests for another user', 403);
    }
    
    // Validate required fields
    if (!effectiveUserId || !data.imageProof || !data.paymentMethod || !data.referenceNumber) {
      console.log('Missing required fields:', { 
        userId: !!effectiveUserId, 
        imageProof: !!data.imageProof,
        paymentMethod: !!data.paymentMethod,
        referenceNumber: !!data.referenceNumber
      });
      return errorJson('Missing required fields', 400);
    }
    
    // Validate payment method
    if (data.paymentMethod !== 'wechat' && data.paymentMethod !== 'emt') {
      return errorJson('Invalid payment method', 400);
    }
    
    await connectToDatabase();
    
    // Find user to ensure they exist
    const user = await User.findById(effectiveUserId);
    if (!user) {
      return errorJson('User not found', 404);
    }

    // Phone is required for all credit requests
    const normalizedUserPhone = normalizePhone(user.phone);
    if (!normalizedUserPhone) {
      return errorJson(
        'Phone number is required for credit requests. Please add your phone number and try again.',
        400
      );
    }

    const duration = Number(data.mealPlanQuantity || data.duration);
    const mealsPerWeek = Number(data.mealsPerWeek || String(data.mealPlanType || '').replace('aweek', ''));
    const requestedPlanId =
      data.planId ||
      (Number.isFinite(mealsPerWeek) && Number.isFinite(duration)
        ? toWeeklyPlanId(mealsPerWeek, duration)
        : derivePlanIdFromWeeklyType(data.mealPlanType, duration));
    const weeklyPlan = requestedPlanId ? getWeeklyPlanById(requestedPlanId) : getWeeklyPlanBy(mealsPerWeek, duration);
    const planBasePrice = weeklyPlan?.basePrice;

    if (!planBasePrice) {
      return errorJson('Invalid weekly plan combination', 400);
    }

    const mealSubtotal = parseFloat(planBasePrice.toFixed(2));
    const deliveryFeePerWeek = getWeeklyDeliveryFee(user.address?.province || '');
    const deliveryFeeTotal = parseFloat((deliveryFeePerWeek * duration).toFixed(2));
    const pricingSubtotal = parseFloat((mealSubtotal + deliveryFeeTotal).toFixed(2));

    const taxRate = 0.13;
    const effectivePaymentMethod = data.paymentMethod as 'wechat' | 'emt';
    const normalizedPromoCode = normalizePromoCode(data.promoCode || '');
    let promoDoc: IPromoCode | null = null;

    let pricing = {
      currency: 'CAD' as const,
      originalSubtotal: pricingSubtotal,
      discountAmount: 0,
      discountedSubtotal: pricingSubtotal,
      taxRate: effectivePaymentMethod === 'emt' ? taxRate : 0,
      taxAmount: 0,
      finalTotal: 0
    };

    if (effectivePaymentMethod === 'wechat') {
      // Existing WeChat path: 10% off, no promo allowed.
      pricing.discountAmount = parseFloat((pricingSubtotal * 0.1).toFixed(2));
      pricing.discountedSubtotal = parseFloat((pricingSubtotal - pricing.discountAmount).toFixed(2));
      pricing.taxAmount = 0;
      pricing.finalTotal = pricing.discountedSubtotal;
      if (normalizedPromoCode) {
        return errorJson(
          'Promo code is only valid for EMT payment on weekly top-up.',
          400,
          {
            errorCode: PromoErrorCode.PAYMENT_METHOD_NOT_ELIGIBLE,
          }
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
            mealSubtotal,
            deliveryFeeTotal
          },
          taxRate
        });

        if (!preview.ok) {
          return errorJson(
            preview.message || 'Promo code is not valid',
            400,
            {
              errorCode: preview.errorCode || PromoErrorCode.INVALID_CODE,
            }
          );
        }
        pricing = preview.breakdown!;
      } else {
        pricing = calculatePromoBreakdown({
          mealSubtotal,
          deliveryFeeTotal,
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
      return successJson(existingRequest);
    }

    let savedRequest: ICreditPurchaseRequest | null = null;
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
              userId: effectiveUserId,
              planId: weeklyPlan?.id,
              amount: pricing.finalTotal,
              paymentMethod: effectivePaymentMethod,
              originalPrice: pricing.originalSubtotal,
              currency: pricing.currency,
              originalSubtotal: pricing.originalSubtotal,
              mealSubtotal,
              deliveryFeePerWeek,
              deliveryFeeTotal,
              taxAmount: pricing.taxAmount,
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
    } catch (txError: unknown) {
      const code = txError instanceof Error ? (txError.message as PromoErrorCode) : undefined;
      if (code && Object.values(PromoErrorCode).includes(code)) {
        return errorJson(code.replaceAll('_', ' '), 400, {
          errorCode: code,
        });
      }
      throw txError;
    } finally {
      await session.endSession();
    }

    if (!savedRequest) {
      return errorJson('Failed to create credit purchase request', 500);
    }

    const persistedRequest = savedRequest as ICreditPurchaseRequest;
    
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
        amount: persistedRequest.amount,
        paymentMethod: effectivePaymentMethod,
        originalPrice: persistedRequest.originalPrice,
        originalSubtotal: persistedRequest.originalSubtotal,
        finalTotal: persistedRequest.finalTotal,
        taxRate: pricing.taxRate,
        taxAmount: persistedRequest.taxAmount,
        mealSubtotal: persistedRequest.mealSubtotal,
        deliveryFeePerWeek: persistedRequest.deliveryFeePerWeek,
        deliveryFeeTotal: persistedRequest.deliveryFeeTotal,
        promoCode: persistedRequest.promoCode,
        promoDiscountAmount: persistedRequest.promoDiscountAmount,
        imageProofUrl: data.imageProof,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        planDescription: data.planDescription || '',
        requestId: requestId,
        mealPlanQuantity: duration,
        userAddress: userAddress
      });
      console.log('Admin notification sent successfully');
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
      // Continue with the process even if email fails
    }
    
    // Send confirmation email to user
    try {
      console.log(`Sending credit request confirmation for request ${requestId}`);
      await sendUserCreditRequestConfirmation({
        userId: user._id.toString(),
        userName: user.name || user.userID,
        userEmail: user.email,
        amount: persistedRequest.amount,
        paymentMethod: effectivePaymentMethod,
        originalPrice: persistedRequest.originalPrice,
        originalSubtotal: persistedRequest.originalSubtotal,
        finalTotal: persistedRequest.finalTotal,
        taxRate: pricing.taxRate,
        taxAmount: persistedRequest.taxAmount,
        mealSubtotal: persistedRequest.mealSubtotal,
        deliveryFeePerWeek: persistedRequest.deliveryFeePerWeek,
        deliveryFeeTotal: persistedRequest.deliveryFeeTotal,
        promoCode: persistedRequest.promoCode,
        promoDiscountAmount: persistedRequest.promoDiscountAmount,
        referenceNumber: data.referenceNumber,
        planDescription: data.planDescription || '',
        mealPlanQuantity: duration,
        requestId: requestId
      }, user.languagePreference || 'zh'); // Pass user's language preference
      console.log(`Credit request confirmation sent for request ${requestId}`);
    } catch (emailError) {
      console.error('Error sending user confirmation email:', emailError);
      // Continue with the process even if email fails
    }
    
    return successJson(persistedRequest);
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/credits/request');
  }
}

// GET handler - get credit purchase requests for a user
export async function GET(request: Request) {
  try {
    const { data, error } = parseSearchParams(request, creditRequestsQuerySchema);
    if (error) {
      return error;
    }

    const userId = data.userId;
    const status = data.status;
    const page = data.page ?? 1;
    const limit = data.limit ?? 10;
    const skip = (page - 1) * limit;
    
    if (!userId) {
      return errorJson('User ID is required', 400);
    }
    
    await connectToDatabase();
    
    // Build query
    const query: Record<string, unknown> = { userId };
    
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

    const normalizeAmountField = (value: unknown, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };

    const normalizedRequests = requests.map((request) => {
      const plain = typeof request?.toObject === 'function' ? request.toObject() : request;
      const normalizedAmount = toSafeNumber(plain?.amount);
      const normalizedSubtotal = normalizeAmountField(plain?.originalSubtotal, normalizedAmount);
      const normalizedFinalTotal = normalizeAmountField(plain?.finalTotal, normalizedAmount);
      return {
        ...plain,
        amount: normalizedAmount,
        originalPrice: toSafeNumber(plain?.originalPrice),
        originalSubtotal: normalizedSubtotal,
        mealSubtotal: toSafeNumber(plain?.mealSubtotal),
        deliveryFeePerWeek: toSafeNumber(plain?.deliveryFeePerWeek),
        deliveryFeeTotal: toSafeNumber(plain?.deliveryFeeTotal),
        taxAmount: toSafeNumber(plain?.taxAmount),
        finalTotal: normalizedFinalTotal,
        promoDiscountValue: toSafeNumber(plain?.promoDiscountValue),
        promoDiscountAmount: toSafeNumber(plain?.promoDiscountAmount),
        mealPlanQuantity: toSafeNumber(plain?.mealPlanQuantity)
      };
    });
    
    // Get total count for pagination
    const totalRequests = await CreditPurchaseRequest.countDocuments(query);
    
    return successJson({
      requests: normalizedRequests,
      page,
      limit,
      total: totalRequests,
      pages: Math.ceil(totalRequests / limit)
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/credits/request');
  }
}
