'use client'

/* The generated campaign portrait is served in responsive, precompressed sizes. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Minus, Plus, Send } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { homeCopy } from '@/features/marketing-home/content'
import { Navigation } from '@/features/marketing-home/marketing-home'
import { useHomeMotion } from '@/features/marketing-home/use-home-motion'
import { cateringCurrency, cateringMenu, type CateringCategory } from '@/lib/catering/menu'
import './catering.css'

const copy = {
  en: {
    eyebrow: 'Kapioo / Catering in Toronto & the GTA',
    title: 'Bring everyone', titleEm: 'to the table.',
    intro: 'Asian-inspired food made for the moments you share. From office lunches to celebrations, gather around generous trays, individual bentos, and a little something sweet.',
    explore: 'Explore the menu', inquire: 'Plan your gathering',
    heroAlt: 'Illustrative scene of a diverse group of friends sharing Asian-inspired catering dishes around a table',
    menuEyebrow: 'The menu', menuTitle: 'Made to share.', menuEm: 'Easy to love.',
    menuIntro: 'Build a table that feels like yours. Our sharing trays are designed around 12 portions; pick your favourites and send us a shortlist with your event details.',
    priceNote: 'All prices in CAD · HST extra', select: 'Add to shortlist', remove: 'Remove one',
    menuEndTitle: 'The table is taking shape.', menuEndBody: 'Send us your favourites and we’ll help with the rest.', menuEndCta: 'Start your inquiry',
    menuGroups: {
      chinese: { eyebrow: 'Chinese-inspired', title: 'Comfort, with a little spark.', description: 'Fried rice, duck sliders, noodles and more for everyone to share.' },
      japanese: { eyebrow: 'Japanese & fusion', title: 'A table full of discovery.', description: 'From gyoza to miso pork belly, mix and match your favourites.' },
      dessert: { eyebrow: 'Desserts', title: 'Save room for this.', description: 'A sweet finish made with our friends at Fuwa Fuwa Pancakes.' },
    },
    tray: 'tray', order: 'order', batch: 'batch',
    corporateEyebrow: 'For the whole team', corporateTitle: 'One good lunch,', corporateEm: 'many happy people.',
    corporateBody: 'Planning an office lunch or recurring team meal? Ask about individual Kapioo bento boxes at a corporate rate. The menu changes by day; we’ll help you find the right option for your group.',
    corporateCta: 'Ask about corporate bentos',
    notesEyebrow: 'Before we gather', notesTitle: 'The details, made simple.',
    notes: [
      { value: '48h', title: 'Plan ahead', body: 'Please give us at least 48 hours’ notice.' },
      { value: '$99+', title: 'Delivery', body: 'Free for orders over $99. Otherwise $7.99.' },
      { value: '$20', title: 'Dessert containers', body: 'Refundable deposit per reusable container, returned when you bring it back.' },
      { value: 'HST', title: 'Good to know', body: 'Tax is extra. We’ll confirm menu availability and allergens with your order.' },
    ],
    formEyebrow: 'Your gathering starts here', formTitle: 'Tell us what you’re planning.',
    formIntro: 'Share a few details and an optional menu shortlist. We’ll get back to you by email within 24–48 hours on business days.',
    service: 'What are you planning?', sharing: 'Sharing trays', corporate: 'Corporate bentos',
    intent: 'I’d like to', quote: 'Request a quote', startOrder: 'Start an order',
    name: 'Your name', email: 'Email address', phone: 'Phone number', organization: 'Company or event name',
    eventDate: 'Event date', servingTime: 'Serving time', guests: 'Number of guests', eventType: 'Type of gathering',
    address: 'Delivery address or event location', details: 'Anything else we should know?',
    detailsPlaceholder: 'Tell us about dietary needs, schedule, dessert flavours, or the kind of gathering you have in mind.',
    optional: 'optional', selectPlaceholder: 'Choose one',
    eventTypes: ['Office lunch', 'Birthday or celebration', 'Family gathering', 'Community event', 'Other'],
    shortlist: 'Your menu shortlist', emptyShortlist: 'Explore the menu above and add anything you like. You can also leave this empty and ask us to help you choose.',
    estimated: 'Indicative menu subtotal', estimateNote: 'Before HST, delivery and any refundable dessert-container deposits. This is not a final quote or confirmed booking.',
    send: 'Send catering inquiry', sending: 'Sending your inquiry…', error: 'We couldn’t send your inquiry. Please try again.',
    success: 'We’ve got your plans.', successBody: 'Thank you for thinking of Kapioo. We’ll reply to your email within 24–48 hours on business days to confirm availability and next steps.',
    reference: 'Your inquiry reference', again: 'Plan another gathering',
    formFine: 'Your booking is confirmed only after our team sends a final quote and confirms the details.',
    footer: 'Good food, better together.', back: 'Back to top',
  },
  zh: {
    eyebrow: 'Kapioo / 多伦多及 GTA 团体餐饮', title: '好味道，', titleEm: '一起分享。',
    intro: '为欢聚时刻准备的亚洲风味餐食。办公室午餐、庆祝聚会或亲友相聚，都可以一起分享丰盛餐盘、独立便当与甜点。',
    explore: '查看菜单', inquire: '筹备我的聚会',
    heroAlt: '不同背景的朋友围桌分享亚洲风味餐食的创意示意照片',
    menuEyebrow: '餐饮菜单', menuTitle: '一起分享，', menuEm: '每道都喜欢。',
    menuIntro: '分享餐盘按约 12 份设计。选择喜欢的菜品，连同活动详情发给我们。',
    priceNote: '价格为加元 · 未含 HST', select: '加入意向清单', remove: '减少一份',
    menuEndTitle: '美好的一桌，渐渐成形。', menuEndBody: '把喜欢的菜品发给我们，其他的交给我们。', menuEndCta: '开始咨询',
    menuGroups: {
      chinese: { eyebrow: '中式灵感', title: '熟悉的味道，新鲜的惊喜。', description: '适合围桌分享的经典风味，带一点 Kapioo 的新意。' },
      japanese: { eyebrow: '日式与融合风味', title: '越分享，越有发现。', description: '丰富又有趣的菜品，可以搭配中式餐盘一起享用。' },
      dessert: { eyebrow: '甜品', title: '留点空间给甜点。', description: '与 Fuwa Fuwa Pancakes 合作提供日式灵感甜品。' },
    },
    tray: '餐盘', order: '份', batch: '批',
    corporateEyebrow: '为整个团队准备', corporateTitle: '一顿好午餐，', corporateEm: '大家都开心。',
    corporateBody: '筹备办公室午餐或定期团队用餐？欢迎咨询企业价独立 Kapioo 便当。菜单每天变化，我们会帮你选择适合团队的方案。',
    corporateCta: '咨询企业便当',
    notesEyebrow: '订餐须知', notesTitle: '重要细节，清楚明白。',
    notes: [
      { value: '48h', title: '提前预订', body: '请至少提前 48 小时联系我们。' },
      { value: '$99+', title: '配送', body: '订单超过 $99 免费配送；$99 或以下收取 $7.99。' },
      { value: '$20', title: '甜点容器', body: '每个可重复使用容器的可退还押金；归还后退款。' },
      { value: 'HST', title: '其他须知', body: '价格未含税。菜单供应情况与过敏原信息将在订餐时确认。' },
    ],
    formEyebrow: '从这里开始', formTitle: '说说你的聚会计划。',
    formIntro: '填写活动资料，也可添加意向菜品。我们会在工作日的 24–48 小时内通过邮件回复。',
    service: '需要哪种餐饮？', sharing: '分享餐盘', corporate: '企业便当',
    intent: '我想', quote: '获取报价', startOrder: '开始订餐',
    name: '姓名', email: '电子邮箱', phone: '电话号码', organization: '公司或活动名称',
    eventDate: '活动日期', servingTime: '用餐时间', guests: '用餐人数', eventType: '活动类型',
    address: '配送地址或活动地点', details: '还有什么需要告诉我们？',
    detailsPlaceholder: '可以说明饮食需求、时间安排、甜点口味或聚会形式。', optional: '选填', selectPlaceholder: '请选择',
    eventTypes: ['办公室午餐', '生日或庆祝活动', '亲友聚会', '社区活动', '其他'],
    shortlist: '意向菜品', emptyShortlist: '可以在上方添加喜欢的菜品，也可以留空，让我们帮你推荐。',
    estimated: '参考菜品小计', estimateNote: '未含 HST、配送费或甜点容器可退还押金；并非最终报价或已确认的订单。',
    send: '发送餐饮咨询', sending: '正在发送…', error: '咨询发送失败，请重试。',
    success: '我们收到你的计划了。', successBody: '感谢考虑 Kapioo。我们会在工作日的 24–48 小时内通过邮件回复，确认供应情况与下一步。',
    reference: '咨询编号', again: '筹备另一个聚会',
    formFine: '只有团队发送最终报价并确认详情后，预订才算成立。',
    footer: '好味道，一起分享。', back: '返回顶部',
  },
} as const

const menuCategories: CateringCategory[] = ['chinese', 'japanese', 'dessert']

export function CateringContent() {
  const { language } = useLanguage()
  const t = copy[language]
  const root = useRef<HTMLDivElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [service, setService] = useState<'sharing-trays' | 'corporate-bentos'>('sharing-trays')
  const [intent, setIntent] = useState<'quote' | 'order'>('quote')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const [minDate, setMinDate] = useState('')
  useHomeMotion(root, language)

  useEffect(() => { setMinDate(new Date().toLocaleDateString('en-CA')) }, [])

  const selected = useMemo(() => cateringMenu.filter(item => (quantities[item.id] || 0) > 0), [quantities])
  const subtotal = selected.reduce((total, item) => total + item.price * quantities[item.id], 0)

  function changeQuantity(id: string, delta: number) {
    setQuantities(current => ({ ...current, [id]: Math.max(0, Math.min(100, (current[id] || 0) + delta)) }))
  }

  function focusInquiry(nextService?: 'sharing-trays' | 'corporate-bentos') {
    if (nextService) setService(nextService)
    document.getElementById('inquiry')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.current || sending) return
    setSending(true)
    setError('')
    const data = new FormData(form.current)
    try {
      const response = await fetch('/api/catering/inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent, service, name: data.get('name'), email: data.get('email'), phone: data.get('phone'),
          organization: data.get('organization'), eventDate: data.get('eventDate'), servingTime: data.get('servingTime'),
          guests: Number(data.get('guests')), eventType: data.get('eventType'), address: data.get('address'),
          details: data.get('details'), selection: selected.map(item => ({ id: item.id, quantity: quantities[item.id] })),
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success || !result.data?.reference) throw new Error('Inquiry send failed')
      setReference(result.data.reference)
      form.current.reset()
      setQuantities({})
      requestAnimationFrame(() => document.getElementById('inquiry')?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
    } catch {
      setError(t.error)
    } finally {
      setSending(false)
    }
  }

  return <div id="top" ref={root} className="kapioo-home kh-linen kh-catering-page" lang={language === 'zh' ? 'zh-Hans' : 'en'}>
    <a className="kh-skip" href="#main">{homeCopy[language].skip}</a>
    <div className="kh-reading-progress" aria-hidden="true" />
    <Navigation copy={homeCopy[language]} homeHref="/" sectionPrefix="/" currentPage="catering" />
    <main id="main">
      <section className="khc-hero" data-scene="hero" aria-labelledby="khc-hero-title">
        <div className="khc-hero-copy kh-wrap" data-reveal>
          <p className="kh-eyebrow">{t.eyebrow}</p>
          <h1 id="khc-hero-title">{t.title}<br /><em>{t.titleEm}</em></h1>
          <p className="khc-lead">{t.intro}</p>
          <div className="khc-hero-actions"><a className="kh-button" href="#menu">{t.explore}<ArrowDown size={17} strokeWidth={1.5} /></a><a className="khc-quiet-link" href="#inquiry">{t.inquire}<ArrowUpRight size={17} strokeWidth={1.5} /></a></div>
        </div>
        <div className="khc-hero-photo-shell" data-reveal>
          <div className="khc-hero-photo"><img src="/marketing/catering-together-1280.webp" srcSet="/marketing/catering-together-640.webp 640w, /marketing/catering-together-1280.webp 1122w" sizes="(max-width: 760px) 90vw, 38vw" width={1122} height={1402} alt={t.heroAlt} fetchPriority="high" decoding="async" /></div>
        </div>
      </section>

      <section id="menu" className="khc-menu kh-wrap" data-scene="menu" aria-labelledby="khc-menu-title">
        <div className="khc-menu-opening" data-reveal><div><p className="kh-eyebrow">{t.menuEyebrow}</p><h2 id="khc-menu-title">{t.menuTitle}<br /><em>{t.menuEm}</em></h2></div><p>{t.menuIntro}</p></div>
        <div className="khc-menu-nav" aria-label={language === 'zh' ? '菜单分类' : 'Menu categories'}>{menuCategories.map(category => <a key={category} href={`#${category}-menu`}>{t.menuGroups[category].eyebrow}<ArrowDown size={14} /></a>)}<span>{t.priceNote}</span></div>
        {menuCategories.map(category => <div id={`${category}-menu`} key={category} className="khc-menu-group" data-scene={category}>
          {category === 'dessert' ? <div className="khc-dessert-intro" data-reveal>
            <div className="khc-dessert-copy">
              <p className="kh-eyebrow">{t.menuGroups[category].eyebrow}</p>
              <h3>{t.menuGroups[category].title}</h3>
              <p>{t.menuGroups[category].description}</p>
              <img className="khc-fuwa-logo" src="/marketing/fuwafuwa-logo.webp" width={600} height={129} alt="Fuwa Fuwa Japanese Pancakes" loading="lazy" decoding="async" />
            </div>
            <div className="khc-dessert-photo"><img src="/marketing/fuwafuwa-pancakes.webp" width={1086} height={1448} alt="Fluffy Japanese pancakes with mango, strawberry, and chocolate toppings" loading="lazy" decoding="async" /></div>
          </div> : <div className="khc-group-heading" data-reveal><p className="kh-eyebrow">{t.menuGroups[category].eyebrow}</p><h3>{t.menuGroups[category].title}</h3><p>{t.menuGroups[category].description}</p></div>}
          <div className="khc-menu-list">{cateringMenu.filter(item => item.category === category).map(item => {
            const quantity = quantities[item.id] || 0
            return <article className="khc-menu-item" key={item.id} data-reveal>
              <div className="khc-item-detail"><h4>{item.name}</h4><p>{item.serves}{item.note ? ` · ${item.note}` : ''}</p></div>
              <div className="khc-item-end"><strong>{cateringCurrency(item.price)} <small>/ {t[item.unit]}</small></strong><div className="khc-quantity" aria-label={`${item.name} ${language === 'zh' ? '数量' : 'quantity'}`}><button type="button" disabled={!quantity} onClick={() => changeQuantity(item.id, -1)} aria-label={`${t.remove}: ${item.name}`}><Minus size={16} /></button><span aria-live="polite">{quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`${t.select}: ${item.name}`}><Plus size={16} /></button></div></div>
            </article>
          })}</div>
        </div>)}
        <div className="khc-menu-close" data-reveal><div><h3>{t.menuEndTitle}</h3><p>{t.menuEndBody}</p></div><a href="#inquiry" className="kh-button">{t.menuEndCta}{selected.length > 0 && <span className="khc-selection-count">{selected.reduce((count, item) => count + quantities[item.id], 0)}</span>}<ArrowUpRight size={17} /></a></div>
      </section>

      <section className="khc-corporate" data-scene="corporate"><div className="khc-corporate-inner kh-wrap"><div className="khc-corporate-photo" data-reveal><img src="/marketing/plan-daily-1280.webp" alt={language === 'zh' ? 'Kapioo 品牌便当实拍' : 'Kapioo bento meal with vegetables, rice and mains'} loading="lazy" width={1280} height={1707} /></div><div className="khc-corporate-copy" data-reveal><p className="kh-eyebrow">{t.corporateEyebrow}</p><h2>{t.corporateTitle}<br /><em>{t.corporateEm}</em></h2><p>{t.corporateBody}</p><button type="button" className="khc-quiet-link" onClick={() => focusInquiry('corporate-bentos')}>{t.corporateCta}<ArrowUpRight size={18} /></button></div></div></section>

      <section className="khc-notes kh-wrap" data-scene="notes" aria-labelledby="khc-notes-title"><div className="khc-notes-heading" data-reveal><p className="kh-eyebrow">{t.notesEyebrow}</p><h2 id="khc-notes-title">{t.notesTitle}</h2></div><div className="khc-notes-grid">{t.notes.map(note => <article key={note.title} data-reveal><strong className="khc-note-value">{note.value}</strong><div><h3>{note.title}</h3><p>{note.body}</p></div></article>)}</div></section>

      <section id="inquiry" className="khc-inquiry" data-scene="inquiry" aria-labelledby="khc-inquiry-title"><div className="kh-wrap khc-inquiry-layout">
        <div className="khc-inquiry-intro" data-reveal><p className="kh-eyebrow">{t.formEyebrow}</p><h2 id="khc-inquiry-title">{t.formTitle}</h2><p>{t.formIntro}</p><div className="khc-response-note"><Clock3 size={22} strokeWidth={1.4} /><span>24–48 {language === 'zh' ? '小时 · 工作日' : 'hours · business days'}</span></div></div>
        <div className="khc-form-shell" data-reveal>{reference ? <div className="khc-success" role="status" aria-live="polite"><span className="khc-success-icon"><Check size={30} /></span><h3>{t.success}</h3><p>{t.successBody}</p><div className="khc-reference"><small>{t.reference}</small><strong>{reference}</strong></div><button type="button" onClick={() => setReference('')}>{t.again}<ArrowUpRight size={16} /></button></div> : <form ref={form} onSubmit={submit} className="khc-form">
          <fieldset className="khc-choice"><legend>{t.service}</legend><div><label><input type="radio" name="service" checked={service === 'sharing-trays'} onChange={() => setService('sharing-trays')} /><span>{t.sharing}</span></label><label><input type="radio" name="service" checked={service === 'corporate-bentos'} onChange={() => setService('corporate-bentos')} /><span>{t.corporate}</span></label></div></fieldset>
          <fieldset className="khc-choice"><legend>{t.intent}</legend><div><label><input type="radio" name="intent" checked={intent === 'quote'} onChange={() => setIntent('quote')} /><span>{t.quote}</span></label><label><input type="radio" name="intent" checked={intent === 'order'} onChange={() => setIntent('order')} /><span>{t.startOrder}</span></label></div></fieldset>
          <div className="khc-field-grid"><label>{t.name}<input name="name" type="text" autoComplete="name" minLength={2} maxLength={100} required /></label><label>{t.email}<input name="email" type="email" autoComplete="email" maxLength={254} required /></label></div>
          <div className="khc-field-grid"><label><span>{t.phone} <i>({t.optional})</i></span><input name="phone" type="tel" autoComplete="tel" maxLength={60} /></label><label><span>{t.organization} <i>({t.optional})</i></span><input name="organization" type="text" maxLength={120} /></label></div>
          <div className="khc-field-grid"><label>{t.eventDate}<input name="eventDate" type="date" min={minDate} required /></label><label><span>{t.servingTime} <i>({t.optional})</i></span><input name="servingTime" type="text" maxLength={80} placeholder="12:30 pm" /></label></div>
          <div className="khc-field-grid"><label>{t.guests}<input name="guests" type="number" min={1} max={10000} required /></label><label>{t.eventType}<select name="eventType" defaultValue="" required><option value="" disabled>{t.selectPlaceholder}</option>{t.eventTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label></div>
          <label>{t.address}<input name="address" type="text" autoComplete="street-address" minLength={5} maxLength={300} required /></label>
          <label><span>{t.details} <i>({t.optional})</i></span><textarea name="details" rows={5} maxLength={5000} placeholder={t.detailsPlaceholder} /></label>
          <div className="khc-shortlist"><h3>{t.shortlist}</h3>{selected.length ? <><ul>{selected.map(item => <li key={item.id}><span>{item.name} <small>× {quantities[item.id]}</small></span><strong>{cateringCurrency(item.price * quantities[item.id])}</strong></li>)}</ul><div className="khc-subtotal"><span>{t.estimated}</span><strong>{cateringCurrency(subtotal)}</strong></div><p>{t.estimateNote}</p></> : <p>{t.emptyShortlist}</p>}</div>
          {error && <p className="khc-form-error" role="alert">{error}</p>}
          <button className="kh-button khc-submit" type="submit" disabled={sending}>{sending ? t.sending : t.send}<Send size={17} strokeWidth={1.5} /></button>
          <p className="khc-form-fine">{t.formFine}</p>
        </form>}</div>
      </div></section>
    </main>
    <footer className="khc-footer kh-wrap"><div><Link href="/" className="kh-brand">kapioo.</Link><p>{t.footer}</p></div><div><Link href="/faq">FAQ<ArrowRight size={15} /></Link><Link href="/support">{language === 'zh' ? '联系我们' : 'Support'}<ArrowRight size={15} /></Link><a href="#top">{t.back}<ArrowUpRight size={15} /></a></div></footer>
  </div>
}
