import { getTranslations, type Language } from '@/lib/email-translations';
import { buildCanonicalBreakdown } from '@/lib/price-breakdown';
import { buildPlanLabel, getWeeklyPlanBy } from '@/lib/plans/service';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Send an email using Resend (professional transactional email service)
export const sendEmail = async (options: EmailOptions) => {
  try {
    console.log('Sending email to:', options.to);
    console.log('Email subject:', options.subject);
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.log('Sending email from browser environment via API route');
      // We're in the browser, use the API route
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('Email API route returned error:', result.error);
        throw new Error(result.error || 'Failed to send email via API');
      }
      
      console.log('Email sent successfully via API route');
      return result;
    } else {
      console.log('Sending email from server environment using Resend');
      // We're on the server, use Resend for better deliverability
      const { sendEmailWithResend } = await import('./resend-email');
      const result = await sendEmailWithResend(options);
      console.log('Email sent successfully via Resend');
      return result;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Generate a random 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Kapioo logo hosted on kapioo.com domain for better email deliverability
// This is the same image that was previously on S3, now hosted on our domain
const LOGO_URL = 'https://www.kapioo.com/kapioo-logo.png';

/** Format delivery address for emails. city/province removed — area shown separately. */
function formatEmailAddress(addr: any, unitLabel: string, buzzLabel: string): string {
  if (!addr) return '';
  let out = '';
  if (addr.unitNumber) out += `${unitLabel} ${addr.unitNumber}, `;
  const parts = [addr.streetAddress, addr.postalCode, addr.country].filter((p) => p != null && p !== '');
  out += parts.join(', ');
  if (addr.buzzCode) out += ` (${buzzLabel}: ${addr.buzzCode})`;
  return out;
}

// Send a welcome email to new users
export const sendWelcomeEmail = async (to: string, name: string, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${t.account.welcomeToKapioo}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${name}, ${t.account.thankYouForJoining}
      </p>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto;">
        <h3 style="color: #C2884E; margin-top: 0; text-align: center; font-size: 18px;">${t.account.accountCreated}</h3>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
          ${t.account.accountCreatedDesc}
        </p>
        <div style="text-align: center;">
          <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">${t.account.goToDashboard}</a>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 35px 0;">
        <div style="width: 30%; text-align: center; padding: 15px;">
          <div style="width: 60px; height: 60px; background-color: #FFF6EF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
            <span style="font-size: 30px;">🍽️</span>
          </div>
          <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">${t.account.exploreMenu}</h4>
          <p style="color: #666; font-size: 14px; margin: 0;">${t.account.exploreMenuDesc}</p>
        </div>
        <div style="width: 30%; text-align: center; padding: 15px;">
          <div style="width: 60px; height: 60px; background-color: #FFF6EF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
            <span style="font-size: 30px;">📋</span>
          </div>
          <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">${t.account.choosePlan}</h4>
          <p style="color: #666; font-size: 14px; margin: 0;">${t.account.choosePlanDesc}</p>
        </div>
        <div style="width: 30%; text-align: center; padding: 15px;">
          <div style="width: 60px; height: 60px; background-color: #FFF6EF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
            <span style="font-size: 30px;">🚚</span>
          </div>
          <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">${t.account.onTimeDelivery}</h4>
          <p style="color: #666; font-size: 14px; margin: 0;">${t.account.onTimeDeliveryDesc}</p>
        </div>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
        <p style="color: #999; font-size: 14px; margin-bottom: 15px;">${t.account.followUs}</p>
        <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 20px; align-items: center;">
          <a href="https://www.xiaohongshu.com/user/profile/66ad59e5000000001d0303d8?xsec_token=YBlVGv-hVLpDCO5YkHnFDzsnUYaHdUVHDV87mIVi0Brnw=&xsec_source=app_share&xhsshare=CopyLink&shareRedId=ODw5MjdJRk82NzUyOTgwNjY2OTo0PD89&apptime=1767759588" target="_blank" style="display: inline-block; width: 40px; height: 40px; background-color: #FF2442; border-radius: 8px; text-decoration: none; line-height: 40px; text-align: center;">
            <span style="font-size: 24px; vertical-align: middle;">📕</span>
          </a>
          <a href="https://www.instagram.com/kapioo_official?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" style="display: inline-block; width: 40px; height: 40px; background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%); border-radius: 8px; text-decoration: none; line-height: 40px; text-align: center;">
            <span style="font-size: 24px; vertical-align: middle;">📸</span>
          </a>
        </div>
        <p style="color: #999; font-size: 13px;">&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
      </div>
    </div>
  `;
  
  const subject = language === 'zh' 
    ? `欢迎加入Kapioo，${name}！` 
    : `Welcome to Kapioo, ${name}!`;
  
  return sendEmail({
    to,
    subject,
    html,
  });
};

// Send a verification email with 6-digit code
export const sendVerificationEmail = async (to: string, code: string, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${t.account.verifyYourEmail}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${t.account.verificationRequired}:
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto; width: 60%; max-width: 360px;">
        <tr>
          <td bgcolor="#C2884E" style="background-color: #C2884E; border-radius: 8px; padding: 20px; text-align: center; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; line-height: 1.4;">
            ${code}
          </td>
        </tr>
      </table>
      <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
        ${t.account.codeExpiresIn}
      </p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
      </div>
    </div>
  `;
  
  const subject = language === 'zh' 
    ? '验证您的邮箱 - Kapioo'
    : 'Verify Your Email - Kapioo';
  
  return sendEmail({
    to,
    subject,
    html,
  });
};

export const sendAdminMfaCodeEmail = async (
  to: string,
  code: string,
  name: string,
  language: Language = 'zh'
) => {
  const subject =
    language === 'zh'
      ? '管理员登录验证码 - Kapioo'
      : 'Admin Login Verification Code - Kapioo';

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">
        ${language === 'zh' ? '管理员二次验证' : 'Admin Multi-Factor Verification'}
      </h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
        ${language === 'zh'
          ? `${name}，请输入以下验证码以继续访问管理后台。`
          : `${name}, enter the verification code below to continue to the admin dashboard.`}
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto; width: 60%; max-width: 360px;">
        <tr>
          <td bgcolor="#C2884E" style="background-color: #C2884E; border-radius: 8px; padding: 20px; text-align: center; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; line-height: 1.4;">
            ${code}
          </td>
        </tr>
      </table>
      <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
        ${language === 'zh'
          ? '验证码将在 10 分钟后失效。如果不是您本人操作，请立即重置管理员密码并检查系统访问日志。'
          : 'This code expires in 10 minutes. If this was not you, reset the admin password immediately and review system access logs.'}
      </p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo. ${language === 'zh' ? '保留所有权利。' : 'All rights reserved.'}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
};

// Send a password reset email with 6-digit code
export const sendPasswordResetEmail = async (to: string, code: string, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${t.account.resetYourPassword}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${t.account.resetPasswordPrompt}. ${t.account.enterResetCode}:
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto; width: 60%; max-width: 360px;">
        <tr>
          <td bgcolor="#C2884E" style="background-color: #C2884E; border-radius: 8px; padding: 20px; text-align: center; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; line-height: 1.4;">
            ${code}
          </td>
        </tr>
      </table>
      <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
        ${t.account.resetCodeExpiresIn}. ${t.account.didNotRequest}.
      </p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
      </div>
    </div>
  `;
  
  const subject = language === 'zh' 
    ? '重置您的密码 - Kapioo'
    : 'Reset Your Password - Kapioo';
  
  return sendEmail({
    to,
    subject,
    html,
  });
};

// Send notification to admin for credit purchase requests
export const sendAdminNotification = async (subject: string, message: string) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'kapioomeal@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">管理员通知</h2>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          ${message}
        </p>
        <div style="text-align: center;">
          <a href="${baseUrl}/admin" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">进入管理后台</a>
        </div>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: adminEmail,
    subject: `[Kapioo Admin] ${subject}`,
    html,
  });
};

// Send notification to admin about new credit purchase request
export const sendAdminCreditRequestNotification = async (requestDetails: {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  paymentMethod: 'wechat' | 'emt';
  originalPrice: number;
  originalSubtotal?: number;
  mealSubtotal?: number;
  deliveryFeePerWeek?: number;
  deliveryFeeTotal?: number;
  finalTotal?: number;
  taxRate?: number;
  taxAmount?: number;
  promoCode?: string;
  promoDiscountAmount?: number;
  imageProofUrl: string;
  referenceNumber?: string;
  notes?: string;
  planDescription?: string;
  requestId: string;
  userAddress?: {
    unitNumber?: string;
    streetAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    buzzCode?: string;
  } | null;
  mealPlanQuantity?: number;
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'kapioomeal@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminDashboardLink = `${baseUrl}/admin?tab=credit-requests`;
  const breakdown = buildCanonicalBreakdown({
    requestType: 'weekly',
    paymentMethod: requestDetails.paymentMethod,
    amount: requestDetails.amount,
    originalPrice: requestDetails.originalPrice,
    originalSubtotal: requestDetails.originalSubtotal,
    finalTotal: requestDetails.finalTotal,
    promoDiscountAmount: requestDetails.promoDiscountAmount,
    taxAmount: requestDetails.taxAmount,
    mealSubtotal: requestDetails.mealSubtotal,
    deliveryFeePerWeek: requestDetails.deliveryFeePerWeek,
    deliveryFeeTotal: requestDetails.deliveryFeeTotal,
    mealPlanQuantity: requestDetails.mealPlanQuantity
  });
  const mealSubtotal = breakdown.mealSubtotal;
  const deliveryFeePerWeek = breakdown.deliveryFeePerWeek;
  const deliveryFeeTotal = breakdown.deliveryFeeTotal;
  const promoDiscount = breakdown.promoDiscount;
  const taxAmount = breakdown.taxAmount;
  const finalTotal = breakdown.finalTotal;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">新的周次充值请求待审核</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        用户 <strong>${requestDetails.userName}</strong> (${requestDetails.userEmail}) 提交了一个新的充值请求。
      </p>
      <ul style="list-style: none; padding: 0; margin-bottom: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9;">
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>请求ID:</strong> ${requestDetails.requestId}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>付款方式:</strong> ${requestDetails.paymentMethod === 'wechat' ? '微信转账' : 'Interac e-Transfer'}</li>
        ${requestDetails.referenceNumber ? `<li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>参考号码:</strong> ${requestDetails.referenceNumber}</li>` : ''}
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>小计:</strong> $${mealSubtotal.toFixed(2)}</li>
        ${requestDetails.promoCode ? `<li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>优惠折扣 (${requestDetails.promoCode}):</strong> -$${promoDiscount.toFixed(2)}</li>` : ''}
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>配送费:</strong> $${deliveryFeeTotal.toFixed(2)}${deliveryFeePerWeek > 0 ? ` ($${deliveryFeePerWeek.toFixed(2)} × ${requestDetails.mealPlanQuantity || 1} 周)` : ''}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>税费:</strong> $${taxAmount.toFixed(2)}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>实际付款:</strong> $${finalTotal.toFixed(2)} ${requestDetails.paymentMethod === 'wechat' ? '(含10%折扣)' : '(含13%税费)'}</li>
        ${requestDetails.planDescription ? `<li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>所选套餐:</strong> ${requestDetails.planDescription}</li>` : ''}
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>备注:</strong> ${requestDetails.notes || '无'}</li>
        
        ${requestDetails.userAddress ? `
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>用户地址信息:</strong></li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee; padding-left: 25px;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${requestDetails.userAddress.unitNumber ? `<li style="padding: 3px 0;"><strong>单元号码:</strong> ${requestDetails.userAddress.unitNumber}</li>` : ''}
            ${requestDetails.userAddress.streetAddress ? `<li style="padding: 3px 0;"><strong>街道地址:</strong> ${requestDetails.userAddress.streetAddress}</li>` : ''}
            ${requestDetails.userAddress.province ? `<li style="padding: 3px 0;"><strong>区域:</strong> ${requestDetails.userAddress.province}</li>` : ''}
            ${requestDetails.userAddress.postalCode ? `<li style="padding: 3px 0;"><strong>邮政编码:</strong> ${requestDetails.userAddress.postalCode}</li>` : ''}
            ${requestDetails.userAddress.country ? `<li style="padding: 3px 0;"><strong>国家:</strong> ${requestDetails.userAddress.country}</li>` : ''}
            ${requestDetails.userAddress.buzzCode ? `<li style="padding: 3px 0;"><strong>门禁密码:</strong> ${requestDetails.userAddress.buzzCode}</li>` : ''}
          </ul>
        </li>
        ` : `<li style="padding: 10px 15px;"><strong>用户地址信息:</strong> 未提供</li>`}
      </ul>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        请点击下方链接查看付款凭证并进行审核：
      </p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${requestDetails.imageProofUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">查看付款凭证</a>
      </div>
      <div style="text-align: center;">
        <a href="${adminDashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">前往管理后台审核</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `新的周次充值请求 (#${requestDetails.requestId}) 待审核`,
    html,
  });
};

