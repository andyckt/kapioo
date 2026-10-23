"use client"

/* Native responsive images use precompressed, versioned derivatives of local originals. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Menu } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { homeCopy, type HomeCopy } from './content'
import type { HomeVariant } from './variants'
import { KitchenFilm } from './kitchen-film'
import { KapiooIcon, type KapiooIconName } from './kapioo-icons'
import { useHomeMotion } from './use-home-motion'
import './marketing-home.css'
import './scroll-details.css'
import './refinement.css'
import './hero-gallery.css'
import './ritual-story.css'
import './plan-portraits.css'
import './experience-polish.css'

type PhotoName = 'thai' | 'korean' | 'chinese' | 'weekly' | 'table'
function Photo({ name, alt, eager = false, className = '', sizes = '(max-width: 700px) 90vw, 50vw' }: { name: PhotoName; alt: string; eager?: boolean; className?: string; sizes?: string }) {
  const dimensions = name === 'table' ? [1920, 1440] : name === 'chinese' ? [1920, 2560] : [1920, 2880]
  return <img className={`kh-photo ${className}`} src={`/marketing/${name}-1280.webp`} srcSet={[640, 1280, 1920].map(width => `/marketing/${name}-${width}.webp ${width}w`).join(', ')} sizes={sizes} width={dimensions[0]} height={dimensions[1]} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
}
function Mascot({ music = false, className = '' }: { music?: boolean; className?: string }) {
  return <img className={`kh-mascot ${className}`} src={`/mascot/kapioo-mascot-${music ? 'headphones-music-notes' : 'photo-bento-camera'}.png`} alt="" width={1024} height={1024} loading="lazy" decoding="async" />
}
function Cta({ children, href = '/starter', subtle = false, className = '' }: { children: React.ReactNode; href?: string; subtle?: boolean; className?: string }) {
  return <Link href={href} target={href.startsWith('#') ? undefined : '_top'} prefetch={false} className={`${subtle ? 'kh-text-link' : 'kh-button'} ${className}`}>{children}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /></Link>
}
function SectionTitle({ eyebrow, title, em, children }: { eyebrow: string; title: string; em: string; children?: React.ReactNode }) {
  return <div className="kh-section-heading" data-reveal><p className="kh-eyebrow">{eyebrow}</p><h2>{title}{em && <><br /><em>{em}</em></>}</h2>{children}</div>
}
export function Navigation({ copy, homeHref = '#top', sectionPrefix = '', currentPage }: { copy: HomeCopy; homeHref?: string; sectionPrefix?: string; currentPage?: 'how' | 'faq' | 'support' | 'catering' }) {
  const { language, chooseLanguage } = useLanguage()
  const pendingSection = useRef<string | null>(null)
  const links = [`${sectionPrefix}#food`, `${sectionPrefix}#kitchen`, '/how-it-works', `${sectionPrefix}#plans`, '/catering', '/faq', '/support']
  const activeIndex = currentPage === 'how' ? 2 : currentPage === 'catering' ? 4 : currentPage === 'faq' ? 5 : currentPage === 'support' ? 6 : -1
  return <header className="kh-header">
    <a href={homeHref} className="kh-brand" aria-label="Kapioo">kapioo<span>.</span></a>
    <nav className="kh-desktop-nav" aria-label={language === 'zh' ? '主导航' : 'Main navigation'}>{[2, 5, 4, 6].map(index => <a key={links[index]} href={links[index]} aria-current={index === activeIndex ? 'page' : undefined}>{copy.nav[index]}</a>)}</nav>
    <div className="kh-nav-actions">
      <button className="kh-language" onClick={() => chooseLanguage(language === 'en' ? 'zh' : 'en')} aria-label={copy.language}>{language === 'en' ? '中文' : 'EN'}</button>
      <Link prefetch={false} className="kh-login" href="/login" target="_top">{copy.login}</Link>
      <Cta className="kh-nav-cta">{copy.start}</Cta>
      <Sheet>
        <SheetTrigger asChild><button className="kh-menu-button" aria-label={copy.menu}><Menu size={24} strokeWidth={1.5} /></button></SheetTrigger>
        <SheetContent className="kh-mobile-sheet" onCloseAutoFocus={event => {
          const hash = pendingSection.current
          if (!hash) return
          event.preventDefault()
          pendingSection.current = null
          // Wait until the dialog releases its scroll lock and focus trap.
          requestAnimationFrame(() => {
            const section = document.getElementById(hash.slice(1))
            if (!section) return
            section.focus({ preventScroll: true })
            section.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
            window.history.pushState(null, '', hash)
          })
        }}>
          <SheetTitle className="kh-brand">kapioo.</SheetTitle>
          <SheetDescription>{copy.footerLine}</SheetDescription>
          <nav>
            {links.map((href, index) => <SheetClose asChild key={href}>
              <a href={href} aria-current={index === activeIndex ? 'page' : undefined} onClick={() => { if (href.startsWith('#')) pendingSection.current = href }}>{copy.nav[index]}<ArrowUpRight size={20} /></a>
            </SheetClose>)}
            <Link href="/login" target="_top" prefetch={false}>{copy.login}<ArrowUpRight size={20} /></Link>
          </nav>
          <Link className="kh-button" href="/starter" target="_top" prefetch={false}>{copy.start}<ArrowUpRight size={18} /></Link>
          <Mascot music />
        </SheetContent>
      </Sheet>
    </div>
  </header>
}
function LinenPhotoSet({ copy, language, repeat = false, setRef }: { copy: HomeCopy; language: string; repeat?: boolean; setRef?: React.Ref<HTMLDivElement> }) {
  return <div ref={setRef} className="kh-linen-photo-set" aria-hidden={repeat || undefined}>
        <div className="kh-gallery-card kh-gallery-product kh-gallery-portrait"><Photo name="chinese" alt={copy.foods[2].alt} eager={!repeat} sizes="(max-width: 760px) 45vw, (max-width: 1050px) 22vw, 15vw" /></div>
        <div className="kh-gallery-card kh-gallery-people"><img src="/marketing/hero-shared-moment-1280.webp" srcSet="/marketing/hero-shared-moment-640.webp 640w, /marketing/hero-shared-moment-1280.webp 1280w" sizes="(max-width: 760px) 78vw, 28vw" width={1200} height={1500} alt={language === 'zh' ? '兩位朋友笑著享用餐點' : 'Two people laughing while enjoying takeaway meals'} loading={repeat ? 'lazy' : 'eager'} decoding="async" /></div>
        <div className="kh-gallery-card kh-gallery-product"><Photo name="thai" alt={copy.foods[0].alt} eager={!repeat} sizes="(max-width: 760px) 78vw, 28vw" /></div>
        <div className="kh-gallery-card kh-gallery-people"><img src="/marketing/hero-flash-lunch-1280.webp" srcSet="/marketing/hero-flash-lunch-640.webp 640w, /marketing/hero-flash-lunch-1280.webp 1280w" sizes="(max-width: 760px) 78vw, 28vw" width={1024} height={1280} alt={language === 'zh' ? '一位女性開心享用四格亞洲融合餐點的示意照片' : 'Illustrative scene of a woman enjoying a four-compartment Asian fusion meal'} loading="lazy" decoding="async" /></div>
        <div className="kh-gallery-card kh-gallery-product"><Photo name="korean" alt={copy.foods[1].alt} sizes="(max-width: 760px) 78vw, 20vw" /></div>
        <div className="kh-gallery-card kh-gallery-people"><img src="/marketing/hero-after-work-1280.webp" srcSet="/marketing/hero-after-work-640.webp 640w, /marketing/hero-after-work-1280.webp 1280w" sizes="(max-width: 760px) 78vw, 28vw" width={1024} height={1280} alt={language === 'zh' ? '下班後享用亞洲融合餐點的示意照片' : 'Illustrative scene of enjoying an Asian fusion meal after work'} loading="lazy" decoding="async" /></div>
  </div>
}
function LinenPhotoStrip({ copy, language }: { copy: HomeCopy; language: string }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const setRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const set = setRef.current
    if (!viewport || !set) return

    let setWidth = 0
    let frame = 0
    let lastFrame = 0
    let visible = false
    let hovering = false
    let pressing = false
    let dragging = false
    let dragX = 0
    let dragScroll = 0
    let quietUntil = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const compactScreen = window.matchMedia('(max-width: 760px)')

    const measure = () => {
      const nextWidth = set.getBoundingClientRect().width
      if (!nextWidth) return
      const offset = setWidth ? (viewport.scrollLeft - setWidth) / setWidth : 0
      setWidth = nextWidth
      viewport.scrollLeft = setWidth * (1 + offset)
    }
    const wrap = () => {
      if (!setWidth) return 0
      const position = viewport.scrollLeft
      if (position < setWidth * .5) {
        viewport.scrollLeft = position + setWidth
        return setWidth
      }
      if (position > setWidth * 1.5) {
        viewport.scrollLeft = position - setWidth
        return -setWidth
      }
      return 0
    }
    const tick = (time: number) => {
      const elapsed = lastFrame ? Math.min(time - lastFrame, 64) : 0
      lastFrame = time
      // Touching a focusable rail can leave it focused on phones. Only keyboard
      // focus should pause the automatic drift; touch gestures resume naturally.
      if (!hovering && !pressing && !viewport.matches(':focus-visible') && time > quietUntil) {
        viewport.scrollLeft += elapsed * (compactScreen.matches ? .042 : .024)
        wrap()
      }
      frame = requestAnimationFrame(tick)
    }
    const updateMotion = () => {
      if (visible && !reducedMotion.matches && !frame) {
        lastFrame = 0
        frame = requestAnimationFrame(tick)
      } else if ((!visible || reducedMotion.matches) && frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      updateMotion()
    }, { threshold: .25 })
    const resize = new ResizeObserver(measure)
    const onPointerEnter = (event: PointerEvent) => { if (event.pointerType === 'mouse') hovering = true }
    const onPointerLeave = (event: PointerEvent) => { if (event.pointerType === 'mouse') hovering = false }
    const onPointerDown = (event: PointerEvent) => {
      pressing = true
      quietUntil = performance.now() + 1600
      if (event.pointerType === 'mouse' && event.button === 0) {
        event.preventDefault()
        dragging = true
        dragX = event.clientX
        dragScroll = viewport.scrollLeft
        viewport.setPointerCapture(event.pointerId)
      }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      viewport.scrollLeft = dragScroll - (event.clientX - dragX)
      dragScroll += wrap()
    }
    const onPointerUp = (event: PointerEvent) => {
      pressing = false
      dragging = false
      quietUntil = performance.now() + 1600
      if (event.pointerType === 'mouse') {
        const bounds = viewport.getBoundingClientRect()
        hovering = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom
      }
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
    }
    const onWheel = () => { quietUntil = performance.now() + 1600 }
    const onPageScroll = () => { quietUntil = performance.now() + 700 }

    measure()
    resize.observe(set)
    intersection.observe(viewport)
    viewport.addEventListener('scroll', wrap, { passive: true })
    viewport.addEventListener('pointerenter', onPointerEnter)
    viewport.addEventListener('pointerleave', onPointerLeave)
    viewport.addEventListener('pointerdown', onPointerDown)
    viewport.addEventListener('pointermove', onPointerMove)
    viewport.addEventListener('pointerup', onPointerUp)
    viewport.addEventListener('pointercancel', onPointerUp)
    viewport.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('scroll', onPageScroll, { passive: true })
    reducedMotion.addEventListener('change', updateMotion)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      intersection.disconnect()
      viewport.removeEventListener('scroll', wrap)
      viewport.removeEventListener('pointerenter', onPointerEnter)
      viewport.removeEventListener('pointerleave', onPointerLeave)
      viewport.removeEventListener('pointerdown', onPointerDown)
      viewport.removeEventListener('pointermove', onPointerMove)
      viewport.removeEventListener('pointerup', onPointerUp)
      viewport.removeEventListener('pointercancel', onPointerUp)
      viewport.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', onPageScroll)
      reducedMotion.removeEventListener('change', updateMotion)
    }
  }, [])

  return <div className="kh-linen-photo-frame">
    <div ref={viewportRef} className="kh-linen-photo-strip" tabIndex={0} role="region" aria-label={language === 'zh' ? 'Kapioo 餐點與日常' : 'Kapioo meals and moments'}>
      <div className="kh-linen-photo-track">
        <LinenPhotoSet copy={copy} language={language} repeat />
        <LinenPhotoSet copy={copy} language={language} setRef={setRef} />
        <LinenPhotoSet copy={copy} language={language} repeat />
      </div>
    </div>
  </div>
}
function Hero({ variant, copy }: { variant: HomeVariant; copy: HomeCopy }) {
  const collage = variant === 'linen' || variant === 'open-house'
  const { language } = useLanguage()
  return <section className="kh-hero kh-wrap" data-scene="hero">
    <div className="kh-hero-heading">
      <h1>{copy.heroStart}<br /><em>{copy.heroEnd}</em></h1>
      <p className="kh-hero-lead">{copy.lead}<span>{copy.heroDelivery}</span></p>
      <div className="kh-hero-actions"><Cta>{copy.start}</Cta></div>
    </div>
    {variant === 'linen' ? <LinenPhotoStrip copy={copy} language={language} /> : <div className={`kh-hero-composition ${collage ? 'kh-collage' : ''}`}>
      {collage && <div className="kh-hero-side kh-side-left"><Photo name="chinese" alt={copy.foods[2].alt} eager sizes="(max-width: 760px) 28vw, 24vw" /></div>}
      <div className="kh-hero-window"><Photo name={variant === 'journal' ? 'korean' : variant === 'sunday' ? 'table' : 'thai'} alt={variant === 'sunday' ? copy.photoNote : copy.foods[variant === 'journal' ? 1 : 0].alt} eager sizes={collage ? '(max-width: 760px) 36vw, 28vw' : '80vw'} /></div>
      {collage && <div className="kh-hero-side kh-side-right"><Photo name="weekly" alt={copy.weekly} eager sizes="(max-width: 760px) 28vw, 24vw" /></div>}
    </div>}
  </section>
}
function Kitchen({ copy, videoId }: { copy: HomeCopy; videoId: string }) {
  const icons: KapiooIconName[] = ['prep', 'cook', 'box']
  return <section id="kitchen" tabIndex={-1} className="kh-kitchen" data-scene="kitchen">
    <div className="kh-wrap kh-kitchen-layout">
      <SectionTitle eyebrow={copy.kitchenEyebrow} title={copy.kitchenTitle} em={copy.kitchenEm} />
      <div className="kh-kitchen-film"><KitchenFilm videoId={videoId} copy={copy} /></div>
      <div className="kh-kitchen-story">
        {copy.kitchenSteps.map((step, index) => <article key={step.tag} className={`kh-kitchen-step kh-step-${index}`} data-reveal>
          <KapiooIcon name={icons[index]} size={34} /><div><p className="kh-eyebrow">{step.tag}</p><h3>{step.title}</h3><p>{step.body}</p></div>
        </article>)}
      </div>
    </div>
  </section>
}
function Food({ copy }: { copy: HomeCopy }) {
  return <section id="food" tabIndex={-1} className="kh-food kh-wrap" data-scene="food">
    <div className="kh-food-heading"><SectionTitle eyebrow={copy.foodEyebrow} title={copy.foodTitle} em={copy.foodEm} /><div className="kh-food-intro" data-reveal><p>{copy.foodLead}</p></div></div>
    <div className="kh-food-rail" tabIndex={0} aria-label={copy.foodEyebrow}>
      {copy.foods.map((food, index) => <article className="kh-food-card" key={food.name} data-reveal><div className="kh-food-image"><Photo name={(['thai', 'korean', 'chinese'] as const)[index]} alt={food.alt} sizes="(max-width: 700px) 82vw, 36vw" /></div><div className="kh-food-card-caption"><div><h3>{food.name}</h3><p>{food.detail}</p></div></div></article>)}
    </div>
    <div className="kh-food-foot"><p>{copy.foodNote}</p><Link href="/starter" target="_top" prefetch={false} className="kh-button kh-food-cta">{copy.start}</Link></div>
  </section>
}
function Plans({ copy }: { copy: HomeCopy }) {
  const { language } = useLanguage()
  const plans = [
    { key: 'daily', title: copy.daily, body: copy.dailyBody, detail: copy.dailyDetail, alt: language === 'zh' ? 'Kapioo 每日便当，四格热菜与米饭，搭配品牌餐盒' : 'Kapioo daily bento with four compartments of freshly prepared food beside its branded box', icon: 'bento' as const },
    { key: 'weekly', title: copy.weekly, body: copy.weeklyBody, detail: copy.weeklyDetail, alt: language === 'zh' ? 'Kapioo 周次餐盒，三款不同菜式摆放在暖粉色背景上' : 'Three Kapioo weekly meals with different dishes on a warm peach backdrop', icon: 'calendar' as const },
  ]
  return <section id="plans" tabIndex={-1} className="kh-plans kh-wrap" data-scene="plans">
    <div className="kh-plan-heading" data-reveal><h2>{copy.plansTitle}</h2><p>{copy.plansLead}</p></div>
    <div className="kh-plan-comparison">
      {plans.map(plan => <article key={plan.key} className="kh-plan-choice" data-reveal>
        <div className="kh-plan-choice-photo"><img className="kh-photo" src={`/marketing/plan-${plan.key}-1280.webp`} srcSet={[640, 1280, 1920].map(width => `/marketing/plan-${plan.key}-${width}.webp ${width}w`).join(', ')} sizes="(max-width: 760px) 46vw, 285px" width={plan.key === 'daily' ? 3916 : 4000} height={plan.key === 'daily' ? 5221 : 6000} alt={plan.alt} loading="lazy" decoding="async" /></div>
        <div className="kh-plan-choice-copy">
          <h3>{plan.title}</h3>
          <p>{plan.body}</p>
          <div className="kh-plan-detail"><KapiooIcon name={plan.icon} size={22} /><span>{plan.detail}</span></div>
        </div>
      </article>)}
    </div>
    <Cta className="kh-plan-cta">{copy.check}</Cta>
  </section>
}
function Ritual({ copy, variant }: { copy: HomeCopy; variant: HomeVariant }) {
  const { language } = useLanguage()
  if (variant === 'linen') {
    const moments = [
      { name: 'unbox', label: language === 'zh' ? '打开餐盒' : 'Unbox', alt: language === 'zh' ? '雙手打開印有 Kapioo 吉祥物的餐盒，旁邊放著一杯熱茶' : 'Opening a Kapioo meal box beside a cup of tea' },
      { name: 'playlist', label: language === 'zh' ? '放點音樂' : 'Press play', alt: language === 'zh' ? '手機顯示 Kapioo 音樂播放清單與戴耳機的吉祥物' : 'Kapioo playlist and headphone-wearing mascot on a phone' },
      { name: 'dinner', label: language === 'zh' ? '好好享用' : 'Enjoy', alt: language === 'zh' ? '在溫暖的家中用筷子享用 Kapioo 餐點' : 'Enjoying a Kapioo meal with chopsticks at home' },
    ] as const
    return <section id="ritual" tabIndex={-1} className="kh-ritual kh-ritual-story" data-scene="ritual"><div className="kh-wrap kh-ritual-story-inner">
      <div className="kh-ritual-story-heading" data-reveal>
        <h2><span>{copy.ritualStart}</span><em>{copy.ritualEnd}</em></h2>
        <p>{copy.ritualBody}</p>
      </div>
      <div className="kh-ritual-composition">
        <svg className="kh-ritual-thread" viewBox="0 0 1120 390" preserveAspectRatio="none" aria-hidden="true" data-reveal>
          <path pathLength="1000" d="M 18 235 C 170 375, 302 334, 421 178 S 599 35, 690 154 S 847 364, 1100 140" />
          <path className="kh-ritual-thread-echo" pathLength="1000" d="M 35 250 C 184 382, 301 326, 428 183 S 595 49, 688 162 S 855 353, 1084 155" />
        </svg>
        <svg className="kh-ritual-doodle kh-ritual-doodle-note" viewBox="0 0 72 78" fill="none" aria-hidden="true"><path d="M25 53V18c10-1 23-5 32-9v36M25 26c11-1 23-5 32-9" /><ellipse cx="17" cy="56" rx="9" ry="5" transform="rotate(-18 17 56)" /><ellipse cx="49" cy="47" rx="9" ry="5" transform="rotate(-18 49 47)" /><path d="M7 20l-4-5m14 1v-7m44 49 6 2" /></svg>
        <svg className="kh-ritual-doodle kh-ritual-doodle-heart" viewBox="0 0 68 62" fill="none" aria-hidden="true"><path d="M34 53C23 44 7 33 8 19c1-10 12-15 21-8l5 5 5-5c10-7 21-2 21 8 1 14-15 25-26 34Z" /><path d="M13 4 9 1m50 3 4-3M4 42l-3 4" /></svg>
        <div className="kh-ritual-moments">{moments.map((moment, index) => <figure className={`kh-ritual-moment kh-ritual-moment-${moment.name}`} key={moment.name} data-reveal>
          <div className="kh-ritual-moment-image"><img src={`/marketing/ritual-${moment.name}-1280.webp`} srcSet={[640, 1280, 1672].map(width => `/marketing/ritual-${moment.name}-${width}.webp ${width}w`).join(', ')} sizes={index === 0 ? '(max-width: 760px) 90vw, 34vw' : index === 1 ? '(max-width: 760px) 43vw, 26vw' : '(max-width: 760px) 43vw, 34vw'} width={1672} height={941} alt={moment.alt} loading="lazy" decoding="async" /></div>
          <figcaption>{moment.label}</figcaption>
        </figure>)}</div>
      </div>
    </div></section>
  }
  return <section className="kh-ritual" data-scene="ritual"><div className="kh-wrap kh-ritual-inner"><div className="kh-ritual-photo"><Photo name="table" alt={copy.photoNote} /></div><div className="kh-ritual-copy"><h2><span className="kh-ritual-line">{copy.ritualStart.split(' ').map((word, index) => <span key={`${index}-${word}`} className="kh-ritual-word" style={{ '--kh-word-index': index } as CSSProperties}>{word}{' '}</span>)}</span><em>{copy.ritualEnd}</em></h2><p data-reveal>{copy.ritualBody}</p><div className="kh-music-friend"><Mascot music /><span className="kh-music-line" aria-hidden="true"><i /><i /><i /><i /><i /></span></div></div></div></section>
}
function How({ copy }: { copy: HomeCopy }) {
  return <section id="how" className="kh-how kh-wrap" data-scene="how"><SectionTitle eyebrow={copy.howEyebrow} title={copy.howTitle} em={copy.howEm} /><div className="kh-how-grid">{copy.how.map((step, index) => <article key={step.title} data-reveal><span className="kh-how-number"><KapiooIcon name={(['location', 'choice', 'delivery'] as const)[index]} size={40} /></span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div><Cta>{copy.start}</Cta></section>
}
function Faq({ copy }: { copy: HomeCopy }) {
  return <section className="kh-faq kh-wrap"><div data-reveal><h2>{copy.faqTitle}</h2><Cta href="/faq" subtle>{copy.faqLink}</Cta></div><Accordion type="single" collapsible className="kh-questions">{copy.faqs.map((faq, index) => <AccordionItem key={faq.q} value={`faq-${index}`}><AccordionTrigger>{faq.q}</AccordionTrigger><AccordionContent>{faq.a}{index === 0 && <Cta subtle>{copy.check}</Cta>}{index === 3 && <a className="kh-text-link" href="https://www.instagram.com/kapioomeals/" target="_blank" rel="noreferrer">{copy.footerLinks[2]}<ArrowUpRight size={17} /></a>}</AccordionContent></AccordionItem>)}</Accordion></section>
}
export function MarketingHome({ variant, videoId }: { variant: HomeVariant; videoId: string }) {
  const { language } = useLanguage()
  const copy = homeCopy[language]
  const root = useRef<HTMLDivElement>(null)
  useHomeMotion(root, language)
  return <div id="top" ref={root} className={`kapioo-home kh-chapters kh-${variant}`} lang={language === 'zh' ? 'zh-Hans' : 'en'}><a className="kh-skip" href="#main">{copy.skip}</a><div className="kh-reading-progress" aria-hidden="true" /><Navigation copy={copy} /><main id="main"><Hero variant={variant} copy={copy} /><Kitchen copy={copy} videoId={videoId} /><How copy={copy} /><Plans copy={copy} /><Food copy={copy} /><Ritual copy={copy} variant={variant} /><Faq copy={copy} /><section className="kh-ending kh-wrap" data-scene="ending"><div data-reveal><h2>{copy.endingStart}<br /><em>{copy.endingEnd}</em></h2><p>{copy.endingBody}</p><Cta>{copy.start}</Cta></div><div className="kh-ending-friend"><Mascot music /></div></section></main><footer className="kh-footer kh-wrap"><div className="kh-footer-top"><div><a href="#top" className="kh-brand">kapioo.</a><p>{copy.footerLine}</p></div><nav aria-label={copy.faqLink}><Link href="/how-it-works" target="_top" prefetch={false}>{copy.footerLinks[0]}</Link><Link href="/catering" target="_top" prefetch={false}>{language === 'zh' ? '团体餐饮' : 'Catering'}</Link><Link href="/faq" target="_top" prefetch={false}>{copy.footerLinks[1]}</Link><Link href="/support" target="_top" prefetch={false}>{copy.footerLinks[2]}</Link><Link href="/social-media" target="_top" prefetch={false}>{language === 'zh' ? '关注我们' : 'Follow us'}<ArrowUpRight size={14} /></Link></nav></div><div className="kh-footer-bottom"><span>© {new Date().getFullYear()} {copy.copyright}</span><span>{copy.footerLocation}</span><a href="#top" aria-label={language === 'zh' ? '返回顶部' : 'Back to top'}><ArrowDown size={18} className="kh-up" /></a></div></footer></div>
}
