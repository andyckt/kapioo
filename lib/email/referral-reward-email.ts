import { EMAIL_LOGO_PUBLIC_PATH } from '@/lib/email/logo-url';
import { getTranslations, referralRewardTranslations, type Language } from '@/lib/email-translations';

export type ReferralRewardEmailInput = {
  name: string;
  promoCode: string;
  referredFriendName: string;
  discountLabel: string;
  discountNote: string;
  language?: Language;
  /** Override link host for one-off sends (defaults to NEXT_PUBLIC_BASE_URL). */
  baseUrl?: string;
};

export type ReferralRewardEmailContent = {
  subject: string;
  html: string;
};

export function buildReferralRewardEmail({
  name,
  promoCode,
  referredFriendName,
  discountLabel,
  discountNote,
  language = 'zh',
  baseUrl,
}: ReferralRewardEmailInput): ReferralRewardEmailContent {
  const resolvedBaseUrl = (baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(
    /\/+$/,
    ''
  );
  const t = getTranslations(language).referralReward;
  const year = new Date().getFullYear();
  const logoUrl =
    process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim() ||
    `${resolvedBaseUrl}${EMAIL_LOGO_PUBLIC_PATH}`;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>

      <p style="color: #333; font-size: 16px; line-height: 1.7; margin: 0 0 12px;">
        ${t.greeting(name)}
      </p>

      <p style="color: #333; font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
        ${t.intro(referredFriendName, discountLabel)}
      </p>

      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 28px 24px; margin: 0 0 28px; text-align: center; border: 1px solid #E8D5C4;">
        <p style="color: #6B5F53; font-size: 14px; font-weight: 600; margin: 0 0 16px; letter-spacing: 0.04em;">
          ${t.promoCodeLabel}
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 16px; width: 100%; max-width: 360px;">
          <tr>
            <td bgcolor="#C2884E" style="background-color: #C2884E; border-radius: 8px; padding: 18px 20px; text-align: center; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 4px; line-height: 1.4; font-family: 'Helvetica Neue', Arial, monospace;">
              ${promoCode}
            </td>
          </tr>
        </table>
        <p style="color: #6B5F53; font-size: 15px; margin: 0; line-height: 1.5;">
          ${t.promoCodeNote(discountNote)}
        </p>
      </div>

      <div style="margin: 0 0 28px;">
        <p style="color: #C2884E; font-size: 16px; font-weight: 600; margin: 0 0 14px;">
          ${t.howToUseTitle}
        </p>
        <ol style="color: #333; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 22px;">
          <li style="margin-bottom: 6px;">${t.step1}</li>
          <li style="margin-bottom: 6px;">${t.step2}</li>
          <li>${t.step3(discountLabel)}</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 0 0 32px;">
        <a href="${resolvedBaseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
          ${t.ctaButton}
        </a>
      </div>

      <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px;">
        ${t.closing}
      </p>
      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0;">
        ${t.signature}
      </p>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
        <p style="color: #999; font-size: 13px; margin: 0;">&copy; ${year} Kapioo. ${getTranslations(language).common.allRightsReserved}</p>
      </div>
    </div>
  `;

  return {
    subject: referralRewardTranslations[language].subject,
    html,
  };
}