// Send confirmation email to user after submitting a credit purchase request
export const sendUserCreditRequestConfirmation = async (requestDetails: {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  paymentMethod: 'wechat' | 'emt';
  originalPrice: number;
  originalSubtotal?: number;
  mealSubtotal?: number;
  deliveryFeePerWeek?: number;
  deliveryFeeTotal?: number;
  finalTotal?: number;
  taxRate?: number;
  taxAmount?: number;
  promoCode?: string;
  promoDiscountAmount?: number;
  requestId: string;
  referenceNumber?: string;
  planDescription?: string;
  mealPlanQuantity?: number;
}, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  const paymentMethodText = requestDetails.paymentMethod === 'wechat' ? t.account.wechatTransfer : t.account.interacTransfer;
  const paymentNote = requestDetails.paymentMethod === 'wechat' 
    ? `(${t.account.wechatDiscount})` 
    : `(${t.account.taxIncluded})`;
  const breakdown = buildCanonicalBreakdown({
    requestType: 'weekly',
    paymentMethod: requestDetails.paymentMethod,
    amount: requestDetails.amount,
    originalPrice: requestDetails.originalPrice,
    originalSubtotal: requestDetails.originalSubtotal,
    finalTotal: requestDetails.finalTotal,
    promoDiscountAmount: requestDetails.promoDiscountAmount,
    taxAmount: requestDetails.taxAmount,
    mealSubtotal: requestDetails.mealSubtotal,
    deliveryFeePerWeek: requestDetails.deliveryFeePerWeek,
    deliveryFeeTotal: requestDetails.deliveryFeeTotal,
    mealPlanQuantity: requestDetails.mealPlanQuantity
  });
  const mealSubtotal = breakdown.mealSubtotal;
  const deliveryFeePerWeek = breakdown.deliveryFeePerWeek;
  const deliveryFeeTotal = breakdown.deliveryFeeTotal;
  const promoDiscount = breakdown.promoDiscount;
  const taxAmount = breakdown.taxAmount;
  const finalTotal = breakdown.finalTotal;
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${t.account.creditRequestSubmitted}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${language === 'zh' ? '亲爱的' : 'Dear'} <strong>${requestDetails.userName}</strong>,
      </p>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        ${t.account.thankYouForRequest}. ${t.account.requestDetailsBelow}:
      </p>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin-bottom: 30px;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.requestId}:</strong> ${requestDetails.requestId}</li>
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.paymentMethod}:</strong> ${paymentMethodText}</li>
          ${requestDetails.referenceNumber ? `<li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.referenceNumber}:</strong> ${requestDetails.referenceNumber}</li>` : ''}
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${language === 'zh' ? '小计' : 'Subtotal'}:</strong> $${mealSubtotal.toFixed(2)}</li>
          ${requestDetails.promoCode ? `<li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${language === 'zh' ? '优惠折扣' : 'Promo Discount'} (${requestDetails.promoCode}):</strong> -$${promoDiscount.toFixed(2)}</li>` : ''}
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${language === 'zh' ? '配送费' : 'Delivery fee'}:</strong> $${deliveryFeeTotal.toFixed(2)}${deliveryFeePerWeek > 0 ? ` ($${deliveryFeePerWeek.toFixed(2)} × ${requestDetails.mealPlanQuantity || 1} ${language === 'zh' ? '周' : 'weeks'})` : ''}</li>
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${language === 'zh' ? '税费' : 'Tax'}:</strong> $${taxAmount.toFixed(2)}</li>
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.actualPayment}:</strong> $${finalTotal.toFixed(2)} ${paymentNote}</li>
          ${requestDetails.planDescription ? `<li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.selectedPlan}:</strong> ${requestDetails.planDescription}</li>` : ''}
          <li style="padding: 10px 0;"><strong>${t.account.status}:</strong> <span style="color: #F59E0B; font-weight: 500;">${t.account.pendingReview}</span></li>
        </ul>
      </div>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${t.account.adminWillReview}.
      </p>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        ${t.account.contactForQuestions}.
      </p>
      <div style="text-align: center;">
        <a href="${baseUrl}/dashboard?tab=credits" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">${t.account.viewCreditHistory}</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>${t.account.autoGeneratedEmail}.</p>
        <p>&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: requestDetails.userEmail,
    subject: `[Kapioo] ${t.account.creditRequestSubmitted} (#${requestDetails.requestId})`,
    html,
  });
};

// Send notification to admin about new voucher purchase request
export const sendAdminVoucherRequestNotification = async (requestDetails: {
  userId: string;
  userName: string;
  userEmail: string;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  amount: number;
  originalSubtotal?: number;
  finalTotal?: number;
  taxRate?: number;
  promoCode?: string;
  promoDiscountAmount?: number;
  imageProofUrl: string;
  referenceNumber?: string;
  notes?: string;
  requestId: string;
  userAddress?: {
    unitNumber?: string;
    streetAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    buzzCode?: string;
  } | null;
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'kapioomeal@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminDashboardLink = `${baseUrl}/admin?tab=meal-vouchers`;

  const voucherTypeText = requestDetails.type === 'twoDish' ? '2菜餐券' : '3菜餐券';
  const breakdown = buildCanonicalBreakdown({
    requestType: 'daily',
    amount: requestDetails.amount,
    originalSubtotal: requestDetails.originalSubtotal,
    finalTotal: requestDetails.finalTotal,
    promoDiscountAmount: requestDetails.promoDiscountAmount
  });
  const subtotal = breakdown.mealSubtotal;
  const promoDiscount = breakdown.promoDiscount;
  const taxAmount = breakdown.taxAmount;
  const finalTotal = breakdown.finalTotal;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">新的${voucherTypeText}购买请求待审核</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        用户 <strong>${requestDetails.userName}</strong> (${requestDetails.userEmail}) 提交了一个新的餐券购买请求。
      </p>
      <ul style="list-style: none; padding: 0; margin-bottom: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9;">
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>请求ID:</strong> ${requestDetails.requestId}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>餐券类型:</strong> ${voucherTypeText}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>餐券数量:</strong> ${requestDetails.quantity}</li>
        ${requestDetails.referenceNumber ? `<li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>参考号码:</strong> ${requestDetails.referenceNumber}</li>` : ''}
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>小计:</strong> $${subtotal.toFixed(2)}</li>
        ${requestDetails.promoCode ? `<li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>优惠折扣 (${requestDetails.promoCode}):</strong> -$${promoDiscount.toFixed(2)}</li>` : ''}
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>税费:</strong> $${taxAmount.toFixed(2)}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>付款金额:</strong> $${finalTotal.toFixed(2)}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>备注:</strong> ${requestDetails.notes || '无'}</li>
        
        ${requestDetails.userAddress ? `
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>用户地址信息:</strong></li>
        <li style="padding: 10px 15px; padding-left: 25px;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${requestDetails.userAddress.unitNumber ? `<li style="padding: 3px 0;"><strong>单元号码:</strong> ${requestDetails.userAddress.unitNumber}</li>` : ''}
            ${requestDetails.userAddress.streetAddress ? `<li style="padding: 3px 0;"><strong>街道地址:</strong> ${requestDetails.userAddress.streetAddress}</li>` : ''}
            ${requestDetails.userAddress.province ? `<li style="padding: 3px 0;"><strong>区域:</strong> ${requestDetails.userAddress.province}</li>` : ''}
            ${requestDetails.userAddress.postalCode ? `<li style="padding: 3px 0;"><strong>邮政编码:</strong> ${requestDetails.userAddress.postalCode}</li>` : ''}
            ${requestDetails.userAddress.country ? `<li style="padding: 3px 0;"><strong>国家:</strong> ${requestDetails.userAddress.country}</li>` : ''}
            ${requestDetails.userAddress.buzzCode ? `<li style="padding: 3px 0;"><strong>门禁密码:</strong> ${requestDetails.userAddress.buzzCode}</li>` : ''}
          </ul>
        </li>
        ` : `<li style="padding: 10px 15px;"><strong>用户地址信息:</strong> 未提供</li>`}
      </ul>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        请点击下方链接查看付款凭证并进行审核：
      </p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${requestDetails.imageProofUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;" target="_blank">查看付款凭证</a>
      </div>
      <div style="text-align: center;">
        <a href="${adminDashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">前往管理后台审核</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `新的${voucherTypeText}购买请求 (#${requestDetails.requestId}) 待审核`,
    html,
  });
};

