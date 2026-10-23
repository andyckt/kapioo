import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MarketingHome } from '@/features/marketing-home/marketing-home'
import { LanguageProvider } from '@/lib/language-context'
import { finalists } from '@/features/marketing-home/variants'
import { homeCopy } from '@/features/marketing-home/content'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { KapiooIcon, kapiooIconNames } from '@/features/marketing-home/kapioo-icons'
import { marketingMetadata, marketingStructuredData, serializeStructuredData } from '@/features/marketing-home/seo'

describe('Kapioo finalist customer journeys', () => {
  for (const language of ['en', 'zh'] as const) {
    for (const variant of finalists) {
      it(`${variant.name} renders a complete ${language} journey, with the portrait film second`, () => {
        // eslint-disable-next-line react/no-children-prop -- Required children are included for the provider's React 19 props type.
        const html = renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: language, children: createElement(MarketingHome, { variant: variant.id, videoId: '1190305785' }) }))
        expect(html.match(/<h1[ >]/g)).toHaveLength(1)
        expect(html).toContain(homeCopy[language].heroStart)
        expect(html).toContain(homeCopy[language].daily)
        expect(html).toContain(homeCopy[language].weekly)
        expect(html).toContain(`lang="${language === 'en' ? 'en' : 'zh-Hans'}"`)
        const mainSections = [...html.slice(html.indexOf('<main')).matchAll(/<section\b[^>]*>/g)].map(match => match[0])
        expect(mainSections[0]).toContain('kh-hero')
        expect(mainSections[1]).toContain('id="kitchen"')
        expect(html).toContain('player.vimeo.com/video/1190305785')
        expect(html).toContain('controls=0')
        expect(html).toContain('vimeo_logo=0')
        expect(html).toContain('autoplay=0')
        expect(html).toContain('muted=1')
        expect(html).toContain('playsinline=1')
        const kitchen = html.slice(html.indexOf('<section id="kitchen"'), html.indexOf('</section>', html.indexOf('<section id="kitchen"')))
        expect(kitchen).not.toContain('<figcaption')
        expect(html).not.toContain('Watch on Vimeo')
        const hero = html.slice(html.indexOf('<section'), html.indexOf('</section>'))
        expect(hero).toContain(homeCopy[language].start)
        expect(hero.replaceAll('&amp;', '&')).toContain(homeCopy[language].heroDelivery)
        expect(hero).not.toContain('kh-mascot')
        expect(hero).not.toContain('kh-photo-caption')
        expect(hero).not.toContain('kh-hero-foot')
        expect(html).not.toContain('background=1')
        const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1])
        expect(hrefs).toEqual(expect.arrayContaining(['/starter', '/how-it-works', '/faq', '/login']))
        expect(hrefs).not.toContain('/daily-delivery')
        expect(hrefs).not.toContain('/weekly-meal')
        expect(html).toContain(homeCopy[language].plansLead)
        expect(html).toContain('data-kapioo-icon="location"')
        expect(html).toContain('data-kapioo-icon="cook"')
        expect(html).not.toMatch(/#1|number one/i)
        expect(html).toMatch(/<a[^>]*href="\/starter"[^>]*target="_top"|<a[^>]*target="_top"[^>]*href="\/starter"/)
        const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]))
        for (const href of hrefs.filter(href => href.startsWith('#'))) expect(ids.has(href.slice(1)), href).toBe(true)
        for (const source of [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => match[1])) {
          expect(existsSync(path.join(process.cwd(), 'public', source)), source).toBe(true)
          expect(source).not.toMatch(/home-kitchen|generated|unsplash|placeholder/)
        }
        expect(html).toContain('kapioo-mascot-headphones-music-notes.png')
      })
    }
  }
  it('uses local existing product destinations and compressed responsive assets', () => {
    for (const route of ['starter', 'daily-delivery', 'weekly-meal', 'how-it-works', 'faq', 'login']) {
      expect(existsSync(path.join(process.cwd(), 'app', route, 'page.tsx'))).toBe(true)
    }
    for (const name of ['thai', 'korean', 'chinese', 'weekly', 'table']) for (const width of [640, 1280, 1920]) {
      const asset = readFileSync(path.join(process.cwd(), 'public/marketing', `${name}-${width}.webp`))
      expect(asset.subarray(8, 12).toString()).toBe('WEBP')
      expect(asset.length).toBeLessThan(700_000)
    }
  })
  it('permits only same-origin framing for the comparison pages', async () => {
    for (const route of ['/design-finalists', '/design-finalists/daylight']) {
      const response = await middleware(new NextRequest(`http://localhost${route}`))
      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
      expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'")
    }
  })
  it('preserves anti-framing protection for normal pages and similarly named paths', async () => {
    for (const route of ['/', '/starter', '/daily-delivery', '/weekly-meal', '/design-finalists-unrelated']) {
      const response = await middleware(new NextRequest(`http://localhost${route}`))
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")
    }
  })
  it('renders both meal plans together with one address-first availability action', () => {
    const html = renderToStaticMarkup(createElement(MarketingHome, { variant: 'linen', videoId: '1190305785' }))
    expect(html.match(/class="kh-plan-choice"/g)).toHaveLength(2)
    expect(html).not.toContain('role="tabpanel"')
    expect(html).toContain(homeCopy.zh.check)
    expect(html).toContain(homeCopy.zh.dailyBody)
    expect(html).toContain(homeCopy.zh.weeklyBody)
  })
  it('provides 12 original scalable icons with accessible decorative semantics', () => {
    expect(new Set(kapiooIconNames).size).toBe(12)
    for (const name of kapiooIconNames) {
      const html = renderToStaticMarkup(createElement(KapiooIcon, { name }))
      expect(html).toContain('viewBox="0 0 32 32"')
      expect(html).toContain('aria-hidden="true"')
      expect(html).not.toMatch(/<script|<image|<foreignObject/)
    }
  })
  it('keeps preview pages unindexed and prepares complete homepage search metadata', () => {
    const production = marketingMetadata()
    expect(production.title).toContain('Asian Fusion Meal Delivery in Toronto')
    expect(production.description).toContain('order online')
    expect(production.alternates?.canonical).toBe('https://www.kapioo.com/')
    expect(production.robots).toBeUndefined()
    expect(marketingMetadata('Linen').robots).toEqual({ index: false, follow: false })
  })
  it('uses verified organization/service data and escapes unsafe script delimiters', () => {
    const data = JSON.parse(serializeStructuredData(marketingStructuredData))
    expect(data['@graph'].map((item: { '@type': string }) => item['@type'])).toEqual(['Organization', 'WebSite', 'Service'])
    expect(data['@graph'][2].url).toBe('https://www.kapioo.com/starter')
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|price|#1/)
    expect(serializeStructuredData({ text: '</script><script>alert(1)</script>' })).not.toContain('<')
  })
})
