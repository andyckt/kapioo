import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import {
  applyBalanceMutations,
  type ApplyBalanceMutationsResult,
  BALANCE_MUTATION_FIELDS,
  BalanceMutationError,
  findBalanceMutationUser,
  isBalanceMutationField,
  toSafeUserBalanceResponse,
} from '@/lib/balances/mutations';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';
import { sendEmail } from '@/lib/services/email';
import { getTranslations, type Language } from '@/lib/email-translations';

// Define the route params interface
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST handler - update user balance (credits or vouchers)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { id } = await params;
    const { field, amount, operation, description } = await request.json();
    
    // Validate input
    if (!field || !Number.isInteger(amount) || !operation || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }
    
    if (!isBalanceMutationField(field)) {
      return NextResponse.json(
        { success: false, error: 'Invalid field', allowedFields: BALANCE_MUTATION_FIELDS },
        { status: 400 }
      );
    }
    
    // Make sure operation is either add or deduct
    if (operation !== 'add' && operation !== 'deduct') {
      return NextResponse.json(
        { success: false, error: 'Invalid operation' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Generate unique request ID for logging
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log(`[${requestId}] Balance update request - User: ${id}, Field: ${field}, Amount: ${amount}, Operation: ${operation}`);

    let voucherTypeName = '';
    let shortVoucherName = '';
    switch (field) {
      case 'credits':
        voucherTypeName = 'Credits';
        shortVoucherName = 'Credits';
        break;
      case 'twoDishVoucher':
        voucherTypeName = '2-Dish Vouchers';
        shortVoucherName = '2dish';
        break;
      case 'threeDishVoucher':
        voucherTypeName = '3-Dish Vouchers';
        shortVoucherName = '3dish';
        break;
      case 'weeklySIXmeals':
        voucherTypeName = '6-Meal Weekly Subscription';
        shortVoucherName = '6weekly';
        break;
      case 'weeklyEIGHTmeals':
        voucherTypeName = '8-Meal Weekly Subscription';
        shortVoucherName = '8weekly';
        break;
      case 'weeklyTENmeals':
        voucherTypeName = '10-Meal Weekly Subscription';
        shortVoucherName = '10weekly';
        break;
      case 'weeklyTWELVEmeals':
        voucherTypeName = '12-Meal Weekly Subscription';
        shortVoucherName = '12weekly';
        break;
      case 'weeklySIXTEENmeals':
        voucherTypeName = '16-Meal Weekly Subscription';
        shortVoucherName = '16weekly';
        break;
      default:
        voucherTypeName = field;
        shortVoucherName = field;
    }

    const session = await mongoose.startSession();
    let updatedUser: any = null;
    const mutationResultRef: { current: ApplyBalanceMutationsResult | null } = { current: null };
    try {
      await session.withTransaction(async () => {
        const user = await findBalanceMutationUser(id, session);
        if (!user) {
          throw new BalanceMutationError('User not found', {
            status: 404,
            code: 'USER_NOT_FOUND',
          });
        }

        const currentBalance = Number(user[field]) || 0;
        console.log(`[${requestId}] Current ${field} balance: ${currentBalance}`);

        mutationResultRef.current = await applyBalanceMutations({
          user,
          mutations: [{ field, amount, operation }],
          description: description || `${operation === 'add' ? 'Added' : 'Deducted'} ${amount} ${shortVoucherName}`,
          session,
          actor,
          request,
          auditAction: operation === 'add' ? 'balance.add' : 'balance.deduct',
          auditTargetType: 'user-balance',
          auditMetadata: {
            field,
            amount,
            operation,
            source: 'admin-update-balance',
          },
        });

        updatedUser = mutationResultRef.current.user;
        const newBalance = Number(updatedUser[field]) || 0;
        console.log(`[${requestId}] Balance updated successfully - Old: ${currentBalance}, New: ${newBalance}`);
      });
    } finally {
      await session.endSession();
    }

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user balance' },
        { status: 500 }
      );
    }

    const newBalance = Number(updatedUser[field]) || 0;
    
    // Send email notification when vouchers are added (not when deducted)
    if (operation === 'add' && field !== 'credits') {
      try {
        const LOGO_URL = 'https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/src/Kapioo.png';
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        // Get user's language preference
        const language: Language = updatedUser.languagePreference || 'zh';
        const t = getTranslations(language);
        
        // Get voucher type display name based on language
        let voucherTypeName = '';
        let emailSubject = '';
        
        switch (field) {
          case 'twoDishVoucher':
            voucherTypeName = t.account.twoDishVoucherName;
            emailSubject = t.account.twoDishVoucherAdded;
            break;
          case 'threeDishVoucher':
            voucherTypeName = t.account.threeDishVoucherName;
            emailSubject = t.account.threeDishVoucherAdded;
            break;
          case 'weeklySIXmeals':
            voucherTypeName = t.account.weeklySixMeals;
            emailSubject = t.account.weeklySixMealsAdded;
            break;
          case 'weeklyEIGHTmeals':
            voucherTypeName = t.account.weeklyEightMeals;
            emailSubject = t.account.weeklyEightMealsAdded;
            break;
          case 'weeklyTENmeals':
            voucherTypeName = t.account.weeklyTenMeals;
            emailSubject = t.account.weeklyTenMealsAdded;
            break;
          case 'weeklyTWELVEmeals':
            voucherTypeName = t.account.weeklyTwelveMeals;
            emailSubject = t.account.weeklyTwelveMealsAdded;
            break;
          case 'weeklySIXTEENmeals':
            voucherTypeName = t.account.weeklySixteenMeals;
            emailSubject = t.account.weeklySixteenMealsAdded;
            break;
          default:
            voucherTypeName = language === 'zh' ? '餐券' : 'Vouchers';
            emailSubject = t.account.voucherAdded;
        }

        // Send email notification
        const subject = `${emailSubject} - Kapioo`;
        
        const transactionConfirmation = language === 'zh' ? '交易确认' : 'Transaction Confirmation';
        const voucherAddedToAccount = language === 'zh' 
          ? `${voucherTypeName}已添加到您的账户`
          : `${voucherTypeName} added to your account`;
        const voucherSuccessfullyAdded = language === 'zh'
          ? `亲爱的 ${updatedUser.name}，${voucherTypeName}已成功添加到您的账户。`
          : `Dear ${updatedUser.name}, ${voucherTypeName} have been successfully added to your account.`;
        const dateLocale = language === 'zh' ? 'zh-CN' : 'en-US';
        const voucherUnit = language === 'zh' ? '张' : '';
        const newBalanceLabel = language === 'zh' ? `新${voucherTypeName}余额` : `New ${voucherTypeName} Balance`;
        const yourAccount = language === 'zh' ? 'Kapioo 账户' : 'Kapioo Account';
        const contactUs = language === 'zh' 
          ? '如有任何问题，请随时联系我们'
          : 'If you have any questions, please contact us';
        
        const html = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
            </div>
            <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${voucherAddedToAccount}</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              ${voucherSuccessfullyAdded}
            </p>
            
            <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <div style="margin-bottom: 15px;">
                <h3 style="color: #C2884E; margin: 0 0 5px 0;">${transactionConfirmation}</h3>
                <p style="color: #666; margin: 0;">${voucherAddedToAccount}</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${t.account.date}:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${new Date().toLocaleDateString(dateLocale)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${t.account.addedAmount}:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; color: #4CAF50; font-weight: bold;">+${amount}${voucherUnit} ${voucherTypeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${newBalanceLabel}:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; font-weight: bold;">${newBalance}${voucherUnit} ${voucherTypeName}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px; text-align: center;">
              ${t.account.youCanUseVouchers}. <a href="${BASE_URL}/dashboard" style="color: #C2884E; text-decoration: none; font-weight: bold;">${yourAccount}</a>
            </p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
              <p style="color: #999; font-size: 14px;">
                ${contactUs}: <a href="mailto:kapioomeal@gmail.com" style="color: #C2884E;">kapioomeal@gmail.com</a>
              </p>
              <p style="color: #999; font-size: 13px;">&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
            </div>
          </div>
        `;
        
        await sendEmail({
          to: updatedUser.email,
          subject,
          html
        });
        
        console.log(`${voucherTypeName} added notification sent`);
      } catch (emailError) {
        console.error('Error sending voucher added notification:', emailError);
        // Continue even if email fails
      }
    }
    
    const userResponse = toSafeUserBalanceResponse(updatedUser);

    return NextResponse.json({ 
      success: true, 
      data: userResponse,
      meta: {
        transaction: mutationResultRef.current?.transaction || null,
      },
      message: `${operation === 'add' ? 'Added' : 'Deducted'} ${amount} ${field} ${operation === 'add' ? 'to' : 'from'} user's account`
    });
  } catch (error: any) {
    if (error instanceof BalanceMutationError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.details },
        { status: error.status }
      );
    }

    console.error(`Error updating user balance:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user balance', details: error.message },
      { status: 500 }
    );
  }
}