// Send confirmation email to user after submitting a voucher purchase request
export const sendUserVoucherRequestConfirmation = async (requestDetails: {
  userId: string;
  userName: string;
  userEmail: string;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  amount: number;
  originalSubtotal?: number;
  finalTotal?: number;
  taxRate?: number;
  promoCode?: string;
  promoDiscountAmount?: number;
  requestId: string;
  referenceNumber?: string;
  notes?: string;
}, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  const voucherTypeText = requestDetails.type === 'twoDish' ? t.account.twoDishMeal : t.account.threeDishMeal;
  const notesLabel = language === 'zh' ? '备注' : 'Notes';
  const paymentAmountLabel = language === 'zh' ? '付款金额' : 'Payment Amount';
  const breakdown = buildCanonicalBreakdown({
    requestType: 'daily',
    amount: requestDetails.amount,
    originalSubtotal: requestDetails.originalSubtotal,
    finalTotal: requestDetails.finalTotal,
    promoDiscountAmount: requestDetails.promoDiscountAmount
  });
  const subtotal = breakdown.mealSubtotal;
  const promoDiscount = breakdown.promoDiscount;
  const taxAmount = breakdown.taxAmount;
  const finalTotal = breakdown.finalTotal;
  const adminWillReviewVouchers = language === 'zh'
    ? '我们的管理员将尽快审核您的请求。一旦审核通过，餐券将立即添加到您的账户中，您将收到确认邮件'
    : 'Our administrator will review your request as soon as possible. Once approved, vouchers will be added to your account immediately and you will receive a confirmation email';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${t.account.voucherRequestSubmitted}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${language === 'zh' ? '亲爱的' : 'Dear'} <strong>${requestDetails.userName}</strong>,
      </p>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        ${t.account.thankYouForRequest}. ${t.account.requestDetailsBelow}:
      </p>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin-bottom: 30px;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.requestId}:</strong> ${requestDetails.requestId}</li>
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.voucherType}:</strong> ${voucherTypeText}</li>
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.voucherQuantity}:</strong> ${requestDetails.quantity}</li>
          ${requestDetails.referenceNumber ? `<li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${t.account.referenceNumber}:</strong> ${requestDetails.referenceNumber}</li>` : ''}
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${language === 'zh' ? '小计' : 'Subtotal'}:</strong> $${subtotal.toFixed(2)}</li>
          ${requestDetails.promoCode ? `<li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${language === 'zh' ? '优惠折扣' : 'Promo Discount'} (${requestDetails.promoCode}):</strong> -$${promoDiscount.toFixed(2)}</li>` : ''}
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${language === 'zh' ? '税费' : 'Tax'}:</strong> $${taxAmount.toFixed(2)}</li>
          <li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${paymentAmountLabel}:</strong> $${finalTotal.toFixed(2)}</li>
          ${requestDetails.notes ? `<li style="padding: 10px 0; border-bottom: 1px dashed #E8D5C4;"><strong>${notesLabel}:</strong> ${requestDetails.notes}</li>` : ''}
          <li style="padding: 10px 0;"><strong>${t.account.status}:</strong> <span style="color: #F59E0B; font-weight: 500;">${t.account.pendingReview}</span></li>
        </ul>
      </div>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${adminWillReviewVouchers}.
      </p>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        ${t.account.contactForQuestions}.
      </p>
      <div style="text-align: center;">
        <a href="${baseUrl}/dashboard?tab=meal-vouchers" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">${t.account.viewVoucherHistory}</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>${t.account.autoGeneratedEmail}.</p>
        <p>&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: requestDetails.userEmail,
    subject: `[Kapioo] ${t.account.voucherRequestSubmitted} (#${requestDetails.requestId})`,
    html,
  });
};

// Send notification to user for credit purchase status
export const sendCreditPurchaseStatusEmail = async (to: string, name: string, requestId: string, status: 'approved' | 'declined', credits?: number, planDescription?: string, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  let statusText = '';
  let statusColor = '';
  let statusMessage = '';
  
  if (status === 'approved') {
    statusText = t.account.requestApproved;
    statusColor = '#4CAF50';
    statusMessage = planDescription 
      ? (language === 'zh' 
          ? `${t.account.requestApproved}，${planDescription.replace(/星期$/, '张 ')}${t.account.creditsAddedToAccount.replace('餐券已添加到您的账户', '已添加到您的账户')}。`
          : `${t.account.creditPurchaseApproved}. ${planDescription} ${t.account.creditsAddedToAccount.toLowerCase()}.`)
      : t.account.creditsAddedToAccount;
  } else {
    statusText = t.account.requestDeclined;
    statusColor = '#F44336';
    statusMessage = language === 'zh'
      ? `${t.account.sorryForInconvenience}，您的充值请求未获批准。${t.account.contactForQuestions}。`
      : `${t.account.sorryForInconvenience}. ${t.account.contactForQuestions}.`;
  }
  
  const viewMyPlan = language === 'zh' ? '查看我的套餐' : 'View My Plans';
  const statusUpdate = language === 'zh' ? '充值状态更新' : 'Credit Purchase Status Update';
  const yourRequestUpdated = language === 'zh' ? '您的请求状态已更新' : 'Your request status has been updated';
  const selectedPlan = language === 'zh' ? '所选套餐' : 'Selected Plan';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${statusUpdate}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${name}, ${yourRequestUpdated}:
      </p>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto; text-align: center;">
        <div style="display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; margin-bottom: 15px;">
          ${statusText}
        </div>
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          ${t.account.requestId}: ${requestId}
        </p>
        ${planDescription ? `
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          ${selectedPlan}: ${planDescription}
        </p>
        ` : ''}
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          ${statusMessage}
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: transform 0.3s;">${viewMyPlan}</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
      </div>
    </div>
  `;
  
  const subjectText = status === 'approved' 
    ? (language === 'zh' ? '已批准' : 'Approved')
    : (language === 'zh' ? '已拒绝' : 'Declined');
  
  return sendEmail({
    to,
    subject: `[Kapioo] ${language === 'zh' ? '您的餐券充值请求' : 'Your Credit Purchase Request'} ${subjectText}`,
    html,
  });
};

// Send notification to user for voucher purchase status
export const sendVoucherPurchaseStatusEmail = async (to: string, name: string, requestId: string, status: 'approved' | 'declined', voucherType: 'twoDish' | 'threeDish', quantity: number, adminNotes?: string, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  const voucherTypeText = voucherType === 'twoDish' ? t.account.twoDishMeal : t.account.threeDishMeal;
  let statusText = '';
  let statusColor = '';
  let statusMessage = '';
  
  if (status === 'approved') {
    statusText = t.account.requestApproved;
    statusColor = '#4CAF50';
    statusMessage = language === 'zh'
      ? `您的${voucherTypeText}购买请求已获批准，${quantity}张${voucherTypeText}已添加到您的账户。`
      : `Your ${voucherTypeText} purchase request has been approved. ${quantity} ${voucherTypeText} vouchers have been added to your account.`;
  } else {
    statusText = t.account.requestDeclined;
    statusColor = '#F44336';
    statusMessage = language === 'zh'
      ? `很遗憾，您的${voucherTypeText}购买请求未获批准。${adminNotes ? `${t.account.adminNotes}: ${adminNotes}` : `${t.account.contactForQuestions}。`}`
      : `${t.account.sorryForInconvenience}. Your ${voucherTypeText} purchase request has not been approved. ${adminNotes ? `${t.account.adminNotes}: ${adminNotes}` : t.account.contactForQuestions}`;
  }
  
  const statusUpdateTitle = language === 'zh' 
    ? `${voucherTypeText}购买状态更新`
    : `${voucherTypeText} Purchase Status Update`;
  const yourRequestUpdated = language === 'zh'
    ? `您的${voucherTypeText}购买请求状态已更新`
    : `Your ${voucherTypeText} purchase request status has been updated`;
  const viewMyVouchers = language === 'zh' ? '查看我的餐券' : 'View My Vouchers';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${statusUpdateTitle}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${name}, ${yourRequestUpdated}:
      </p>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto; text-align: center;">
        <div style="display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; margin-bottom: 15px;">
          ${statusText}
        </div>
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          ${t.account.requestId}: ${requestId}
        </p>
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          ${t.account.voucherType}: ${voucherTypeText}
        </p>
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          ${t.account.voucherQuantity}: ${quantity}
        </p>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          ${statusMessage}
        </p>
        ${adminNotes && status === 'approved' ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #C2884E30;">
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            <strong>${t.account.adminNotes}:</strong> ${adminNotes}
          </p>
        </div>
        ` : ''}
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: transform 0.3s;">${viewMyVouchers}</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
      </div>
    </div>
  `;
  
  const subjectStatus = status === 'approved' 
    ? (language === 'zh' ? '已批准' : 'Approved')
    : (language === 'zh' ? '已拒绝' : 'Declined');
  const yourText = language === 'zh' ? '您的' : 'Your';
  const purchaseRequest = language === 'zh' ? '购买请求' : 'Purchase Request';
  
  return sendEmail({
    to,
    subject: `[Kapioo] ${yourText}${voucherTypeText}${purchaseRequest} ${subjectStatus}`,
    html,
  });
};

// Send order confirmation email to user for weekly subscription
export const sendWeeklyOrderConfirmationEmail = async (to: string, name: string, orderDetails: {
  orderId: string;
  items: Array<{
    optionName: string;
    quantity: number;
    dayId: string;
    date: string;
  }>;
  totalCredits: number;
  deliveryAddress: any;
  area: string;
  phoneNumber: string;
  specialInstructions?: string;
}, language: 'zh' | 'en' = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Fetch meal option translations if language is English
  let mealOptionTranslations: Record<string, string> = {};
  if (language === 'en') {
    try {
      const WeeklyMealOption = (await import('@/models/WeeklyMealOption')).default;
      const connectToDatabase = (await import('@/lib/db')).default;
      await connectToDatabase();
      
      const mealOptions = await WeeklyMealOption.find({ nameEn: { $exists: true, $ne: null } });
      mealOptions.forEach((option: any) => {
        if (option.name && option.nameEn) {
          mealOptionTranslations[option.name] = option.nameEn;
        }
      });
    } catch (error) {
      console.error('Error fetching meal option translations for email:', error);
      // Continue without translations if fetch fails
    }
  }
  
  // Helper function to translate meal option names
  const translateOptionName = (optionName: string): string => {
    if (language === 'zh') return optionName;
    return mealOptionTranslations[optionName] || optionName;
  };
  
  // Language-specific text
  const text = {
    zh: {
      orderConfirmation: '订单确认',
      thankYou: '感谢您的订购！您的订单已成功提交。',
      orderDetails: '订单详情',
      orderNumber: '订单号',
      selectedMeals: '已选餐点',
      total: '总计',
      deliveryInfo: '配送信息',
      area: '区域',
      phone: '电话',
      address: '地址',
      specialInstructions: '特别说明',
      unit: '单元',
      buzzCode: '门禁码',
      viewMyOrders: '查看我的订单',
      contactSupport: '如有任何问题，请联系我们的客服团队。',
      allRightsReserved: '保留所有权利。',
      sunday: '周日',
      tuesday: '周二',
      meals: '餐',
      voucher: '张',
      mealsPerWeek: (count: number) => `${count}餐一周`
    },
    en: {
      orderConfirmation: 'Order Confirmation',
      thankYou: 'Thank you for your order! Your order has been successfully submitted.',
      orderDetails: 'Order Details',
      orderNumber: 'Order Number',
      selectedMeals: 'Selected Meals',
      total: 'Total',
      deliveryInfo: 'Delivery Information',
      area: 'Area',
      phone: 'Phone',
      address: 'Address',
      specialInstructions: 'Special Instructions',
      unit: 'Unit',
      buzzCode: 'Buzz Code',
      viewMyOrders: 'View My Orders',
      contactSupport: 'If you have any questions, please contact our customer service team.',
      allRightsReserved: 'All rights reserved.',
      sunday: 'Sunday',
      tuesday: 'Tuesday',
      meals: 'meals',
      voucher: 'voucher',
      mealsPerWeek: (count: number) => `${count} Meals/Week`
    }
  };
  
  const t = text[language];
  
  // Format delivery days and items
  const deliveryDays = orderDetails.items.reduce((acc: any, item) => {
    const dayKey = `${item.dayId}-${item.date}`;
    if (!acc[dayKey]) {
      acc[dayKey] = {
        dayId: item.dayId,
        date: item.date,
        items: []
      };
    }
    acc[dayKey].items.push(item);
    return acc;
  }, {});

  // Generate HTML for each delivery day and its items
  let deliveryItemsHtml = '';
  Object.values(deliveryDays).forEach((day: any) => {
    const dayName = day.dayId === 'sunday' ? t.sunday : t.tuesday;
    deliveryItemsHtml += `
      <div style="margin-bottom: 15px;">
        <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">${dayName} (${day.date})</h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${day.items.map((item: any) => {
            const translatedOptionName = translateOptionName(item.optionName);
            return `
            <li style="padding: 8px 0; border-bottom: 1px dashed #eaeaea;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #333;">${translatedOptionName}</span>
                <span style="color: #C2884E; font-weight: 500;">x${item.quantity}</span>
              </div>
            </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  });

  // Format address (city/province removed — area shown separately)
  const formattedAddress = formatEmailAddress(orderDetails.deliveryAddress, t.unit, t.buzzCode);

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${t.orderConfirmation}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${name}, ${t.thankYou}
      </p>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px;">${t.orderDetails}</h3>
        <p style="color: #333; margin-bottom: 15px; font-size: 15px;">
          <strong>${t.orderNumber}:</strong> ${orderDetails.orderId}
        </p>
        
        <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #C2884E; margin-top: 0; font-size: 16px;">${t.selectedMeals}</h4>
          ${deliveryItemsHtml}
          <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #C2884E30; display: flex; justify-content: space-between;">
            <span style="font-weight: bold; color: #333;">${t.total}:</span>
            <span style="font-weight: bold; color: #C2884E;">
              ${(() => {
                if (orderDetails.totalCredits === 6) {
                  return `${t.mealsPerWeek(6)}: 1 ${t.voucher}`;
                } else if (orderDetails.totalCredits === 8) {
                  return `${t.mealsPerWeek(8)}: 1 ${t.voucher}`;
                } else if (orderDetails.totalCredits === 10) {
                  return `${t.mealsPerWeek(10)}: 1 ${t.voucher}`;
                } else if (orderDetails.totalCredits === 12) {
                  return `${t.mealsPerWeek(12)}: 1 ${t.voucher}`;
                } else {
                  return `${orderDetails.totalCredits} ${t.meals}`;
                }
              })()}
            </span>
          </div>
        </div>
        
        <h4 style="color: #C2884E; margin: 20px 0 10px; font-size: 16px;">${t.deliveryInfo}</h4>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.area}:</strong> ${orderDetails.area}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.phone}:</strong> ${orderDetails.phoneNumber}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.address}:</strong> ${formattedAddress}
        </p>
        ${orderDetails.specialInstructions ? `
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.specialInstructions}:</strong> ${orderDetails.specialInstructions}
        </p>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/dashboard?tab=orders" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: transform 0.3s;">${t.viewMyOrders}</a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>${t.contactSupport}</p>
        <p>&copy; ${new Date().getFullYear()} Kapioo. ${t.allRightsReserved}</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: `[Kapioo] ${t.orderConfirmation} #${orderDetails.orderId}`,
    html,
  });
};

