import { NextRequest, NextResponse } from "next/server";

import { errorJson, handleRouteError, parseJsonBody, parseSearchParams } from "@/lib/api";
import { requireAdminMfa, requireUser } from "@/lib/auth/guards";
import {
  createVoucherPurchaseRequestBodySchema,
  voucherRequestsListQuerySchema,
} from "@/lib/contracts/voucher-request";
import connectToDatabase from '@/lib/db';
import VoucherPurchaseRequest from '@/models/VoucherPurchaseRequest';
import User from '@/models/User';
import mongoose from 'mongoose';
import PromoCode from '@/models/PromoCode';
import PromoCodeRedemption from '@/models/PromoCodeRedemption';
import { sendAdminVoucherRequestNotification, sendUserVoucherRequestConfirmation } from '@/lib/services/email';
import {
  PromoErrorCode,
  normalizePhone,
  normalizePromoCode,
  validatePromoForPreview,
} from "@/lib/promo-code";
import { derivePlanIdFromDaily, getDailyPlanBy, getDailyPlanById, toDailyPlanId } from '@/lib/plans/service';

// GET handler - fetch voucher purchase requests
export async function GET(request: NextRequest) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(
      request.url,
      voucherRequestsListQuerySchema
    );
    if (queryError) {
      return queryError;
    }

    await connectToDatabase();

    const safePage = query.page ?? 1;
    const safeLimit = query.limit ?? 10;
    const { userId, status, startDate, endDate } = query;
    const search = String(query.search ?? "").trim();
    const skip = (safePage - 1) * safeLimit;
    
    const mongoQuery: Record<string, unknown> = {};
    if (userId) {
      const isSelf =
        String(actor.user._id) === String(userId) ||
        String(actor.user.userID) === String(userId);
      if (!isSelf && actor.role !== "admin") {
        return errorJson("You do not have access to these voucher requests", 403);
      }

      if (!isSelf && actor.role === "admin") {
        const { response: adminMfaResponse } = await requireAdminMfa(request);
        if (adminMfaResponse) {
          return adminMfaResponse;
        }
      }

      mongoQuery.userId = userId;
    } else if (actor.role !== "admin") {
      mongoQuery.userId = actor.user._id;
    } else {
      const { response: adminMfaResponse } = await requireAdminMfa(request);
      if (adminMfaResponse) {
        return adminMfaResponse;
      }
    }
    if (status) {
      mongoQuery.status = status;
    }
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) {
        const parsedStart = new Date(`${startDate}T00:00:00.000Z`);
        if (!Number.isNaN(parsedStart.getTime())) {
          createdAt.$gte = parsedStart;
        }
      }
      if (endDate) {
        const parsedEnd = new Date(`${endDate}T00:00:00.000Z`);
        if (!Number.isNaN(parsedEnd.getTime())) {
          createdAt.$lt = new Date(parsedEnd.getTime() + 24 * 60 * 60 * 1000);
        }
      }
      if (Object.keys(createdAt).length > 0) {
        mongoQuery.createdAt = createdAt;
      }
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      const matchedUsers = await User.find({
        $or: [{ name: regex }, { email: regex }],
      })
        .select("_id")
        .lean();
      const matchedUserIds = matchedUsers.map((u: { _id: unknown }) => u._id);

      mongoQuery.$or = [
        { requestId: regex },
        { referenceNumber: regex },
        ...(matchedUserIds.length > 0 ? [{ userId: { $in: matchedUserIds } }] : []),
      ];
    }

    const totalCount = await VoucherPurchaseRequest.countDocuments(mongoQuery);
    const requests = await VoucherPurchaseRequest.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('userId', 'name email');

    const toSafeNumber = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const normalizeAmountField = (value: unknown, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };

    const normalizedRequests = requests.map((request: any) => {
      const plain = typeof request?.toObject === 'function' ? request.toObject() : request;
      const normalizedAmount = toSafeNumber(plain?.amount);
      const normalizedSubtotal = normalizeAmountField(plain?.originalSubtotal, normalizedAmount);
      const normalizedFinalTotal = normalizeAmountField(plain?.finalTotal, normalizedAmount);
      return {
        ...plain,
        amount: normalizedAmount,
        originalPrice: toSafeNumber(plain?.originalPrice),
        originalSubtotal: normalizedSubtotal,
        finalTotal: normalizedFinalTotal,
        promoDiscountValue: toSafeNumber(plain?.promoDiscountValue),
        promoDiscountAmount: toSafeNumber(plain?.promoDiscountAmount),
        quantity: toSafeNumber(plain?.quantity),
        taxRate: toSafeNumber(plain?.taxRate)
      };
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / safeLimit);
    
    return NextResponse.json({
      success: true,
      data: normalizedRequests,
      pagination: {
        total: totalCount,
        page: safePage,
        limit: safeLimit,
        pages: totalPages,
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/voucher-requests");
  }
}

// POST handler - create a new voucher purchase request
export async function POST(request: NextRequest) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { data: body, error: bodyError } = await parseJsonBody(
      request,
      createVoucherPurchaseRequestBodySchema
    );
    if (bodyError) {
      return bodyError;
    }

    await connectToDatabase();

    const {
      userId,
      type,
      quantity,
      imageProof,
      referenceNumber,
      notes,
      promoCode,
      requestId: clientRequestId,
    } = body;
    
    const effectiveUserId =
      actor.role === 'admin' && userId
        ? userId
        : String(actor.user._id);

    if (
      actor.role !== "admin" &&
      userId &&
      String(userId) !== String(actor.user._id) &&
      String(userId) !== String(actor.user.userID)
    ) {
      return errorJson("You cannot submit requests for another user", 403);
    }

    const user = await User.findById(effectiveUserId);
    if (!user) {
      return errorJson("User not found", 404);
    }

    const normalizedUserPhone = normalizePhone(user.phone);
    if (!normalizedUserPhone) {
      return errorJson(
        "Phone number is required for voucher requests. Please add your phone number and try again.",
        400
      );
    }

    const voucherType = type as 'twoDish' | 'threeDish';
    const planId =
      body.planId ||
      (Number.isFinite(Number(quantity))
        ? toDailyPlanId(voucherType, Number(quantity))
        : derivePlanIdFromDaily(voucherType, Number(quantity)));
    if (!planId) {
      return errorJson("Invalid plan quantity for selected voucher type", 400);
    }
    const dailyPlan = getDailyPlanById(planId) || getDailyPlanBy(voucherType, Number(quantity));
    const baseSubtotal = dailyPlan?.basePrice;
    if (!baseSubtotal) {
      return errorJson("Invalid plan quantity for selected voucher type", 400);
    }

    const requestId = clientRequestId || (await VoucherPurchaseRequest.generateRequestId());
    const existingRequest = await VoucherPurchaseRequest.findOne({ requestId });
    if (existingRequest) {
      return NextResponse.json({
        success: true,
        data: existingRequest,
        message: 'Voucher purchase request already submitted'
      });
    }

    const taxRate = 0.13;
    let promoDoc: any = null;
    let promoBreakdown = {
      currency: 'CAD' as const,
      originalSubtotal: baseSubtotal,
      discountAmount: 0,
      discountedSubtotal: baseSubtotal,
      taxRate,
      taxAmount: parseFloat((baseSubtotal * taxRate).toFixed(2)),
      finalTotal: parseFloat((baseSubtotal * (1 + taxRate)).toFixed(2))
    };
    const normalizedPromoCode = normalizePromoCode(promoCode || '');

    if (normalizedPromoCode) {
      promoDoc = await PromoCode.findOne({ code: normalizedPromoCode });
      const preview = await validatePromoForPreview({
        promo: promoDoc,
        input: {
          code: normalizedPromoCode,
          userPhone: user.phone,
          purchaseType: 'daily_topup',
          paymentMethod: 'emt',
          mealSubtotal: baseSubtotal,
          deliveryFeeTotal: 0
        },
        taxRate
      });

      if (!preview.ok) {
        return errorJson(preview.message || "Promo code is not valid", 400, {
          errorCode: preview.errorCode || PromoErrorCode.INVALID_CODE,
        });
      }

      promoBreakdown = preview.breakdown!;
    }

    const session = await mongoose.startSession();
    let newRequest: any = null;
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
              {
                _id: promoDoc._id,
                usageCount: { $lt: promoDoc.maxUses }
              },
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
                userId: new mongoose.Types.ObjectId(effectiveUserId),
                userPhoneNormalized: normalizedPhone,
                requestId,
                purchaseType: 'daily_topup',
                currency: promoBreakdown.currency,
                originalSubtotal: promoBreakdown.originalSubtotal,
                discountAmount: promoBreakdown.discountAmount,
                discountedSubtotal: promoBreakdown.discountedSubtotal,
                taxAmount: promoBreakdown.taxAmount,
                finalTotal: promoBreakdown.finalTotal
              }
            ],
            { session }
          );
        }

        newRequest = await VoucherPurchaseRequest.create(
          [
            {
              requestId,
              userId: new mongoose.Types.ObjectId(effectiveUserId),
              planId: dailyPlan?.id,
              type,
              quantity,
              amount: promoBreakdown.finalTotal,
              originalPrice: promoBreakdown.originalSubtotal,
              taxRate,
              currency: promoBreakdown.currency,
              originalSubtotal: promoBreakdown.originalSubtotal,
              finalTotal: promoBreakdown.finalTotal,
              promoCode: promoDoc?.code,
              promoDiscountType: promoDoc?.discountType,
              promoDiscountValue: promoDoc?.discountValue,
              promoDiscountAmount: promoBreakdown.discountAmount,
              promoId: promoDoc?._id,
              imageProof,
              referenceNumber,
              notes,
              status: 'pending'
            }
          ],
          { session }
        );
      });
    } catch (txError: any) {
      const code = txError?.message as PromoErrorCode;
      if (Object.values(PromoErrorCode).includes(code)) {
        return errorJson(code.replaceAll("_", " "), 400, { errorCode: code });
      }
      throw txError;
    } finally {
      await session.endSession();
    }

    const createdRequest = Array.isArray(newRequest) ? newRequest[0] : newRequest;
    
    // Send notification to admin
    try {
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
      
      await sendAdminVoucherRequestNotification({
        userId: effectiveUserId,
        userName: user.name,
        userEmail: user.email,
        type,
        quantity,
        amount: createdRequest.amount,
        originalSubtotal: createdRequest.originalSubtotal,
        finalTotal: createdRequest.finalTotal,
        taxRate: createdRequest.taxRate,
        promoCode: createdRequest.promoCode,
        promoDiscountAmount: createdRequest.promoDiscountAmount,
        imageProofUrl: imageProof,
        referenceNumber,
        notes,
        requestId,
        userAddress: userAddress
      });
      console.log('Admin notification sent successfully for voucher request:', requestId);
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
      // Continue even if email fails
    }
    
    // Send confirmation email to user
    try {
      console.log(`Sending voucher request confirmation for request ${requestId}`);
      await sendUserVoucherRequestConfirmation({
        userId: effectiveUserId,
        userName: user.name,
        userEmail: user.email,
        type,
        quantity,
        amount: createdRequest.amount,
        originalSubtotal: createdRequest.originalSubtotal,
        finalTotal: createdRequest.finalTotal,
        taxRate: createdRequest.taxRate,
        promoCode: createdRequest.promoCode,
        promoDiscountAmount: createdRequest.promoDiscountAmount,
        referenceNumber,
        notes,
        requestId
      }, user.languagePreference || 'zh'); // Pass user's language preference
      console.log('User confirmation email sent successfully for voucher request:', requestId);
    } catch (emailError) {
      console.error('Failed to send user confirmation email:', emailError);
      // Continue even if email fails
    }
    
    return NextResponse.json({
      success: true,
      data: createdRequest,
      message: 'Voucher purchase request submitted successfully'
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/voucher-requests");
  }
}
