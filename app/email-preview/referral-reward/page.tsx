import Link from 'next/link';

import { buildReferralRewardEmail } from '@/lib/email/referral-reward-email';
import type { Language } from '@/lib/email-translations';
import {
  formatPromoDiscountLabel,
  formatPromoDiscountNote,
} from '@/lib/promo-codes/format-discount-label';

type PageProps = {
  searchParams: Promise<{
    lang?: string;
    name?: string;
    friend?: string;
    code?: string;
    discountType?: string;
    discountValue?: string;
  }>;
};

const SAMPLE = {
  name: 'Donald',
  referredFriendName: 'Gordon',
  promoCode: 'REFERU2IBF',
  discountType: 'fixed' as const,
  discountValue: 10,
} as const;

function resolveLanguage(value: string | undefined): Language {
  return value === 'en' ? 'en' : 'zh';
}

export default async function ReferralRewardEmailPreviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const name = params.name?.trim() || SAMPLE.name;
  const referredFriendName = params.friend?.trim() || SAMPLE.referredFriendName;
  const promoCode = params.code?.trim() || SAMPLE.promoCode;
  const discountType = params.discountType === 'percentage' ? 'percentage' : 'fixed';
  const discountValue = Number(params.discountValue ?? SAMPLE.discountValue);
  const resolvedDiscountValue = Number.isFinite(discountValue) && discountValue > 0 ? discountValue : SAMPLE.discountValue;
  const discountLabel = formatPromoDiscountLabel(discountType, resolvedDiscountValue, language);
  const discountNote = formatPromoDiscountNote(discountType, resolvedDiscountValue, language);

  const { subject, html } = buildReferralRewardEmail({
    name,
    promoCode,
    referredFriendName,
    discountLabel,
    discountNote,
    language,
  });

  const query = new URLSearchParams({
    lang: language,
    name,
    friend: referredFriendName,
    code: promoCode,
    discountType,
    discountValue: String(resolvedDiscountValue),
  });

  return (
    <div className="min-h-screen bg-[#eceff3] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B7D6E]">
                Email preview
              </p>
              <h1 className="mt-1 text-xl font-semibold text-[#3D342C]">
                Referral reward promo code email
              </h1>
              <p className="mt-2 text-sm text-[#6B5F53]">
                Preview only. Use query params to customize:{' '}
                <code className="rounded bg-[#F5F0EA] px-1.5 py-0.5 text-xs">
                  ?lang=zh&amp;name=Donald&amp;friend=Gordon&amp;code=REFERU2IBF
                </code>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/email-preview/referral-reward?${new URLSearchParams({ ...Object.fromEntries(query), lang: 'zh' }).toString()}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${language === 'zh' ? 'bg-[#C2884E] text-white' : 'bg-[#F5F0EA] text-[#6B5F53]'}`}
              >
                中文
              </Link>
              <Link
                href={`/email-preview/referral-reward?${new URLSearchParams({ ...Object.fromEntries(query), lang: 'en' }).toString()}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${language === 'en' ? 'bg-[#C2884E] text-white' : 'bg-[#F5F0EA] text-[#6B5F53]'}`}
              >
                English
              </Link>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#E8D5C4] bg-[#FFFCF9] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8B7D6E]">Subject</p>
            <p className="mt-1 text-sm font-medium text-[#3D342C]">{subject}</p>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[#8B7D6E]">Name</dt>
              <dd className="font-medium text-[#3D342C]">{name}</dd>
            </div>
            <div>
              <dt className="text-[#8B7D6E]">Referred friend</dt>
              <dd className="font-medium text-[#3D342C]">{referredFriendName}</dd>
            </div>
            <div>
              <dt className="text-[#8B7D6E]">Promo code</dt>
              <dd className="font-mono font-medium text-[#3D342C]">{promoCode}</dd>
            </div>
          </dl>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <iframe
            title="Referral reward email preview"
            srcDoc={html}
            className="h-[920px] w-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