// Send notification to admin for new weekly subscription order
export const sendAdminWeeklyOrderNotification = async (orderDetails: {
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: Array<{
    optionName: string;
    quantity: number;
    dayId: string;
    date: string;
  }>;
  totalCredits: number;
  area: string;
  phoneNumber: string;
  deliveryAddress: any;
  specialInstructions?: string;
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'kapioomeal@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminDashboardLink = `${baseUrl}/admin?tab=weekly-orders`;

  // Format delivery days and items
  const deliveryDays = orderDetails.items.reduce((acc: any, item) => {
    const dayKey = `${item.dayId}-${item.date}`;
    if (!acc[dayKey]) {
      acc[dayKey] = {
        dayId: item.dayId,
        date: item.date,
        items: []
      };
    }
    acc[dayKey].items.push(item);
    return acc;
  }, {});

  // Generate HTML for each delivery day and its items
  let deliveryItemsHtml = '';
  Object.values(deliveryDays).forEach((day: any) => {
    const dayName = day.dayId === 'sunday' ? '周日' : '周二';
    deliveryItemsHtml += `
      <div style="margin-bottom: 15px;">
        <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">${dayName} (${day.date})</h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${day.items.map((item: any) => `
            <li style="padding: 8px 0; border-bottom: 1px dashed #eaeaea;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #333;">${item.optionName}</span>
                <span style="color: #C2884E; font-weight: 500;">x${item.quantity}</span>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  });

  // Format address (city/province removed — area shown separately)
  const formattedAddress = formatEmailAddress(orderDetails.deliveryAddress, '单元', '门禁码');

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">新的每周订单</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        用户 <strong>${orderDetails.userName}</strong> (${orderDetails.userEmail}) 提交了一个新的每周订单。
      </p>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px;">订单详情</h3>
        <p style="color: #333; margin-bottom: 15px; font-size: 15px;">
          <strong>订单号:</strong> ${orderDetails.orderId}
        </p>
        <p style="color: #333; margin-bottom: 15px; font-size: 15px;">
          <strong>用户ID:</strong> ${orderDetails.userId}
        </p>
        
        <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #C2884E; margin-top: 0; font-size: 16px;">订单内容</h4>
          ${deliveryItemsHtml}
          <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #C2884E30; display: flex; justify-content: space-between;">
            <span style="font-weight: bold; color: #333;">总计:</span>
            <span style="font-weight: bold; color: #C2884E;">
              ${(() => {
                if (orderDetails.totalCredits === 6) {
                  return '6餐一周: 1张';
                } else if (orderDetails.totalCredits === 8) {
                  return '8餐一周: 1张';
                } else if (orderDetails.totalCredits === 10) {
                  return '10餐一周: 1张';
                } else if (orderDetails.totalCredits === 12) {
                  return '12餐一周: 1张';
                } else {
                  return `${orderDetails.totalCredits} 餐`;
                }
              })()}
            </span>
          </div>
        </div>
        
        <h4 style="color: #C2884E; margin: 20px 0 10px; font-size: 16px;">配送信息</h4>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>区域:</strong> ${orderDetails.area}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>电话:</strong> ${orderDetails.phoneNumber}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>地址:</strong> ${formattedAddress}
        </p>
        ${orderDetails.specialInstructions ? `
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>特别说明:</strong> ${orderDetails.specialInstructions}
        </p>
        ` : ''}
      </div>
      
      <div style="text-align: center;">
        <a href="${adminDashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">前往管理后台查看订单</a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `新的每周订单 (#${orderDetails.orderId}) 已提交`,
    html,
  });
};

