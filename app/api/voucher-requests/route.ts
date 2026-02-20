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

// GET handler - fetch voucher purchase requests
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    if (userId) {
      query.userId = userId;
    }
    if (status && ['pending', 'approved', 'declined'].includes(status)) {
      query.status = status;
    }
    
    // Execute query with pagination
    const totalCount = await VoucherPurchaseRequest.countDocuments(query);
    const requests = await VoucherPurchaseRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        total: totalCount,
        page,
        limit,
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
    
    const voucherPriceMap: Record<'twoDish' | 'threeDish', Record<number, number>> = {
      twoDish: { 6: 131, 10: 195, 22: 356, 46: 712 },
      threeDish: { 6: 150, 10: 228, 22: 417, 46: 818 }
    };

    const voucherType = type as 'twoDish' | 'threeDish';
    const baseSubtotal = voucherPriceMap[voucherType]?.[Number(quantity)];
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
          subtotal: baseSubtotal
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
