import { errorJson, handleRouteError, parseJsonBody, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { updateBalanceBodySchema } from '@/lib/contracts/user';
import {
  applyBalanceMutations,
  type ApplyBalanceMutationsResult,
  BALANCE_MUTATION_FIELDS,
  BalanceMutationError,
  type BalanceMutationField,
  findBalanceMutationUser,
  isBalanceMutationField,
  toSafeUserBalanceResponse,
} from '@/lib/balances/mutations';
import connectToDatabase from '@/lib/db';
import { getEmailLogoAbsoluteUrl } from '@/lib/email/logo-url';
import mongoose from 'mongoose';
import { sendEmail } from '@/lib/services/email';
import type { Language } from '@/lib/email-translations';
import { getUserDisplayName, withUserDisplayName } from '@/lib/users/display';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBalanceFieldLabel(field: BalanceMutationField, language: Language): string {
  const labels: Record<BalanceMutationField, { en: string; zh: string }> = {
    credits: { en: 'Credits', zh: '积分' },
    twoDishVoucher: { en: '2-dish vouchers', zh: '2菜餐券' },
    threeDishVoucher: { en: '3-dish vouchers', zh: '3菜餐券' },
    weeklySIXmeals: { en: '6-meal weekly meal boxes', zh: '6餐周餐盒' },
    weeklyEIGHTmeals: { en: '8-meal weekly meal boxes', zh: '8餐周餐盒' },
    weeklyTENmeals: { en: '10-meal weekly meal boxes', zh: '10餐周餐盒' },
    weeklyTWELVEmeals: { en: '12-meal weekly meal boxes', zh: '12餐周餐盒' },
    weeklySIXTEENmeals: { en: '16-meal weekly meal boxes', zh: '16餐周餐盒' },
  };

  return labels[field][language];
}

async function sendManualBalanceAdjustmentEmail({
  user,
  field,
  amount,
  operation,
  previousBalance,
  newBalance,
  transactionId,
}: {
  user: Record<string, unknown> & { email?: string; languagePreference?: Language };
  field: BalanceMutationField;
  amount: number;
  operation: 'add' | 'deduct';
  previousBalance: number;
  newBalance: number;
  transactionId?: string;
}) {
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  if (!email) {
    console.warn('Skipping manual balance adjustment email because user email is missing');
    return;
  }

  const language: Language = user.languagePreference === 'en' ? 'en' : 'zh';
  const label = getBalanceFieldLabel(field, language);
  const displayName = getUserDisplayName(user);
  const isAdd = operation === 'add';
  const subject =
    language === 'zh'
      ? `账户余额已${isAdd ? '增加' : '扣除'} - Kapioo`
      : `Account balance ${isAdd ? 'added' : 'deducted'} - Kapioo`;
  const title =
    language === 'zh'
      ? `您的${label}已${isAdd ? '增加' : '扣除'}`
      : `Your ${label} balance was ${isAdd ? 'increased' : 'deducted'}`;
  const intro =
    language === 'zh'
      ? `亲爱的 ${escapeHtml(displayName)}，管理员已${isAdd ? '增加' : '扣除'}您的${label}。`
      : `Dear ${escapeHtml(displayName)}, an administrator ${isAdd ? 'added to' : 'deducted from'} your ${label} balance.`;
  const amountColor = isAdd ? '#4CAF50' : '#D32F2F';
  const amountPrefix = isAdd ? '+' : '-';
  const dateLocale = language === 'zh' ? 'zh-CN' : 'en-US';

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${getEmailLogoAbsoluteUrl()}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${escapeHtml(title)}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">${intro}</p>
      <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #C2884E; margin: 0 0 15px 0;">${language === 'zh' ? '交易确认' : 'Transaction Confirmation'}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${transactionId ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${language === 'zh' ? '交易编号' : 'Transaction ID'}:</td><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${escapeHtml(transactionId)}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${language === 'zh' ? '日期' : 'Date'}:</td><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${new Date().toLocaleDateString(dateLocale)}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${language === 'zh' ? '调整项目' : 'Balance Type'}:</td><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${escapeHtml(label)}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${language === 'zh' ? '调整数量' : 'Adjustment'}:</td><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; color: ${amountColor}; font-weight: bold;">${amountPrefix}${amount}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${language === 'zh' ? '原余额' : 'Previous Balance'}:</td><td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${previousBalance}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">${language === 'zh' ? '新余额' : 'New Balance'}:</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${newBalance}</td></tr>
        </table>
      </div>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px; text-align: center;">
        ${language === 'zh' ? '您可以在您的' : 'You can review your balance in your'} <a href="${BASE_URL}/dashboard" style="color: #C2884E; text-decoration: none; font-weight: bold;">Kapioo ${language === 'zh' ? '账户' : 'Account'}</a>.
      </p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
        <p style="color: #999; font-size: 14px;">
          ${language === 'zh' ? '如有任何问题，请随时联系我们' : 'If you have any questions, please contact us'}: <a href="mailto:kapioomeal@gmail.com" style="color: #C2884E;">kapioomeal@gmail.com</a>
        </p>
        <p style="color: #999; font-size: 13px;">&copy; ${new Date().getFullYear()} Kapioo. ${language === 'zh' ? '保留所有权利。' : 'All rights reserved.'}</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    html,
  });
}