// Daily delivery email functions
export const sendDailyOrderConfirmationEmail = async (to: string, name: string, orderDetails: {
  orderId: string;
  items: Array<{
    day: string;
    date: string;
    comboId: string;
    comboName: string;
    type: string;
    quantity: number;
    voucherType: string;
    dishes?: Array<{ dishId: string; name: string }>;
  }>;
  voucherCost: {
    twoDish: number;
    threeDish: number;
  };
  deliveryAddress: any;
  area: string;
  phoneNumber: string;
  specialInstructions?: string;
}, language: 'zh' | 'en' = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Helper function to translate combo names
  const translateComboName = (comboName: string): string => {
    if (language === 'zh') return comboName;
    // Translate "套餐 1" to "Combo 1", "套餐 2" to "Combo 2", etc.
    return comboName.replace(/套餐\s*(\d+)/g, 'Combo $1');
  };
  
  // Fetch dish translations if language is English
  let dishTranslations: Record<string, string> = {};
  if (language === 'en') {
    try {
      const Dish = (await import('@/models/Dish')).default;
      const connectToDatabase = (await import('@/lib/db')).default;
      await connectToDatabase();
      
      const dishes = await Dish.find({ nameEn: { $exists: true, $ne: null } });
      dishes.forEach((dish: any) => {
        if (dish.name && dish.nameEn) {
          dishTranslations[dish.name] = dish.nameEn;
        }
      });
    } catch (error) {
      console.error('Error fetching dish translations for email:', error);
      // Continue without translations if fetch fails
    }
  }
  
  // Helper function to translate dish names
  const translateDishName = (dishName: string): string => {
    if (language === 'zh') return dishName;
    return dishTranslations[dishName] || dishName;
  };
  
  // Format delivery days and items
  const deliveryDays = orderDetails.items.reduce((acc: any, item) => {
    const dayKey = `${item.day}-${item.date}`;
    if (!acc[dayKey]) {
      acc[dayKey] = {
        day: item.day,
        date: item.date,
        items: []
      };
    }
    acc[dayKey].items.push(item);
    return acc;
  }, {});

  // Language-specific text
  const text = {
    zh: {
      orderConfirmation: '订单确认',
      thankYou: '感谢您的订购！您的每日直送订单已成功提交。',
      orderDetails: '订单详情',
      orderNumber: '订单号',
      selectedMeals: '已选餐点',
      total: '总计',
      twoDishVoucher: '2菜餐券',
      threeDishVoucher: '3菜餐券',
      deliveryInfo: '配送信息',
      area: '区域',
      phone: '电话',
      address: '地址',
      specialInstructions: '特别说明',
      unit: '单元',
      buzzCode: '门禁码',
      contactSupport: '如有任何问题，请联系我们的客服团队。',
      twoDish: '2菜',
      threeDish: '3菜'
    },
    en: {
      orderConfirmation: 'Order Confirmation',
      thankYou: 'Thank you for your order! Your daily delivery order has been successfully submitted.',
      orderDetails: 'Order Details',
      orderNumber: 'Order Number',
      selectedMeals: 'Selected Meals',
      total: 'Total',
      twoDishVoucher: '2-Dish Vouchers',
      threeDishVoucher: '3-Dish Vouchers',
      deliveryInfo: 'Delivery Information',
      area: 'Area',
      phone: 'Phone',
      address: 'Address',
      specialInstructions: 'Special Instructions',
      unit: 'Unit',
      buzzCode: 'Buzz Code',
      contactSupport: 'If you have any questions, please contact our customer service team.',
      twoDish: '2 Dishes',
      threeDish: '3 Dishes'
    }
  };
  
  const t = text[language];

  // Generate HTML for each delivery day and its items
  let deliveryItemsHtml = '';
  Object.values(deliveryDays).forEach((day: any) => {
    // Extract day name from the day ID (e.g., "monday-w1" -> "Monday")
    const dayParts = day.day.split('-');
    const dayName = dayParts[0].charAt(0).toUpperCase() + dayParts[0].slice(1);
    
    deliveryItemsHtml += `
      <div style="margin-bottom: 15px;">
        <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">${dayName} (${day.date})</h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${day.items.map((item: any) => {
            const translatedComboName = translateComboName(item.comboName);
            return `
            <li style="padding: 8px 0; border-bottom: 1px dashed #eaeaea;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #333;">${translatedComboName} (${item.type === 'A' ? t.twoDish : t.threeDish})</span>
                <span style="color: #C2884E; font-weight: 500;">x${item.quantity}</span>
              </div>
              ${item.dishes && item.dishes.length > 0 ? `
              <div style="margin-top: 5px; padding-left: 15px;">
                ${item.dishes.map((dish: any) => {
                  const dishName = typeof dish === 'string' ? dish : dish.name;
                  const translatedDishName = translateDishName(dishName);
                  return `
                  <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 4px; height: 4px; border-radius: 50%; background-color: #C2884E; opacity: 0.6; margin-right: 8px;"></div>
                    <span style="color: #6B5F53; font-size: 13px;">${translatedDishName}</span>
                  </div>
                  `;
                }).join('')}
              </div>
              ` : ''}
            </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  });

  // Format address (city/province removed — area shown separately)
  const formattedAddress = formatEmailAddress(orderDetails.deliveryAddress, t.unit, t.buzzCode);

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${t.orderConfirmation}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${name}, ${t.thankYou}
      </p>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px;">${t.orderDetails}</h3>
        <p style="color: #333; margin-bottom: 15px; font-size: 15px;">
          <strong>${t.orderNumber}:</strong> ${orderDetails.orderId}
        </p>
        
        <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #C2884E; margin-top: 0; font-size: 16px;">${t.selectedMeals}</h4>
          ${deliveryItemsHtml}
          <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #C2884E30; display: flex; justify-content: space-between;">
            <span style="font-weight: bold; color: #333;">${t.total}:</span>
            <span style="font-weight: bold; color: #C2884E;">
              ${t.twoDishVoucher}: ${orderDetails.voucherCost.twoDish}, 
              ${t.threeDishVoucher}: ${orderDetails.voucherCost.threeDish}
            </span>
          </div>
        </div>
        
        <h4 style="color: #C2884E; margin: 20px 0 10px; font-size: 16px;">${t.deliveryInfo}</h4>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.area}:</strong> ${orderDetails.area}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.phone}:</strong> ${orderDetails.phoneNumber}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.address}:</strong> ${formattedAddress}
        </p>
        ${orderDetails.specialInstructions ? `
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.specialInstructions}:</strong> ${orderDetails.specialInstructions}
        </p>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 15px; background-color: #F5EDE4; border-radius: 8px;">
        <p style="color: #6B5F53; font-size: 14px; margin: 0;">
          ${t.contactSupport}
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: `${language === 'zh' ? '每日直送订单确认' : 'Daily Delivery Order Confirmation'} (#${orderDetails.orderId})`,
    html,
  });
};

export const sendAdminDailyOrderNotification = async (orderDetails: {
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: Array<{
    day: string;
    date: string;
    comboId: string;
    comboName: string;
    type: string;
    quantity: number;
    voucherType: string;
  }>;
  voucherCost: {
    twoDish: number;
    threeDish: number;
  };
  area: string;
  phoneNumber: string;
  deliveryAddress: any;
  specialInstructions?: string;
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'kapioomeal@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminDashboardLink = `${baseUrl}/admin?tab=daily-orders`;

  // Format delivery days and items
  const deliveryDays = orderDetails.items.reduce((acc: any, item) => {
    const dayKey = `${item.day}-${item.date}`;
    if (!acc[dayKey]) {
      acc[dayKey] = {
        day: item.day,
        date: item.date,
        items: []
      };
    }
    acc[dayKey].items.push(item);
    return acc;
  }, {});

  // Generate HTML for each delivery day and its items
  let deliveryItemsHtml = '';
  Object.values(deliveryDays).forEach((day: any) => {
    // Extract day name from the day ID (e.g., "monday-w1" -> "Monday")
    const dayParts = day.day.split('-');
    const dayName = dayParts[0].charAt(0).toUpperCase() + dayParts[0].slice(1);
    
    deliveryItemsHtml += `
      <div style="margin-bottom: 15px;">
        <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">${dayName} (${day.date})</h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${day.items.map((item: any) => `
            <li style="padding: 8px 0; border-bottom: 1px dashed #eaeaea;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #333;">${item.comboName} (${item.type === 'A' ? '2菜' : '3菜'})</span>
                <span style="color: #C2884E; font-weight: 500;">x${item.quantity}</span>
              </div>
              ${item.dishes && item.dishes.length > 0 ? `
              <div style="margin-top: 5px; padding-left: 15px;">
                ${item.dishes.map((dish: string) => `
                  <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 4px; height: 4px; border-radius: 50%; background-color: #C2884E; opacity: 0.6; margin-right: 8px;"></div>
                    <span style="color: #6B5F53; font-size: 13px;">${dish}</span>
                  </div>
                `).join('')}
              </div>
              ` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  });

  // Format address (city/province removed — area shown separately)
  const formattedAddress = formatEmailAddress(orderDetails.deliveryAddress, '单元', '门禁码');

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">新的每日直送订单</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        用户 <strong>${orderDetails.userName}</strong> (${orderDetails.userEmail}) 提交了一个新的每日直送订单。
      </p>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px;">订单详情</h3>
        <p style="color: #333; margin-bottom: 15px; font-size: 15px;">
          <strong>订单号:</strong> ${orderDetails.orderId}
        </p>
        <p style="color: #333; margin-bottom: 15px; font-size: 15px;">
          <strong>用户ID:</strong> ${orderDetails.userId}
        </p>
        
        <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #C2884E; margin-top: 0; font-size: 16px;">订单内容</h4>
          ${deliveryItemsHtml}
          <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #C2884E30; display: flex; justify-content: space-between;">
            <span style="font-weight: bold; color: #333;">总计:</span>
            <span style="font-weight: bold; color: #C2884E;">
              2菜餐券: ${orderDetails.voucherCost.twoDish}, 
              3菜餐券: ${orderDetails.voucherCost.threeDish}
            </span>
          </div>
        </div>
        
        <h4 style="color: #C2884E; margin: 20px 0 10px; font-size: 16px;">配送信息</h4>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>区域:</strong> ${orderDetails.area}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>电话:</strong> ${orderDetails.phoneNumber}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>地址:</strong> ${formattedAddress}
        </p>
        ${orderDetails.specialInstructions ? `
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>特别说明:</strong> ${orderDetails.specialInstructions}
        </p>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${adminDashboardLink}" style="display: inline-block; background: linear-gradient(to right, #C2884E, #D1A46C); color: white; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: 500; letter-spacing: 0.5px;">
          查看管理后台
        </a>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: adminEmail,
    subject: `新的每日直送订单 (#${orderDetails.orderId}) 已提交`,
    html,
  });
};

/**
 * Send menu update notification to a user
 */
export const sendMenuUpdateEmail = async (to: string, userName: string, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      
      <h2 style="color: #C2884E; text-align: center; font-size: 28px; margin-bottom: 20px; font-weight: 600;">
        ${t.menuUpdate.title}
      </h2>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${t.menuUpdate.greeting(userName)}
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${t.menuUpdate.mainMessage}
      </p>
      
      <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
        ${t.menuUpdate.description}
      </p>
      
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto; border-left: 4px solid #C2884E;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px; margin-bottom: 10px;">
          ${t.menuUpdate.reminderTitle}
        </h3>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 0;">
          ${t.menuUpdate.reminderText}
        </p>
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${baseUrl}/daily-delivery" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; transition: transform 0.3s; box-shadow: 0 4px 12px rgba(194, 136, 78, 0.3);">
          ${t.menuUpdate.ctaButton}
        </a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #999; font-size: 14px; margin-bottom: 10px;">
          ${t.menuUpdate.footerNote}
        </p>
        <p style="color: #999; font-size: 13px; margin-bottom: 5px;">
          ${t.common.contactSupport}
        </p>
        <p style="color: #bbb; font-size: 12px; margin-top: 15px;">
          © ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: t.menuUpdate.subject,
    html,
  });
};

