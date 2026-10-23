"use client"

/* Precompressed local brand photographs are served at responsive widths. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import type { HelpArticle } from '@/lib/support/knowledge'
import { formatDailyCoverageList, formatWeeklyOnlyCoverageList } from '@/lib/zones/coverage-copy'
import { homeCopy } from '@/features/marketing-home/content'
import { Navigation } from '@/features/marketing-home/marketing-home'
import { KapiooIcon, type KapiooIconName } from '@/features/marketing-home/kapioo-icons'
import { useHomeMotion } from '@/features/marketing-home/use-home-motion'
import './faq.css'

type FaqItem = { slug: string; question: string; answer: string }
type Language = 'en' | 'zh'

function fallbackFaqs(language: Language): FaqItem[] {
  if (language === 'zh') return [
    { slug: 'coverage', question: '你们配送哪些地区？', answer: `每日 Bento 覆盖：${formatDailyCoverageList('zh')}。周次 Meal Box 还覆盖：${formatWeeklyOnlyCoverageList('zh')}。请输入详细地址确认可用计划。` },
    { slug: 'plans', question: '每日 Bento 和周次 Meal Box 有什么区别？', answer: '每日 Bento 在你选择的配送日送来新鲜现做的午餐，每次至少两份。周次 Meal Box 每周配送两次，方便放进冰箱、按需加热。可选计划取决于你的地址。' },
    { slug: 'vouchers', question: '餐券如何使用？', answer: '先选择可用计划并购买餐券。付款审核通过后，餐券会存入你的账户。想订餐时，再兑换可用配送日的餐食；不会自动生成餐食订单。餐券有效期为六个月。' },
    { slug: 'payment', question: '如何付款？', answer: '目前支持 e-Transfer。请按结账页面指引转账并上传付款凭证。审核通过后餐券到账，即可兑换餐食。' },
    { slug: 'pause', question: '可以暂停或跳过配送吗？', answer: '可以。餐券不会自动安排餐食。你可以按计划规则选择可用配送日，在需要时再下单。' },
    { slug: 'cutoff', question: '下单截止时间是几点？', answer: '请在配送日前一天、多伦多时间上午 11:59 前下单。' },
    { slug: 'cancel', question: '如何取消订单？', answer: '在「我的订单」中查看是否可取消。周次订单须整组取消；符合条件的订单会退回原餐券或积分。若无法自行操作，请联系团队。' },
    { slug: 'menus', question: '可以自己选择餐食吗？', answer: '可以。选择配送日后，从当日可选菜单中挑选喜欢的餐食。菜单定期更新。' },
    { slug: 'storage', question: '餐食可以保存多久？', answer: '请冷藏保存，建议三天内食用。' },
    { slug: 'heat', question: '如何加热餐食？', answer: '请按照餐盒上的说明加热。周次 Meal Box 可使用微波炉或炉灶加热。' },
    { slug: 'dietary', question: '有忌口或特殊饮食选项吗？', answer: '菜单定期更新。如有严重过敏或饮食限制，请在下单前联系我们，了解食材和制作方式。' },
    { slug: 'contact', question: '如何联系客服？', answer: '请提交支持工单，告诉我们你的问题。我们的团队会在 2–3 个工作日内通过邮件回复。' },
  ]
  return [
    { slug: 'coverage', question: 'Where do you deliver?', answer: `Daily Bento is available in ${formatDailyCoverageList('en')}. Weekly Meal Box also reaches ${formatWeeklyOnlyCoverageList('en')}. Enter your exact address to see your options.` },
    { slug: 'plans', question: 'What’s the difference between Daily Bento and Weekly Meal Box?', answer: 'Daily Bento brings freshly cooked lunches on the delivery days you choose, with a minimum of two meals per delivery. Weekly Meal Box arrives twice a week for you to refrigerate and reheat. Your address determines which plans are available.' },
    { slug: 'vouchers', question: 'How do meal vouchers work?', answer: 'Choose an available plan and buy a voucher pack. Once your payment is approved, vouchers appear in your account. Redeem them for meals on an available delivery day whenever you want to order. Meal orders are not automatic. Vouchers are valid for six months.' },
    { slug: 'payment', question: 'How do payments work?', answer: 'We currently accept e-Transfer. Follow the checkout instructions and upload your payment proof. Your vouchers are issued after our team approves the payment.' },
    { slug: 'pause', question: 'Can I pause or skip a delivery?', answer: 'Yes. Vouchers do not schedule meals automatically. Choose an available delivery day when you want to order, subject to your plan’s rules.' },
    { slug: 'cutoff', question: 'When is the order cutoff?', answer: 'Order by 11:59 am Toronto time the day before delivery.' },
    { slug: 'cancel', question: 'How do I cancel an order?', answer: 'Check My Orders for an eligible cancellation option. Weekly orders must be cancelled as a group. Eligible cancellations return the original vouchers or credits. If you cannot cancel online, contact our team.' },
    { slug: 'menus', question: 'Can I choose my meals?', answer: 'Yes. Pick from the available menu for your selected delivery day. Menus rotate, so there is always something new to look forward to.' },
    { slug: 'storage', question: 'How long do meals stay fresh?', answer: 'Keep your meals refrigerated. They are best enjoyed within three days.' },
    { slug: 'heat', question: 'How do I reheat my meals?', answer: 'Follow the instructions on the container. Weekly Meal Box meals can be reheated by microwave or stovetop.' },
    { slug: 'dietary', question: 'Do you have dietary options?', answer: 'Our menu changes regularly. If you have a serious allergy or dietary restriction, contact us before ordering to ask about ingredients and preparation.' },
    { slug: 'contact', question: 'How do I contact Kapioo?', answer: 'Submit a support ticket with your question. Our team will reply by email within 2–3 business days.' },
  ]
}

const copy = {
  en: {
    eyebrow: 'Kapioo / Questions & answers',
    titleFirst: 'Good questions.',
    titleSecond: 'Clear answers.',
    lead: 'Everything you need to know about our meals, vouchers and delivery—without the guesswork.',
    order: 'Order now', browse: 'Browse answers',
    heroAlt: 'Kapioo meal boxes ready to enjoy',
    photoNote: 'Good food starts with a little clarity.',
    spotlightLabel: 'The flexible part', spotlightTitle: 'Buy vouchers first. Order meals when you want.',
    spotlightBody: 'No automatic meal orders. Choose your meals and an available delivery day when it suits you.',
    spotlightLink: 'See how Kapioo works',
    categoriesLabel: 'Find your answer',
    categories: [
      { id: 'starting', title: 'Getting started', icon: 'location' as KapiooIconName, slugs: ['coverage', 'plans', 'menus'] },
      { id: 'orders', title: 'Vouchers & orders', icon: 'choice' as KapiooIconName, slugs: ['vouchers', 'payment', 'pause', 'cutoff', 'cancel'] },
      { id: 'food', title: 'Food & freshness', icon: 'bento' as KapiooIconName, slugs: ['storage', 'heat', 'dietary'] },
      { id: 'support', title: 'Need a hand?', icon: 'heart' as KapiooIconName, slugs: ['contact', 'tracking', 'delivery', 'changes'] },
    ],
    more: 'More answers',
    supportEyebrow: 'Still wondering?',
    supportTitle: 'We’re here to help.',
    supportBody: 'Questions about an order or a meal? Send us a support ticket. We’ll reply by email within 2–3 business days.',
    supportCta: 'Submit a ticket',
    closingEyebrow: 'Good food. Room for life.',
    closingTitle: 'Ready when you are.',
    closingBody: 'Start with your address to see the meals and delivery options available to you.',
    footer: 'Asian fusion meal delivery in Toronto & the GTA.', back: 'Back to top',
  },
  zh: {
    eyebrow: 'Kapioo / 常见问题',
    titleFirst: '有问题？',
    titleSecond: '我们来解答。',
    lead: '从餐食、餐券到配送，重要信息都在这里，订餐更安心。',
    order: '立即订餐', browse: '浏览解答',
    heroAlt: '准备享用的 Kapioo 餐食',
    photoNote: '了解清楚，好好吃饭。',
    spotlightLabel: '灵活餐券制', spotlightTitle: '先买餐券，想吃时再订餐。',
    spotlightBody: '不会自动生成餐食订单。选择喜欢的餐食，在可用配送日兑换即可。',
    spotlightLink: '了解 Kapioo 订餐流程',
    categoriesLabel: '查找解答',
    categories: [
      { id: 'starting', title: '开始订餐', icon: 'location' as KapiooIconName, slugs: ['coverage', 'plans', 'menus'] },
      { id: 'orders', title: '餐券与订单', icon: 'choice' as KapiooIconName, slugs: ['vouchers', 'payment', 'pause', 'cutoff', 'cancel'] },
      { id: 'food', title: '餐食与保鲜', icon: 'bento' as KapiooIconName, slugs: ['storage', 'heat', 'dietary'] },
      { id: 'support', title: '需要帮助？', icon: 'heart' as KapiooIconName, slugs: ['contact', 'tracking', 'delivery', 'changes'] },
    ],
    more: '更多解答',
    supportEyebrow: '还有疑问？', supportTitle: '我们随时为你解答。',
    supportBody: '关于订单或餐食有问题？提交支持工单，我们会在 2–3 个工作日内通过邮件回复。',
    supportCta: '提交工单',
    closingEyebrow: '好好吃饭，慢慢生活。', closingTitle: '准备好了，就开始吧。',
    closingBody: '先输入地址，查看你可以选择的餐食与配送方式。',
    footer: '配送至多伦多及 GTA 的亚洲融合风味餐食。', back: '返回顶部',
  },
}

function Action({ children }: { children: React.ReactNode }) {
  return <Link className="kh-button" href="/starter" prefetch={false}>{children}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /></Link>
}

export function FaqContent() {
  const { language } = useLanguage()
  const t = copy[language]
  const root = useRef<HTMLDivElement>(null)
  const [published, setPublished] = useState<HelpArticle[]>([])
  useHomeMotion(root, `${language}:${published.length}`)

  useEffect(() => {
    let active = true
    fetch('/api/support/knowledge')
      .then(async response => ({ data: await response.json(), enabled: response.headers.get('X-Support-Published') === 'true' }))
      .then(({ data, enabled }) => { if (active && enabled && data.success && Array.isArray(data.data)) setPublished(data.data) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const faqs = useMemo(() => {
    const articles = new Map(fallbackFaqs(language).map(item => [item.slug, item]))
    for (const article of published) if (article.slug !== 'contact') articles.set(article.slug, { slug: article.slug, ...article[language] })
    return [...articles.values()]
  }, [language, published])
  const knownSlugs = new Set(t.categories.flatMap(category => category.slugs))
  const groups = [
    ...t.categories.map(category => ({ ...category, items: faqs.filter(item => category.slugs.includes(item.slug)) })),
    { id: 'more', title: t.more, icon: 'choice' as KapiooIconName, slugs: [], items: faqs.filter(item => !knownSlugs.has(item.slug)) },
  ].filter(group => group.items.length)

  return <div id="top" ref={root} lang={language === 'zh' ? 'zh-Hans' : 'en'} className="kapioo-home kh-linen kh-faq-page">
    <a className="kh-skip" href="#main">{homeCopy[language].skip}</a>
    <div className="kh-reading-progress" aria-hidden="true" />
    <Navigation copy={homeCopy[language]} homeHref="/" sectionPrefix="/" currentPage="faq" />
    <main id="main">
      <section className="khq-hero kh-wrap" data-scene="hero" aria-labelledby="khq-title">
        <div className="khq-hero-copy" data-reveal><p className="kh-eyebrow">{t.eyebrow}</p><h1 id="khq-title">{t.titleFirst}<br /><em>{t.titleSecond}</em></h1><p className="khq-lead">{t.lead}</p><div className="khq-actions"><Action>{t.order}</Action><a href="#questions" className="khq-text-action">{t.browse}<ArrowDown size={17} aria-hidden="true" /></a></div></div>
        <figure className="khq-hero-visual" data-reveal><img src="/marketing/plan-weekly-1280.webp" srcSet="/marketing/plan-weekly-640.webp 640w, /marketing/plan-weekly-1280.webp 1280w, /marketing/plan-weekly-1920.webp 1920w" sizes="(max-width: 760px) 88vw, 37vw" width={4000} height={6000} alt={t.heroAlt} loading="eager" fetchPriority="high" decoding="async" /><figcaption>{t.photoNote}</figcaption></figure>
      </section>

      <section className="khq-spotlight" data-scene="spotlight"><div className="kh-wrap khq-spotlight-inner" data-reveal><div className="khq-spotlight-mark"><KapiooIcon name="choice" size={48} /></div><div><p className="kh-eyebrow">{t.spotlightLabel}</p><h2>{t.spotlightTitle}</h2><p>{t.spotlightBody}</p></div><Link href="/how-it-works" className="khq-spotlight-link">{t.spotlightLink}<ArrowUpRight size={18} aria-hidden="true" /></Link></div></section>

      <section id="questions" className="khq-questions kh-wrap" data-scene="questions" aria-label={t.categoriesLabel}>
        <aside className="khq-categories" data-reveal><p className="kh-eyebrow">{t.categoriesLabel}</p><nav aria-label={t.categoriesLabel}>{groups.map(group => <a key={group.id} href={`#faq-${group.id}`}>{group.title}<ArrowUpRight size={15} aria-hidden="true" /></a>)}</nav></aside>
        <div className="khq-answer-groups">{groups.map(group => <section key={group.id} id={`faq-${group.id}`} className="khq-answer-group" data-scene={group.id} aria-labelledby={`faq-heading-${group.id}`}><div className="khq-group-heading" data-reveal><KapiooIcon name={group.icon} size={35} /><div><p className="kh-eyebrow">{t.categoriesLabel}</p><h2 id={`faq-heading-${group.id}`}>{group.title}</h2></div></div><div className="khq-accordion">{group.items.map(item => <details key={item.slug} data-reveal><summary>{item.question}<span aria-hidden="true">+</span></summary><div className="khq-answer"><p>{item.answer}</p>{item.slug === 'contact' && <a href="/support">{t.supportCta}<ArrowUpRight size={16} aria-hidden="true" /></a>}</div></details>)}</div></section>)}</div>
      </section>

      <section className="khq-support" data-scene="support"><div className="kh-wrap khq-support-inner"><div className="khq-support-copy" data-reveal><p className="kh-eyebrow">{t.supportEyebrow}</p><h2>{t.supportTitle}</h2><p>{t.supportBody}</p><a href="/support" className="khq-support-link">{t.supportCta}<ArrowUpRight size={18} aria-hidden="true" /></a></div><div className="khq-support-art" data-reveal aria-hidden="true"><img src="/mascot/kapioo-mascot-headphones-music-notes.png" width={1024} height={1024} alt="" loading="lazy" /></div></div></section>
      <section className="khq-closing" data-scene="closing"><div className="kh-wrap" data-reveal><p className="kh-eyebrow">{t.closingEyebrow}</p><h2>{t.closingTitle}</h2><p>{t.closingBody}</p><Action>{t.order}</Action></div></section>
    </main>
    <footer className="khq-footer kh-wrap"><div><Link href="/" className="kh-brand">kapioo.</Link><p>{t.footer}</p></div><a href="#top">{t.back}<ArrowUpRight size={17} aria-hidden="true" /></a></footer>
  </div>
}