// POST handler - update user balance (credits or vouchers)
export async function POST(request: Request, { params }: RouteContext<{ id: string }>) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { id } = await params;
    const { data, error } = await parseJsonBody(request, updateBalanceBodySchema);
    if (error) {
      return error;
    }

    const field = data.field ?? data.type;
    const { amount, operation, description } = data;
    
    // Validate input
    if (!field || !Number.isInteger(amount) || !operation || amount <= 0) {
      return errorJson('Invalid input', 400);
    }
    
    if (!isBalanceMutationField(field)) {
      return errorJson(
        `Invalid field. Allowed fields: ${BALANCE_MUTATION_FIELDS.join(', ')}`,
        400
      );
    }
    
    // Make sure operation is either add or deduct
    if (operation !== 'add' && operation !== 'deduct') {
      return errorJson('Invalid operation', 400);
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
    let updatedUser:
      | (Record<string, unknown> & {
          email?: string;
          name?: string;
          nickname?: string;
          userID?: string;
          languagePreference?: Language;
        })
      | null = null;
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

        if (typeof user.name !== 'string' || !user.name.trim()) {
          user.name = getUserDisplayName(user);
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

        updatedUser = mutationResultRef.current.user as Record<string, unknown> & {
          email?: string;
          name?: string;
          nickname?: string;
          userID?: string;
          languagePreference?: Language;
        };
        const newBalance = Number(updatedUser[field]) || 0;
        console.log(`[${requestId}] Balance updated successfully - Old: ${currentBalance}, New: ${newBalance}`);
      });
    } finally {
      await session.endSession();
    }

    if (!updatedUser) {
      return errorJson('Failed to update user balance', 500);
    }

    const resolvedUser = updatedUser as Record<string, unknown> & {
      email?: string;
      name?: string;
      nickname?: string;
      userID?: string;
      languagePreference?: Language;
    };

    const newBalance = Number(resolvedUser[field]) || 0;

    try {
      const balanceChange = mutationResultRef.current?.balances[field];
      await sendManualBalanceAdjustmentEmail({
        user: resolvedUser,
        field,
        amount,
        operation,
        previousBalance: balanceChange?.before ?? 0,
        newBalance: balanceChange?.after ?? newBalance,
        transactionId: mutationResultRef.current?.transaction?.transactionId,
      });
      console.log(`[${requestId}] Manual balance adjustment email sent`);
    } catch (emailError) {
      console.error('Error sending manual balance adjustment email:', emailError);
      // Balance updates must not roll back if notification delivery fails.
    }
    
    const userResponse = withUserDisplayName(toSafeUserBalanceResponse(resolvedUser));

    return Response.json({
      success: true,
      data: userResponse,
      meta: {
        transaction: mutationResultRef.current?.transaction || null,
      },
      message: `${operation === 'add' ? 'Added' : 'Deducted'} ${amount} ${field} ${operation === 'add' ? 'to' : 'from'} user's account`
    });
  } catch (error: unknown) {
    if (error instanceof BalanceMutationError) {
      return errorJson(error.message, error.status, {
        details: JSON.stringify(error.details),
      });
    }

    return handleRouteError(error, 'POST /api/users/[id]/update-balance');
  }
}