/**
 * Send weekly menu update notification to a user
 */
export const sendWeeklyMenuUpdateEmail = async (to: string, userName: string, language: Language = 'zh') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      
      <h2 style="color: #C2884E; text-align: center; font-size: 28px; margin-bottom: 20px; font-weight: 600;">
        ${t.weeklyMenuUpdate.title}
      </h2>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${t.weeklyMenuUpdate.greeting(userName)}
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${t.weeklyMenuUpdate.mainMessage}
      </p>
      
      <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
        ${t.weeklyMenuUpdate.description}
      </p>
      
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto; border-left: 4px solid #C2884E;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px; margin-bottom: 10px;">
          ${t.weeklyMenuUpdate.reminderTitle}
        </h3>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 0;">
          ${t.weeklyMenuUpdate.reminderText}
        </p>
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${baseUrl}/weekly-meal" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; transition: transform 0.3s; box-shadow: 0 4px 12px rgba(194, 136, 78, 0.3);">
          ${t.weeklyMenuUpdate.ctaButton}
        </a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #999; font-size: 14px; margin-bottom: 10px;">
          ${t.weeklyMenuUpdate.footerNote}
        </p>
        <p style="color: #999; font-size: 13px; margin-bottom: 5px;">
          ${t.common.contactSupport}
        </p>
        <p style="color: #bbb; font-size: 12px; margin-top: 15px;">
          © ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: t.weeklyMenuUpdate.subject,
    html,
  });
};

/**
 * Build next week menu update email content without sending.
 * Useful for bulk/batch workflows where we render many emails first.
 */
export const buildNextWeekMenuUpdateEmail = (
  to: string,
  userName: string,
  _userId: string,
  language: Language = 'zh'
): EmailOptions => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const t = getTranslations(language);

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      
      <h2 style="color: #C2884E; text-align: center; font-size: 28px; margin-bottom: 20px; font-weight: 600;">
        ${t.nextWeekMenuUpdate.title}
      </h2>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${t.nextWeekMenuUpdate.greeting(userName)}
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${t.nextWeekMenuUpdate.mainMessage}
      </p>
      
      <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
        ${t.nextWeekMenuUpdate.description}
      </p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; transition: transform 0.3s; box-shadow: 0 4px 12px rgba(194, 136, 78, 0.3);">
          ${t.nextWeekMenuUpdate.ctaButton}
        </a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #999; font-size: 13px; margin-bottom: 5px;">
          ${t.common.contactSupport}
        </p>
        <p style="color: #bbb; font-size: 12px; margin-top: 15px;">
          © ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}
        </p>
      </div>
    </div>
  `;

  return {
    to,
    subject: t.nextWeekMenuUpdate.subject,
    html
  };
};

/**
 * Send next week menu update notification to a user
 * This email goes to ALL users (not just those with vouchers/plans)
 */
export const sendNextWeekMenuUpdateEmail = async (
  to: string, 
  userName: string, 
  userId: string,
  language: Language = 'zh'
) => {
  const options = buildNextWeekMenuUpdateEmail(to, userName, userId, language);
  return sendEmail(options);
};

/**
 * Send order summary email with multiple orders (Daily Delivery)
 * This email is sent ONCE after all orders are placed
 */
export const sendDailyOrderSummaryEmail = async (
  to: string,
  userName: string,
  orders: Array<{
    orderId: string;
    items: Array<{
      day: string;
      date: string;
      comboId: string;
      comboName: string;
      type: string;
      quantity: number;
      voucherType: string;
      dishes?: Array<{ dishId: string; name: string }>;
    }>;
    voucherCost: {
      twoDish: number;
      threeDish: number;
    };
  }>,
  deliveryAddress: any,
  area: string,
  phoneNumber: string,
  specialInstructions?: string,
  language: 'zh' | 'en' = 'zh'
) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Helper function to translate combo names
  const translateComboName = (comboName: string): string => {
    if (language === 'zh') return comboName;
    return comboName.replace(/套餐\s*(\d+)/g, 'Combo $1');
  };
  
  // Fetch dish translations if language is English
  let dishTranslations: Record<string, string> = {};
  if (language === 'en') {
    try {
      const Dish = (await import('@/models/Dish')).default;
      const connectToDatabase = (await import('@/lib/db')).default;
      await connectToDatabase();
      
      const dishes = await Dish.find({ nameEn: { $exists: true, $ne: null } });
      dishes.forEach((dish: any) => {
        if (dish.name && dish.nameEn) {
          dishTranslations[dish.name] = dish.nameEn;
        }
      });
    } catch (error) {
      console.error('Error fetching dish translations for email:', error);
    }
  }
  
  // Helper function to translate dish names
  const translateDishName = (dishName: string): string => {
    if (language === 'zh') return dishName;
    return dishTranslations[dishName] || dishName;
  };
  
  // Language-specific text
  const text = {
    zh: {
      orderSummary: '订单汇总',
      thankYou: '感谢您的订购！您的订单已成功提交。',
      ordersPlaced: (count: number) => `已成功下单 ${count} 个订单`,
      orderNumber: '订单号',
      selectedMeals: '已选餐点',
      total: '总计',
      twoDishVoucher: '2菜餐券',
      threeDishVoucher: '3菜餐券',
      deliveryInfo: '配送信息',
      area: '区域',
      phone: '电话',
      address: '地址',
      specialInstructions: '特别说明',
      unit: '单元',
      buzzCode: '门禁码',
      viewMyOrders: '查看我的订单',
      contactSupport: '如有任何问题，请联系我们的客服团队。',
      allRightsReserved: '保留所有权利。',
      twoDish: '2菜',
      threeDish: '3菜',
      grandTotal: '总计'
    },
    en: {
      orderSummary: 'Order Summary',
      thankYou: 'Thank you for your order! Your orders have been successfully submitted.',
      ordersPlaced: (count: number) => `${count} Orders Placed Successfully`,
      orderNumber: 'Order Number',
      selectedMeals: 'Selected Meals',
      total: 'Total',
      twoDishVoucher: '2-Dish Vouchers',
      threeDishVoucher: '3-Dish Vouchers',
      deliveryInfo: 'Delivery Information',
      area: 'Area',
      phone: 'Phone',
      address: 'Address',
      specialInstructions: 'Special Instructions',
      unit: 'Unit',
      buzzCode: 'Buzz Code',
      viewMyOrders: 'View My Orders',
      contactSupport: 'If you have any questions, please contact our customer service team.',
      allRightsReserved: 'All rights reserved.',
      twoDish: '2 Dishes',
      threeDish: '3 Dishes',
      grandTotal: 'Grand Total'
    }
  };
  
  const t = text[language];
  
  // Calculate grand totals
  const grandTotal = orders.reduce((totals, order) => {
    totals.twoDish += order.voucherCost.twoDish;
    totals.threeDish += order.voucherCost.threeDish;
    return totals;
  }, { twoDish: 0, threeDish: 0 });
  
  // Generate HTML for each order
  let ordersHtml = '';
  orders.forEach((order, index) => {
    // Group items by day for this order
    const deliveryDays = order.items.reduce((acc: any, item) => {
      const dayKey = `${item.day}-${item.date}`;
      if (!acc[dayKey]) {
        acc[dayKey] = { day: item.day, date: item.date, items: [] };
      }
      acc[dayKey].items.push(item);
      return acc;
    }, {});
    
    let orderItemsHtml = '';
    Object.values(deliveryDays).forEach((day: any) => {
      const dayParts = day.day.split('-');
      const dayName = dayParts[0].charAt(0).toUpperCase() + dayParts[0].slice(1);
      
      orderItemsHtml += `
        <div style="margin-bottom: 10px;">
          <h5 style="color: #C2884E; margin: 0 0 8px; font-size: 14px;">${dayName} (${day.date})</h5>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${day.items.map((item: any) => {
              const translatedComboName = translateComboName(item.comboName);
              return `
              <li style="padding: 6px 0; border-bottom: 1px dashed #eaeaea;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #333; font-size: 14px;">${translatedComboName} (${item.type === 'A' ? t.twoDish : t.threeDish})</span>
                  <span style="color: #C2884E; font-weight: 500;">x${item.quantity}</span>
                </div>
                ${item.dishes && item.dishes.length > 0 ? `
                <div style="margin-top: 4px; padding-left: 12px;">
                  ${item.dishes.map((dish: any) => {
                    const dishName = typeof dish === 'string' ? dish : dish.name;
                    const translatedDishName = translateDishName(dishName);
                    return `
                    <div style="display: flex; align-items: center; margin-bottom: 2px;">
                      <div style="width: 3px; height: 3px; border-radius: 50%; background-color: #C2884E; opacity: 0.6; margin-right: 6px;"></div>
                      <span style="color: #6B5F53; font-size: 12px;">${translatedDishName}</span>
                    </div>
                    `;
                  }).join('')}
                </div>
                ` : ''}
              </li>
              `;
            }).join('')}
          </ul>
        </div>
      `;
    });
    
    ordersHtml += `
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #C2884E;">
        <h4 style="color: #C2884E; margin-top: 0; font-size: 16px; margin-bottom: 15px;">
          ${t.orderNumber}: ${order.orderId}
        </h4>
        ${orderItemsHtml}
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #C2884E30; font-size: 13px;">
          <span style="color: #666;">${t.total}: </span>
          <span style="color: #C2884E; font-weight: 500;">
            ${t.twoDishVoucher}: ${order.voucherCost.twoDish}, 
            ${t.threeDishVoucher}: ${order.voucherCost.threeDish}
          </span>
        </div>
      </div>
    `;
  });
  
  // Format address (city/province removed — area shown separately)
  const formattedAddress = formatEmailAddress(deliveryAddress, t.unit, t.buzzCode);
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 10px;">${t.orderSummary}</h2>
      <p style="color: #666; text-align: center; font-size: 14px; margin-bottom: 25px;">
        ${t.ordersPlaced(orders.length)}
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${userName}, ${t.thankYou}
      </p>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px; margin-bottom: 20px;">${t.selectedMeals}</h3>
        
        ${ordersHtml}
        
        <div style="background-color: #fff; border-radius: 6px; padding: 15px; margin-top: 20px; border: 2px solid #C2884E;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold; color: #333; font-size: 16px;">${t.grandTotal}:</span>
            <span style="font-weight: bold; color: #C2884E; font-size: 16px;">
              ${t.twoDishVoucher}: ${grandTotal.twoDish}, 
              ${t.threeDishVoucher}: ${grandTotal.threeDish}
            </span>
          </div>
        </div>
        
        <h4 style="color: #C2884E; margin: 20px 0 10px; font-size: 16px;">${t.deliveryInfo}</h4>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.area}:</strong> ${area}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.phone}:</strong> ${phoneNumber}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.address}:</strong> ${formattedAddress}
        </p>
        ${specialInstructions ? `
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.specialInstructions}:</strong> ${specialInstructions}
        </p>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(194, 136, 78, 0.3);">
          ${t.viewMyOrders}
        </a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #999; font-size: 13px; margin-bottom: 5px;">
          ${t.contactSupport}
        </p>
        <p style="color: #bbb; font-size: 12px; margin-top: 15px;">
          © ${new Date().getFullYear()} Kapioo. ${t.allRightsReserved}
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: language === 'zh' 
      ? `[Kapioo] 订单汇总 - ${orders.length}个订单已确认` 
      : `[Kapioo] Order Summary - ${orders.length} Orders Confirmed`,
    html,
  });
};

