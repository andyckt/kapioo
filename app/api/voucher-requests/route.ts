import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import VoucherPurchaseRequest from '@/models/VoucherPurchaseRequest';
import User from '@/models/User';
import mongoose from 'mongoose';
import PromoCode from '@/models/PromoCode';
import PromoCodeRedemption from '@/models/PromoCodeRedemption';
import { sendAdminVoucherRequestNotification, sendUserVoucherRequestConfirmation } from '@/lib/services/email';
import {
  PromoErrorCode,
  calculatePromoBreakdown,
  normalizePhone,
  normalizePromoCode,
  validatePromoForPreview
} from '@/lib/promo-code';
import { derivePlanIdFromDaily, getDailyPlanBy, getDailyPlanById, toDailyPlanId } from '@/lib/plans/service';

// GET handler - fetch voucher purchase requests
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const search = String(searchParams.get('search') || '').trim();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10;
    const skip = (safePage - 1) * safeLimit;
    
    // Build query
    const query: any = {};
    if (userId) {
      query.userId = userId;
    }
    if (status && ['pending', 'approved', 'declined'].includes(status)) {
      query.status = status;
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
          // Inclusive end date (entire day)
          createdAt.$lt = new Date(parsedEnd.getTime() + 24 * 60 * 60 * 1000);
        }
      }
      if (Object.keys(createdAt).length > 0) {
        query.createdAt = createdAt;
      }
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const matchedUsers = await User.find({
        $or: [{ name: regex }, { email: regex }]
      })
        .select('_id')
        .lean();
      const matchedUserIds = matchedUsers.map((u: any) => u._id);

      query.$or = [
        { requestId: regex },
        { referenceNumber: regex },
        ...(matchedUserIds.length > 0 ? [{ userId: { $in: matchedUserIds } }] : [])
      ];
    }
    
    // Execute query with pagination
    const totalCount = await VoucherPurchaseRequest.countDocuments(query);
    const requests = await VoucherPurchaseRequest.find(query)
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
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching voucher purchase requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch voucher purchase requests' },
      { status: 500 }
    );
  }
}

// POST handler - create a new voucher purchase request
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Parse request body
    const body = await request.json();
    const {
      userId,
      type,
      quantity,
      imageProof,
      referenceNumber,
      notes,
      promoCode,
      requestId: clientRequestId
    } = body;
    
    // Validate required fields
    if (!userId || !type || !quantity || !imageProof || !referenceNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate voucher type
    if (type !== 'twoDish' && type !== 'threeDish') {
      return NextResponse.json(
        { success: false, error: 'Invalid voucher type' },
        { status: 400 }
      );
    }
    
    // Validate quantity
    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive number' },
        { status: 400 }
      );
    }
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const voucherType = type as 'twoDish' | 'threeDish';
    const planId =
      body.planId ||
      (Number.isFinite(Number(quantity)) ? toDailyPlanId(voucherType, Number(quantity)) : derivePlanIdFromDaily(voucherType, Number(quantity)));
    const dailyPlan = getDailyPlanById(planId) || getDailyPlanBy(voucherType, Number(quantity));
    const baseSubtotal = dailyPlan?.basePrice;
    if (!baseSubtotal) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan quantity for selected voucher type' },
        { status: 400 }
      );
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
        return NextResponse.json(
          {
            success: false,
            errorCode: preview.errorCode || PromoErrorCode.INVALID_CODE,
            error: preview.message || 'Promo code is not valid'
          },
          { status: 400 }
        );
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
                userId: new mongoose.Types.ObjectId(userId),
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
              userId: new mongoose.Types.ObjectId(userId),
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
        return NextResponse.json(
          { success: false, errorCode: code, error: code.replaceAll('_', ' ') },
          { status: 400 }
        );
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
        userId,
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
      console.log('Sending confirmation email to user:', user.email);
      await sendUserVoucherRequestConfirmation({
        userId,
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
    console.error('Error creating voucher purchase request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create voucher purchase request' },
      { status: 500 }
    );
  }
}
