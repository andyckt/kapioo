'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Clock3, Mail, Send } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { homeCopy } from '@/features/marketing-home/content'
import { Navigation } from '@/features/marketing-home/marketing-home'
import { useHomeMotion } from '@/features/marketing-home/use-home-motion'
import { ticketTopics } from '@/lib/support/tickets'
import './support.css'

const copy = {
  en: {
    eyebrow: 'Kapioo / Customer care', title: 'A little help,', titleEm: 'when you need it.',
    lead: 'Tell us what’s on your mind. Your message goes straight to our team, and we’ll reply by email within 2–3 business days.',
    timeLabel: 'Our reply time', time: '2–3 business days',
    mailLabel: 'Where your ticket goes', mail: 'info@kapioo.com',
    formEyebrow: 'Send a support ticket', formTitle: 'How can we help?',
    formNote: 'For an existing order, include your order number so we can find it faster.',
    name: 'Your name', email: 'Email address', topic: 'What is this about?', order: 'Order number', optional: 'optional',
    message: 'Your message', messageHint: 'A few details help us give you a useful answer.',
    submit: 'Submit ticket', sending: 'Sending your ticket…', error: 'We couldn’t send your ticket. Please try again.',
    thanks: 'Your ticket is on its way.', received: 'We’ve received your message and will reply to the email address you provided within 2–3 business days.',
    reference: 'Your reference', again: 'Send another ticket',
    faq: 'Looking for a quick answer?', faqLink: 'Browse the FAQ',
    footer: 'Asian fusion meal delivery in Toronto & the GTA.', back: 'Back to top',
    topics: ['Order or delivery', 'Meal plans and vouchers', 'Food or ingredients', 'Account or payment', 'Something else'],
  },
  zh: {
    eyebrow: 'Kapioo / 客户支持', title: '有问题，', titleEm: '交给我们。',
    lead: '填写工单，直接发送给我们的团队。我们会在 2–3 个工作日内通过邮件回复。',
    timeLabel: '回复时间', time: '2–3 个工作日',
    mailLabel: '工单发送至', mail: 'info@kapioo.com',
    formEyebrow: '提交支持工单', formTitle: '需要什么帮助？',
    formNote: '如与现有订单有关，请填写订单号，方便我们更快找到相关信息。',
    name: '姓名', email: '电子邮箱', topic: '问题类型', order: '订单号', optional: '选填',
    message: '问题描述', messageHint: '提供一些细节，可以帮助我们更准确地答复。',
    submit: '提交工单', sending: '正在发送…', error: '工单发送失败，请重试。',
    thanks: '工单已发送。', received: '我们已收到你的消息，会在 2–3 个工作日内回复你填写的邮箱。',
    reference: '工单编号', again: '再提交一个工单',
    faq: '想先查找答案？', faqLink: '浏览常见问题',
    footer: '配送至多伦多及 GTA 的亚洲融合风味餐食。', back: '返回顶部',
    topics: ['订单或配送', '餐食计划与餐券', '餐食或食材', '账户或付款', '其他问题'],
  },
} as const

export function SupportContent() {
  const { language } = useLanguage()
  const t = copy[language]
  const root = useRef<HTMLDivElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const [order, setOrder] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  useHomeMotion(root, language)

  useEffect(() => {
    setOrder(new URLSearchParams(window.location.search).get('order')?.slice(0, 100) || '')
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.current || sending) return
    setSending(true)
    setError('')
    const values = new FormData(form.current)
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'), email: values.get('email'), topic: values.get('topic'),
          orderReference: values.get('orderReference'), message: values.get('message'),
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success || !result.data?.reference) throw new Error('Ticket send failed')
      setReference(result.data.reference)
      form.current.reset()
    } catch {
      setError(t.error)
    } finally {
      setSending(false)
    }
  }

  return <div id="top" ref={root} className="kapioo-home kh-linen kh-support-page" lang={language === 'zh' ? 'zh-Hans' : 'en'}>
    <a className="kh-skip" href="#main">{homeCopy[language].skip}</a>
    <div className="kh-reading-progress" aria-hidden="true" />
    <Navigation copy={homeCopy[language]} homeHref="/" sectionPrefix="/" currentPage="support" />
    <main id="main">
      <section className="khs-main kh-wrap" data-scene="main" aria-labelledby="khs-title">
        <div className="khs-intro" data-reveal>
          <p className="kh-eyebrow">{t.eyebrow}</p>
          <h1 id="khs-title">{t.title}<br /><em>{t.titleEm}</em></h1>
          <p className="khs-lead">{t.lead}</p>
          <div className="khs-assurances" aria-label={language === 'zh' ? '支持信息' : 'Support information'}>
            <div><Clock3 size={22} strokeWidth={1.4} aria-hidden="true" /><span><small>{t.timeLabel}</small><strong>{t.time}</strong></span></div>
            <div><Mail size={22} strokeWidth={1.4} aria-hidden="true" /><span><small>{t.mailLabel}</small><strong>{t.mail}</strong></span></div>
          </div>
          <div className="khs-faq-link"><span>{t.faq}</span><Link href="/faq">{t.faqLink}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        </div>
        <div className="khs-form-shell" data-reveal>
          {reference ? <div className="khs-success" role="status" aria-live="polite">
            <span className="khs-success-mark"><Check size={28} strokeWidth={1.4} aria-hidden="true" /></span>
            <p className="kh-eyebrow">Kapioo support</p>
            <h2>{t.thanks}</h2>
            <p>{t.received}</p>
            <div className="khs-reference"><small>{t.reference}</small><strong>{reference}</strong></div>
            <button type="button" className="khs-reset" onClick={() => { setReference(''); setOrder('') }}>{t.again}<ArrowUpRight size={17} aria-hidden="true" /></button>
          </div> : <>
            <p className="kh-eyebrow">{t.formEyebrow}</p>
            <h2>{t.formTitle}</h2>
            <p className="khs-form-note">{t.formNote}</p>
            <form ref={form} onSubmit={submit} className="khs-form">
              <div className="khs-two"><label>{t.name}<input name="name" type="text" autoComplete="name" required minLength={2} maxLength={100} /></label><label>{t.email}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label></div>
              <div className="khs-two"><label>{t.topic}<select name="topic" required defaultValue=""><option value="" disabled>{language === 'zh' ? '请选择' : 'Select a topic'}</option>{ticketTopics.map((topic, index) => <option key={topic} value={topic}>{t.topics[index]}</option>)}</select></label><label><span className="khs-label-text">{t.order} <i>({t.optional})</i></span><input name="orderReference" type="text" maxLength={100} value={order} onChange={event => setOrder(event.target.value)} /></label></div>
              <label>{t.message}<textarea name="message" rows={6} minLength={10} maxLength={5000} required aria-describedby="khs-message-hint" /></label>
              <p id="khs-message-hint" className="khs-hint">{t.messageHint}</p>
              {error && <p className="khs-error" role="alert">{error}</p>}
              <button type="submit" className="kh-button khs-submit" disabled={sending}>{sending ? t.sending : t.submit}<Send size={17} strokeWidth={1.5} aria-hidden="true" /></button>
            </form>
          </>}
        </div>
      </section>
    </main>
    <footer className="khs-footer kh-wrap"><div><Link href="/" className="kh-brand">kapioo.</Link><p>{t.footer}</p></div><a href="#top">{t.back}<ArrowUpRight size={17} aria-hidden="true" /></a></footer>
  </div>
}