/**
 * Send order summary email with multiple orders (Weekly Subscription)
 * This email is sent ONCE after all orders are placed
 */
export const sendWeeklyOrderSummaryEmail = async (
  to: string,
  userName: string,
  orders: Array<{
    orderId: string;
    items: Array<{
      optionName: string;
      quantity: number;
      dayId: string;
      date: string;
    }>;
    totalCredits: number;
    mealPlanType?: '6aweek' | '8aweek' | '10aweek' | '12aweek' | '16aweek';
    voucherDeducted?: boolean;
  }>,
  deliveryAddress: any,
  area: string,
  phoneNumber: string,
  specialInstructions?: string,
  language: 'zh' | 'en' = 'zh'
) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Fetch meal option translations if language is English
  let mealOptionTranslations: Record<string, string> = {};
  if (language === 'en') {
    try {
      const WeeklyMealOption = (await import('@/models/WeeklyMealOption')).default;
      const connectToDatabase = (await import('@/lib/db')).default;
      await connectToDatabase();
      
      const mealOptions = await WeeklyMealOption.find({ nameEn: { $exists: true, $ne: null } });
      mealOptions.forEach((option: any) => {
        if (option.name && option.nameEn) {
          mealOptionTranslations[option.name] = option.nameEn;
        }
      });
    } catch (error) {
      console.error('Error fetching meal option translations for email:', error);
    }
  }
  
  // Helper function to translate meal option names
  const translateOptionName = (optionName: string): string => {
    if (language === 'zh') return optionName;
    return mealOptionTranslations[optionName] || optionName;
  };
  
  // Language-specific text
  const text = {
    zh: {
      orderSummary: '订单汇总',
      thankYou: '感谢您的订购！您的订单已成功提交。',
      ordersPlaced: (count: number) => `已成功下单 ${count} 个订单`,
      orderNumber: '订单号',
      selectedMeals: '已选餐点',
      total: '总计',
      credits: '积分',
      meals: '分餐点',
      deliveryInfo: '配送信息',
      area: '区域',
      phone: '电话',
      address: '地址',
      specialInstructions: '特别说明',
      unit: '单元',
      buzzCode: '门禁码',
      viewMyOrders: '查看我的订单',
      contactSupport: '如有任何问题，请联系我们的客服团队。',
      allRightsReserved: '保留所有权利。',
      sunday: '周日',
      tuesday: '周二',
      grandTotal: '总计',
      vouchersUsed: '已使用',
      voucher: '餐劵',
      voucherCount: '张'
    },
    en: {
      orderSummary: 'Order Summary',
      thankYou: 'Thank you for your order! Your orders have been successfully submitted.',
      ordersPlaced: (count: number) => `${count} Orders Placed Successfully`,
      orderNumber: 'Order Number',
      selectedMeals: 'Selected Meals',
      total: 'Total',
      credits: 'Credits',
      meals: 'Meals',
      deliveryInfo: 'Delivery Information',
      area: 'Area',
      phone: 'Phone',
      address: 'Address',
      specialInstructions: 'Special Instructions',
      unit: 'Unit',
      buzzCode: 'Buzz Code',
      viewMyOrders: 'View My Orders',
      contactSupport: 'If you have any questions, please contact our customer service team.',
      allRightsReserved: 'All rights reserved.',
      sunday: 'Sunday',
      tuesday: 'Tuesday',
      grandTotal: 'Grand Total',
      vouchersUsed: 'Vouchers Used',
      voucher: 'Voucher',
      voucherCount: 'voucher(s)'
    }
  };
  
  const t = text[language];
  
  // Calculate grand total credits
  const grandTotalCredits = orders.reduce((total, order) => total + order.totalCredits, 0);
  
  // Calculate voucher usage summary
  const voucherUsage: Record<string, number> = {};
  orders.forEach(order => {
    if (order.voucherDeducted && order.mealPlanType) {
      const key = order.mealPlanType;
      voucherUsage[key] = (voucherUsage[key] || 0) + 1;
    }
  });
  
  // Helper function to get voucher display name
  const getVoucherName = (mealPlanType: string) => {
    const weeklyMeals = Number(String(mealPlanType).replace('aweek', ''));
    const weeklyPlan = Number.isFinite(weeklyMeals) ? getWeeklyPlanBy(weeklyMeals, 1) : null;
    if (!weeklyPlan) return mealPlanType;
    const label = buildPlanLabel(weeklyPlan, language).split(':')[0];
    return label;
  };
  
  // Generate voucher usage text
  let voucherUsageText = '';
  if (Object.keys(voucherUsage).length > 0) {
    const voucherParts = Object.entries(voucherUsage).map(([type, count]) => {
      const voucherName = getVoucherName(type);
      return language === 'zh' 
        ? `${voucherName}${t.voucher}: ${count}${t.voucherCount}`
        : `${voucherName} ${t.voucher}: ${count} ${t.voucherCount}`;
    });
    voucherUsageText = voucherParts.join(', ');
  }
  
  // Generate HTML for each order
  let ordersHtml = '';
  orders.forEach((order) => {
    // Group items by day for this order
    const deliveryDays = order.items.reduce((acc: any, item) => {
      const dayKey = `${item.dayId}-${item.date}`;
      if (!acc[dayKey]) {
        acc[dayKey] = { dayId: item.dayId, date: item.date, items: [] };
      }
      acc[dayKey].items.push(item);
      return acc;
    }, {});
    
    let orderItemsHtml = '';
    Object.values(deliveryDays).forEach((day: any) => {
      const dayName = day.dayId === 'sunday' ? t.sunday : t.tuesday;
      
      orderItemsHtml += `
        <div style="margin-bottom: 10px;">
          <h5 style="color: #C2884E; margin: 0 0 8px; font-size: 14px;">${dayName} (${day.date})</h5>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${day.items.map((item: any) => {
              const translatedOptionName = translateOptionName(item.optionName);
              return `
              <li style="padding: 6px 0; border-bottom: 1px dashed #eaeaea;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #333; font-size: 14px;">${translatedOptionName}</span>
                  <span style="color: #C2884E; font-weight: 500;">x${item.quantity}</span>
                </div>
              </li>
              `;
            }).join('')}
          </ul>
        </div>
      `;
    });
    
    // Calculate total meal count for this order
    const orderMealCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    
    ordersHtml += `
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #C2884E;">
        <h4 style="color: #C2884E; margin-top: 0; font-size: 16px; margin-bottom: 15px;">
          ${t.orderNumber}: ${order.orderId}
        </h4>
        ${orderItemsHtml}
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #C2884E30; font-size: 13px;">
          <span style="color: #666;">${t.total}: </span>
          <span style="color: #C2884E; font-weight: 500;">
            ${orderMealCount}${t.meals}
          </span>
        </div>
      </div>
    `;
  });
  
  // Format address (city/province removed — area shown separately)
  const formattedAddress = formatEmailAddress(deliveryAddress, t.unit, t.buzzCode);
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 10px;">${t.orderSummary}</h2>
      <p style="color: #666; text-align: center; font-size: 14px; margin-bottom: 25px;">
        ${t.ordersPlaced(orders.length)}
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${userName}, ${t.thankYou}
      </p>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px; margin-bottom: 20px;">${t.selectedMeals}</h3>
        
        ${ordersHtml}
        
        ${voucherUsageText ? `
        <div style="background-color: #fff; border-radius: 6px; padding: 15px; margin-top: 20px; border: 2px solid #C2884E;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold; color: #333; font-size: 16px;">${t.vouchersUsed}: </span>
            <span style="font-weight: bold; color: #C2884E; font-size: 16px;">
              ${voucherUsageText}
            </span>
          </div>
        </div>
        ` : ''}
        
        <h4 style="color: #C2884E; margin: 20px 0 10px; font-size: 16px;">${t.deliveryInfo}</h4>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.area}:</strong> ${area}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.phone}:</strong> ${phoneNumber}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.address}:</strong> ${formattedAddress}
        </p>
        ${specialInstructions ? `
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>${t.specialInstructions}:</strong> ${specialInstructions}
        </p>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(194, 136, 78, 0.3);">
          ${t.viewMyOrders}
        </a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #999; font-size: 13px; margin-bottom: 5px;">
          ${t.contactSupport}
        </p>
        <p style="color: #bbb; font-size: 12px; margin-top: 15px;">
          © ${new Date().getFullYear()} Kapioo. ${t.allRightsReserved}
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: language === 'zh' 
      ? `[Kapioo] 订单汇总 - ${orders.length}个订单已确认` 
      : `[Kapioo] Order Summary - ${orders.length} Orders Confirmed`,
    html,
  });
};
/**
 * Send admin summary email with multiple daily delivery orders
 * This email is sent ONCE to admin after all orders are placed
 */
export const sendAdminDailyOrderSummaryEmail = async (
  userName: string,
  userEmail: string,
  userId: string,
  orders: Array<{
    orderId: string;
    items: Array<{
      day: string;
      date: string;
      comboId: string;
      comboName: string;
      type: string;
      quantity: number;
      voucherType: string;
      dishes?: Array<{ dishId: string; name: string }>;
    }>;
    voucherCost: {
      twoDish: number;
      threeDish: number;
    };
  }>,
  deliveryAddress: any,
  area: string,
  phoneNumber: string,
  specialInstructions?: string
) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'kapioomeal@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminDashboardLink = `${baseUrl}/admin?tab=daily-orders`;
  
  // Calculate total vouchers across all orders
  const totalTwoDish = orders.reduce((sum, order) => sum + order.voucherCost.twoDish, 0);
  const totalThreeDish = orders.reduce((sum, order) => sum + order.voucherCost.threeDish, 0);
  
  // Generate HTML for each order
  let ordersHtml = '';
  orders.forEach((order) => {
    // Format delivery days and items for this order
    const deliveryDays = order.items.reduce((acc: any, item) => {
      const dayKey = `${item.day}-${item.date}`;
      if (!acc[dayKey]) {
        acc[dayKey] = {
          day: item.day,
          date: item.date,
          items: []
        };
      }
      acc[dayKey].items.push(item);
      return acc;
    }, {});
    
    let deliveryItemsHtml = '';
    Object.values(deliveryDays).forEach((day: any) => {
      const dayParts = day.day.split('-');
      const dayName = dayParts[0].charAt(0).toUpperCase() + dayParts[0].slice(1);
      
      deliveryItemsHtml += `
        <div style="margin-bottom: 15px;">
          <h5 style="color: #C2884E; margin: 0 0 10px; font-size: 14px;">${dayName} (${day.date})</h5>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${day.items.map((item: any) => `
              <li style="padding: 8px 0; border-bottom: 1px dashed #eaeaea;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #333; font-size: 14px;">${item.comboName} (${item.type === 'A' ? '2菜' : '3菜'})</span>
                  <span style="color: #C2884E; font-weight: 500;">x${item.quantity}</span>
                </div>
                ${item.dishes && item.dishes.length > 0 ? `
                <div style="margin-top: 5px; padding-left: 15px;">
                  ${item.dishes.map((dish: any) => `
                    <div style="display: flex; align-items: center; margin-bottom: 3px;">
                      <div style="width: 4px; height: 4px; border-radius: 50%; background-color: #C2884E; opacity: 0.6; margin-right: 8px;"></div>
                      <span style="color: #6B5F53; font-size: 13px;">${dish.name || dish}</span>
                    </div>
                  `).join('')}
                </div>
                ` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    });
    
    ordersHtml += `
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #C2884E;">
        <h4 style="color: #C2884E; margin-top: 0; font-size: 16px; margin-bottom: 15px;">
          订单号: ${order.orderId}
        </h4>
        ${deliveryItemsHtml}
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #C2884E30; font-size: 13px;">
          <span style="color: #666;">本订单使用: </span>
          <span style="color: #C2884E; font-weight: 500;">
            2菜餐券: ${order.voucherCost.twoDish}张, 3菜餐券: ${order.voucherCost.threeDish}张
          </span>
        </div>
      </div>
    `;
  });
  
  // Format address (city/province removed — area shown separately)
  const formattedAddress = formatEmailAddress(deliveryAddress, '单元', '门禁码');
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 10px;">新的每日直送订单汇总</h2>
      <p style="color: #666; text-align: center; font-size: 14px; margin-bottom: 25px;">
        用户一次性下单 ${orders.length} 个订单
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        用户 <strong>${userName}</strong> (${userEmail}) 提交了 ${orders.length} 个每日直送订单。
      </p>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px; margin-bottom: 15px;">用户信息</h3>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>用户ID:</strong> ${userId}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>用户名:</strong> ${userName}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>邮箱:</strong> ${userEmail}
        </p>
        
        <h3 style="color: #C2884E; margin: 20px 0 15px; font-size: 18px;">订单详情</h3>
        
        ${ordersHtml}
        
        <div style="background-color: #fff; border-radius: 6px; padding: 15px; margin-top: 20px; border: 2px solid #C2884E;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold; color: #333; font-size: 16px;">总计使用: </span>
            <span style="font-weight: bold; color: #C2884E; font-size: 16px;">
              2菜餐券: ${totalTwoDish}张, 3菜餐券: ${totalThreeDish}张
            </span>
          </div>
        </div>
        
        <h4 style="color: #C2884E; margin: 20px 0 10px; font-size: 16px;">配送信息</h4>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>区域:</strong> ${area}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>电话:</strong> ${phoneNumber}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>地址:</strong> ${formattedAddress}
        </p>
        ${specialInstructions ? `
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>特别说明:</strong> ${specialInstructions}
        </p>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${adminDashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(194, 136, 78, 0.3);">
          前往管理后台查看订单
        </a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #bbb; font-size: 12px; margin-top: 15px;">
          © ${new Date().getFullYear()} Kapioo. 保留所有权利。
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: adminEmail,
    subject: `新的每日直送订单汇总 - ${orders.length}个订单已提交 (用户: ${userName})`,
    html,
  });
};

/**
 * Send admin summary email with multiple weekly subscription orders
 * This email is sent ONCE to admin after all orders are placed
 */
export const sendAdminWeeklyOrderSummaryEmail = async (
  userName: string,
  userEmail: string,
  userId: string,
  orders: Array<{
    orderId: string;
    items: Array<{
      optionName: string;
      quantity: number;
      dayId: string;
      date: string;
    }>;
    totalCredits: number;
    mealPlanType?: '6aweek' | '8aweek' | '10aweek' | '12aweek' | '16aweek';
    voucherDeducted?: boolean;
  }>,
  deliveryAddress: any,
  area: string,
  phoneNumber: string,
  specialInstructions?: string
) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'kapioomeal@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminDashboardLink = `${baseUrl}/admin?tab=weekly-orders`;
  
  // Calculate voucher usage summary
  const voucherUsage: Record<string, number> = {};
  orders.forEach(order => {
    if (order.voucherDeducted && order.mealPlanType) {
      const key = order.mealPlanType;
      voucherUsage[key] = (voucherUsage[key] || 0) + 1;
    }
  });
  
  // Helper function to get voucher display name
  const getVoucherName = (mealPlanType: string) => {
    const weeklyMeals = Number(String(mealPlanType).replace('aweek', ''));
    const weeklyPlan = Number.isFinite(weeklyMeals) ? getWeeklyPlanBy(weeklyMeals, 1) : null;
    if (!weeklyPlan) return mealPlanType;
    return buildPlanLabel(weeklyPlan, 'zh').split(':')[0];
  };
  
  // Generate voucher usage text
  let voucherUsageText = '';
  if (Object.keys(voucherUsage).length > 0) {
    const voucherParts = Object.entries(voucherUsage).map(([type, count]) => {
      const voucherName = getVoucherName(type);
      return `${voucherName}餐劵: ${count}张`;
    });
    voucherUsageText = voucherParts.join(', ');
  }
  
  // Generate HTML for each order
  let ordersHtml = '';
  orders.forEach((order) => {
    // Group items by day for this order
    const deliveryDays = order.items.reduce((acc: any, item) => {
      const dayKey = `${item.dayId}-${item.date}`;
      if (!acc[dayKey]) {
        acc[dayKey] = { dayId: item.dayId, date: item.date, items: [] };
      }
      acc[dayKey].items.push(item);
      return acc;
    }, {});
    
    let orderItemsHtml = '';
    Object.values(deliveryDays).forEach((day: any) => {
      const dayName = day.dayId === 'sunday' ? '周日' : '周二';
      
      orderItemsHtml += `
        <div style="margin-bottom: 10px;">
          <h5 style="color: #C2884E; margin: 0 0 8px; font-size: 14px;">${dayName} (${day.date})</h5>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${day.items.map((item: any) => `
              <li style="padding: 6px 0; border-bottom: 1px dashed #eaeaea;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #333; font-size: 14px;">${item.optionName}</span>
                  <span style="color: #C2884E; font-weight: 500;">x${item.quantity}</span>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    });
    
    // Calculate meal count for this order
    const orderMealCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    
    ordersHtml += `
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #C2884E;">
        <h4 style="color: #C2884E; margin-top: 0; font-size: 16px; margin-bottom: 15px;">
          订单号: ${order.orderId}
        </h4>
        ${orderItemsHtml}
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #C2884E30; font-size: 13px;">
          <span style="color: #666;">本订单: </span>
          <span style="color: #C2884E; font-weight: 500;">
            ${orderMealCount}分餐点
          </span>
        </div>
      </div>
    `;
  });
  
  // Format address (city/province removed — area shown separately)
  const formattedAddress = formatEmailAddress(deliveryAddress, '单元', '门禁码');
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 10px;">新的每周订单汇总</h2>
      <p style="color: #666; text-align: center; font-size: 14px; margin-bottom: 25px;">
        用户一次性下单 ${orders.length} 个订单
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        用户 <strong>${userName}</strong> (${userEmail}) 提交了 ${orders.length} 个每周订单。
      </p>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #C2884E; margin-top: 0; font-size: 18px; margin-bottom: 15px;">用户信息</h3>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>用户ID:</strong> ${userId}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>用户名:</strong> ${userName}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>邮箱:</strong> ${userEmail}
        </p>
        
        <h3 style="color: #C2884E; margin: 20px 0 15px; font-size: 18px;">订单详情</h3>
        
        ${ordersHtml}
        
        ${voucherUsageText ? `
        <div style="background-color: #fff; border-radius: 6px; padding: 15px; margin-top: 20px; border: 2px solid #C2884E;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold; color: #333; font-size: 16px;">总计使用: </span>
            <span style="font-weight: bold; color: #C2884E; font-size: 16px;">
              ${voucherUsageText}
            </span>
          </div>
        </div>
        ` : ''}
        
        <h4 style="color: #C2884E; margin: 20px 0 10px; font-size: 16px;">配送信息</h4>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>区域:</strong> ${area}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>电话:</strong> ${phoneNumber}
        </p>
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>地址:</strong> ${formattedAddress}
        </p>
        ${specialInstructions ? `
        <p style="color: #333; margin: 5px 0; font-size: 15px;">
          <strong>特别说明:</strong> ${specialInstructions}
        </p>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${adminDashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(194, 136, 78, 0.3);">
          前往管理后台查看订单
        </a>
      </div>
      
      <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #bbb; font-size: 12px; margin-top: 15px;">
          © ${new Date().getFullYear()} Kapioo. 保留所有权利。
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: adminEmail,
    subject: `新的每周订单汇总 - ${orders.length}个订单已提交 (用户: ${userName})`,
    html,
  });
};
