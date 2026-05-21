#!/usr/bin/env tsx
/**
 * One-off referral reward email sender.
 *
 * IMPORTANT: Emails must use a public production base URL for logo + CTA links.
 * Localhost URLs will not work in the recipient's inbox.
 *
 * Usage:
 *   NEXT_PUBLIC_BASE_URL=https://kapioo.com npx tsx scripts/send-referral-reward-email.ts \
 *     yzcs.student@gmail.com Cecilia Gordon REFERU2IBF
 *
 * Or set EMAIL_SEND_BASE_URL in .env.local to your production site.
 */

import dotenv from 'dotenv';

import { buildReferralRewardEmail } from '../lib/email/referral-reward-email';
import { resolvePublicEmailBaseUrl, assertPublicEmailBaseUrl } from '../lib/email/resolve-public-email-base-url';
import {
  formatPromoDiscountLabel,
  formatPromoDiscountNote,
} from '../lib/promo-codes/format-discount-label';
import { sendEmail } from '../lib/services/email';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DEFAULT_PRODUCTION_BASE_URL = 'https://kapioo.com';

function resolvePublicBaseUrl(): string {
  const candidate = resolvePublicEmailBaseUrl();
  return candidate || DEFAULT_PRODUCTION_BASE_URL;
}

async function main() {
  const to = process.argv[2] || 'yzcs.student@gmail.com';
  const name = process.argv[3] || 'Cecilia';
  const referredFriendName = process.argv[4] || 'Gordon';
  const promoCode = process.argv[5] || 'REFERU2IBF';

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set. Add it to .env.local first.');
    process.exit(1);
  }

  const baseUrl = resolvePublicBaseUrl();
  assertPublicEmailBaseUrl(baseUrl);

  const discountType = 'fixed' as const;
  const discountValue = 10;
  const discountLabel = formatPromoDiscountLabel(discountType, discountValue, 'zh');
  const discountNote = formatPromoDiscountNote(discountType, discountValue, 'zh');

  const logoUrl =
    process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim() || `${baseUrl}/kapioo-logo.png`;
  const dashboardUrl = `${baseUrl}/dashboard`;

  const { subject, html } = buildReferralRewardEmail({
    name,
    promoCode,
    referredFriendName,
    discountLabel,
    discountNote,
    language: 'zh',
    baseUrl,
  });

  console.log(`Sending referral reward email to ${to}...`);
  console.log(`Subject: ${subject}`);
  console.log(`Logo URL: ${logoUrl}`);
  console.log(`Dashboard URL: ${dashboardUrl}`);

  await sendEmail({ to, subject, html });

  console.log('Email sent successfully.');
}

main().catch((error) => {
  console.error('Failed to send referral reward email:', error);
  process.exit(1);
});
