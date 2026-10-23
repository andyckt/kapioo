"use client"

/* Precompressed photographs are supplied at multiple widths. */
/* eslint-disable @next/next/no-img-element */
import { useRef } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { DAILY_DELIVERY_AREAS, WEEKLY_ONLY_AREAS } from '@/lib/constants/areas'
import { getAreaDisplayLabel } from '@/lib/zones/coverage-copy'
import { homeCopy } from '@/features/marketing-home/content'
import { Navigation } from '@/features/marketing-home/marketing-home'
import { KapiooIcon, type KapiooIconName } from '@/features/marketing-home/kapioo-icons'
import { useHomeMotion } from '@/features/marketing-home/use-home-motion'
import './how-it-works.css'

const pageCopy = {
  en: {
    eyebrow: 'The Kapioo way',
    titleFirst: 'A better meal routine.',
    titleSecond: 'On your terms.',
    intro: 'Freshly made Asian fusion meals delivered across Toronto and the GTA. Buy meal vouchers, then order only when it works for you.',
    order: 'Order now', seeHow: 'See how it works',
    heroAlt: 'Two friends smiling while enjoying Kapioo meals',
    heroPhotoNote: 'A little more room for life.',
    addressEyebrow: 'Start with your address',
    addressTitle: 'The right meals for where you are.',
    addressBody: 'Enter your address first. We’ll show the meal plans and delivery days available to you, so every next step is relevant.',
    addressNote: 'Availability depends on your exact address.',
    addressPhotoAlt: 'Kapioo Daily Bento with freshly prepared dishes and branded box',
    addressPhotoTwoAlt: 'Kapioo Weekly Meal Box with a selection of prepared meals',
    voucherEyebrow: 'Buy a pack',
    voucherTitle: 'Your meals are ready when you are.',
    voucherBody: 'Choose a voucher pack for your available plan. Your vouchers stay in your account until you’re ready to use them—no automatic meal orders, no unwanted deliveries.',
    voucherDetail: 'Pay by e-Transfer. Vouchers are issued after payment review and valid for six months.',
    voucherLabel: 'A little good food, on your schedule',
    voucherMini: ['Buy a pack', 'Keep your vouchers', 'Redeem when ready'],
    redeemEyebrow: 'Make it yours',
    redeemTitle: 'Choose a day. Choose your meal.',
    redeemBody: 'Explore the rotating menu and redeem vouchers for the meals you want on an available delivery day. We cook what you order and bring it to you.',
    redeemUnbox: 'Unbox', redeemEnjoy: 'Enjoy',
    unboxAlt: 'Hands opening a Kapioo meal box at the table',
    dinnerAlt: 'Enjoying a Kapioo meal at home',
    plansEyebrow: 'Two ways to eat well',
    plansTitle: 'Good food. Your rhythm.',
    plansBody: 'Your address determines which plans you can choose. Both start with flexible meal vouchers.',
    daily: 'Daily Bento', dailyBody: 'Freshly cooked lunches, delivered.',
    dailyMeta: 'Minimum 2 meals per delivery', dailyWindow: 'Mon–Fri & Sun · 11 am–1 pm',
    dailyAlt: 'Freshly cooked Kapioo Daily Bento with a branded box',
    weekly: 'Weekly Meal Box', weeklyBody: 'Stock the fridge. Heat and enjoy.',
    weeklyMeta: 'Twice-weekly delivery. Cover your entire week.', weeklyWindow: 'Tuesday & Sunday · 6–10 pm',
    weeklyAlt: 'Kapioo Weekly Meal Box meals ready for the fridge',
    plansCta: 'See what’s available to me',
    detailsEyebrow: 'Good to know', detailsTitle: 'The practical bits, made clear.',
    details: [
      { icon: 'clock' as KapiooIconName, title: 'Order cutoff', body: 'Order by 11:59 am the day before your delivery.' },
      { icon: 'heat' as KapiooIconName, title: 'Keep it fresh', body: 'Refrigerate your meals. Best enjoyed within three days.' },
      { icon: 'cook' as KapiooIconName, title: 'Ready when you are', body: 'Enjoy Daily Bento fresh. Reheat Weekly Meal Box by microwave or stovetop.' },
    ],
    coverageTitle: 'Where we deliver',
    coverageBody: 'We serve Toronto and many parts of the GTA. Check your address for the plans and delivery days available to you.',
    coverageDaily: 'Daily Bento + Weekly Meal Box', coverageWeekly: 'Weekly Meal Box only',
    coverageExpand: 'Browse service areas',
    closingEyebrow: 'Good food. Room for life.', closingTitle: 'Ready for a better meal routine?',
    closingBody: 'Start with your address. We’ll take it from there.',
    footer: 'Asian fusion meal delivery in Toronto & the GTA.', back: 'Back to top',
  },
  zh: {
    eyebrow: 'Kapioo 的方式',
    titleFirst: '好好吃饭，', titleSecond: '照自己的节奏。',
    intro: '新鲜现做的亚洲融合风味餐食，配送至多伦多及 GTA。先购买餐券，想订餐时再兑换。',
    order: '立即订餐', seeHow: '了解订餐流程',
    heroAlt: '两位朋友开心享用 Kapioo 餐食', heroPhotoNote: '让生活多一点自己的空间。',
    addressEyebrow: '从地址开始', addressTitle: '适合你的餐食，从地址开始。',
    addressBody: '先输入地址。我们会显示该地址可选的餐食计划和配送日，让接下来的选择更清楚。',
    addressNote: '实际服务范围以详细地址为准。',
    addressPhotoAlt: 'Kapioo 每日 Bento 与品牌餐盒', addressPhotoTwoAlt: 'Kapioo 周次 Meal Box 多款餐食',
    voucherEyebrow: '购买餐券', voucherTitle: '想吃的时候，再安排。',
    voucherBody: '选择可用计划，购买餐券套餐。餐券会保存在账户中，想订餐时再使用；不会自动生成餐食订单，也不会收到不需要的餐食。',
    voucherDetail: '通过 e-Transfer 付款；审核通过后发放餐券，有效期为六个月。', voucherLabel: '跟着自己的节奏，好好吃饭',
    voucherMini: ['购买套餐', '餐券留在账户', '想吃时再兑换'],
    redeemEyebrow: '选你喜欢的', redeemTitle: '选好日子，选好餐食。',
    redeemBody: '浏览定期更新的菜单，在可用配送日兑换想吃的餐食。你下单，我们现做并配送。',
    redeemUnbox: '打开餐盒', redeemEnjoy: '好好享用',
    unboxAlt: '在餐桌上打开 Kapioo 餐盒', dinnerAlt: '在家享用 Kapioo 餐食',
    plansEyebrow: '两种用餐方式', plansTitle: '好好吃饭，随你安排。',
    plansBody: '可选计划取决于你的地址。两种计划都可以先购买餐券，再灵活兑换。',
    daily: '每日 Bento', dailyBody: '新鲜现做的午餐，送到身边。',
    dailyMeta: '每次配送至少 2 份', dailyWindow: '周一至周五及周日 · 上午 11 点至下午 1 点',
    dailyAlt: 'Kapioo 新鲜现做的每日 Bento 与品牌餐盒',
    weekly: '周次 Meal Box', weeklyBody: '冷藏备好，加热即可享用。',
    weeklyMeta: '每周配送两次，覆盖整周餐食。', weeklyWindow: '周二及周日 · 下午 6 点至 10 点',
    weeklyAlt: '适合放入冰箱的 Kapioo 周次 Meal Box 餐食',
    plansCta: '查看我可以选择的计划',
    detailsEyebrow: '订餐须知', detailsTitle: '重要信息，一目了然。',
    details: [
      { icon: 'clock' as KapiooIconName, title: '下单截止', body: '请在配送日前一天上午 11:59 前下单。' },
      { icon: 'heat' as KapiooIconName, title: '保鲜建议', body: '餐食需冷藏保存，建议三天内食用。' },
      { icon: 'cook' as KapiooIconName, title: '享用方式', body: '每日 Bento 新鲜享用；周次 Meal Box 可用微波炉或炉灶加热。' },
    ],
    coverageTitle: '配送范围',
    coverageBody: '我们服务多伦多及 GTA 多个地区。输入详细地址，即可查看可选计划和配送日。',
    coverageDaily: '每日 Bento + 周次 Meal Box', coverageWeekly: '仅周次 Meal Box',
    coverageExpand: '查看服务地区',
    closingEyebrow: '好好吃饭，慢慢生活。', closingTitle: '准备好开启新的用餐节奏？',
    closingBody: '先输入地址，剩下的交给我们。',
    footer: '配送至多伦多及 GTA 的亚洲融合风味餐食。', back: '返回顶部',
  },
}

function Action({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Link href="/starter" className={`kh-button ${className}`} prefetch={false}>{children}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /></Link>
}

function Picture({ name, alt, className = '', eager = false, sizes = '(max-width: 760px) 88vw, 45vw' }: { name: string; alt: string; className?: string; eager?: boolean; sizes?: string }) {
  const widths = name.startsWith('ritual-') ? [640, 1280, 1672] : name.startsWith('hero-') ? [640, 1280] : [640, 1280, 1920]
  return <img className={className} src={`/marketing/${name}-1280.webp`} srcSet={widths.map(width => `/marketing/${name}-${width}.webp ${width}w`).join(', ')} sizes={sizes} alt={alt} width={name === 'hero-shared-moment' ? 1200 : 1920} height={name === 'hero-shared-moment' ? 1500 : name.startsWith('ritual-') ? 1080 : 2560} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
}

export function HowItWorksContent() {
  const { language } = useLanguage()
  const copy = pageCopy[language]
  const root = useRef<HTMLDivElement>(null)
  useHomeMotion(root, language)

  return <div id="top" ref={root} lang={language === 'zh' ? 'zh-Hans' : 'en'} className="kapioo-home kh-linen kh-how-page">
    <a className="kh-skip" href="#main">{homeCopy[language].skip}</a>
    <div className="kh-reading-progress" aria-hidden="true" />
    <Navigation copy={homeCopy[language]} homeHref="/" sectionPrefix="/" currentPage="how" />
    <main id="main">
      <section className="khw-hero kh-wrap" data-scene="hero" aria-labelledby="khw-title">
        <div className="khw-hero-copy" data-reveal>
          <p className="kh-eyebrow">{copy.eyebrow}</p>
          <h1 id="khw-title">{copy.titleFirst}<br /><em>{copy.titleSecond}</em></h1>
          <p className="khw-lead">{copy.intro}</p>
          <div className="khw-actions"><Action>{copy.order}</Action><a className="khw-text-action" href="#the-process">{copy.seeHow}<ArrowDown size={17} aria-hidden="true" /></a></div>
        </div>
        <div className="khw-hero-visual" data-reveal>
          <Picture name="hero-shared-moment" alt={copy.heroAlt} className="khw-hero-photo" eager sizes="(max-width: 760px) 88vw, 36vw" />
          <span className="khw-photo-note">{copy.heroPhotoNote}</span>
        </div>
      </section>

      <section id="the-process" className="khw-chapter khw-address kh-wrap" data-scene="address" aria-labelledby="khw-address-title">
        <div className="khw-chapter-copy" data-reveal><p className="kh-eyebrow">{copy.addressEyebrow}</p><h2 id="khw-address-title">{copy.addressTitle}</h2><p>{copy.addressBody}</p><div className="khw-mini-note"><KapiooIcon name="location" size={25} />{copy.addressNote}</div><Action>{copy.order}</Action></div>
        <div className="khw-address-visual" data-reveal>
          <div className="khw-address-photo khw-address-photo-daily"><Picture name="plan-daily" alt={copy.addressPhotoAlt} sizes="(max-width: 760px) 43vw, 22vw" /></div>
          <div className="khw-address-photo khw-address-photo-weekly"><Picture name="plan-weekly" alt={copy.addressPhotoTwoAlt} sizes="(max-width: 760px) 43vw, 22vw" /></div>
        </div>
      </section>

      <section className="khw-vouchers" data-scene="vouchers" aria-labelledby="khw-vouchers-title"><div className="kh-wrap khw-vouchers-inner">
        <div className="khw-voucher-art" data-reveal aria-hidden="true"><div className="khw-ticket"><div className="khw-ticket-top"><span>kapioo.</span><KapiooIcon name="heart" size={31} /></div><div className="khw-ticket-center"><img src="/mascot/kapioo-mascot-photo-bento-camera.png" alt="" width={1024} height={1024} loading="lazy" /><span>{copy.voucherLabel}</span></div><div className="khw-ticket-bottom">KAPIOO <span>✦</span> MEAL VOUCHER</div></div><span className="khw-ticket-shadow" /></div>
        <div className="khw-chapter-copy" data-reveal><p className="kh-eyebrow">{copy.voucherEyebrow}</p><h2 id="khw-vouchers-title">{copy.voucherTitle}</h2><p>{copy.voucherBody}</p><div className="khw-voucher-mini">{copy.voucherMini.map(label => <span key={label}>{label}</span>)}</div><p className="khw-fineprint">{copy.voucherDetail}</p></div>
      </div></section>

      <section className="khw-chapter khw-redeem kh-wrap" data-scene="redeem" aria-labelledby="khw-redeem-title">
        <div className="khw-chapter-copy" data-reveal><p className="kh-eyebrow">{copy.redeemEyebrow}</p><h2 id="khw-redeem-title">{copy.redeemTitle}</h2><p>{copy.redeemBody}</p><Action>{copy.order}</Action></div>
        <div className="khw-redeem-photos" data-reveal><figure><Picture name="ritual-unbox" alt={copy.unboxAlt} sizes="(max-width: 760px) 72vw, 26vw" /><figcaption>{copy.redeemUnbox}</figcaption></figure><figure><Picture name="ritual-dinner" alt={copy.dinnerAlt} sizes="(max-width: 760px) 72vw, 26vw" /><figcaption>{copy.redeemEnjoy}</figcaption></figure></div>
      </section>

      <section className="khw-plans" data-scene="plans" aria-labelledby="khw-plans-title"><div className="kh-wrap">
        <div className="khw-section-intro" data-reveal><p className="kh-eyebrow">{copy.plansEyebrow}</p><h2 id="khw-plans-title">{copy.plansTitle}</h2><p>{copy.plansBody}</p></div>
        <div className="khw-plan-grid"><article data-reveal><Picture name="plan-daily" alt={copy.dailyAlt} sizes="(max-width: 760px) 45vw, 24vw" /><div><p className="kh-eyebrow">{copy.dailyWindow}</p><h3>{copy.daily}</h3><p>{copy.dailyBody}</p><span><KapiooIcon name="bento" size={20} />{copy.dailyMeta}</span></div></article><article data-reveal><Picture name="plan-weekly" alt={copy.weeklyAlt} sizes="(max-width: 760px) 45vw, 24vw" /><div><p className="kh-eyebrow">{copy.weeklyWindow}</p><h3>{copy.weekly}</h3><p>{copy.weeklyBody}</p><span><KapiooIcon name="calendar" size={20} />{copy.weeklyMeta}</span></div></article></div>
        <Action className="khw-plan-action">{copy.plansCta}</Action>
      </div></section>

      <section className="khw-details kh-wrap" data-scene="details" aria-labelledby="khw-details-title"><div className="khw-section-intro" data-reveal><p className="kh-eyebrow">{copy.detailsEyebrow}</p><h2 id="khw-details-title">{copy.detailsTitle}</h2></div><div className="khw-details-grid">{copy.details.map(item => <article key={item.title} data-reveal><KapiooIcon name={item.icon} size={36} /><h3>{item.title}</h3><p>{item.body}</p></article>)}</div><div className="khw-coverage" data-reveal><div><p className="kh-eyebrow">Toronto & the GTA</p><h3>{copy.coverageTitle}</h3><p>{copy.coverageBody}</p><Action>{copy.plansCta}</Action></div><details><summary>{copy.coverageExpand}<ArrowDown size={18} aria-hidden="true" /></summary><div className="khw-coverage-lists"><div><h4>{copy.coverageDaily}</h4><p>{DAILY_DELIVERY_AREAS.map(area => getAreaDisplayLabel(area, 'daily', language)).join(' · ')}</p></div><div><h4>{copy.coverageWeekly}</h4><p>{WEEKLY_ONLY_AREAS.map(area => getAreaDisplayLabel(area, 'weekly', language)).join(' · ')}</p></div></div></details></div></section>

      <section className="khw-closing" data-scene="closing"><div className="kh-wrap" data-reveal><p className="kh-eyebrow">{copy.closingEyebrow}</p><h2>{copy.closingTitle}</h2><p>{copy.closingBody}</p><Action>{copy.order}</Action></div></section>
    </main>
    <footer className="khw-footer kh-wrap"><div><Link href="/" className="kh-brand">kapioo.</Link><p>{copy.footer}</p></div><a href="#top">{copy.back}<ArrowUpRight size={17} aria-hidden="true" /></a></footer>
  </div>
}
