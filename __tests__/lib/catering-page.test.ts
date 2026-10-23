import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/lib/language-context'
import { CateringContent } from '@/app/catering/catering-content'
import { cateringInquiryEmailHtml, cateringInquirySchema } from '@/lib/catering/inquiries'
import { cateringMenu } from '@/lib/catering/menu'

const valid = {
  intent: 'quote', service: 'sharing-trays', name: 'Alex Kim', email: 'Alex@example.com',
  eventDate: '2026-11-20', guests: 24, eventType: 'Office lunch', address: '100 King St W, Toronto',
  selection: [{ id: 'peppercorn-chicken', quantity: 2 }, { id: 'gyoza', quantity: 1 }],
}

describe('Kapioo catering', () => {
  it('keeps every supplied menu item and price available on the page', () => {
    expect(cateringMenu).toHaveLength(19)
    expect(cateringMenu.filter(item => item.category === 'chinese')).toHaveLength(8)
    expect(cateringMenu.filter(item => item.category === 'japanese')).toHaveLength(7)
    expect(cateringMenu.filter(item => item.category === 'dessert')).toHaveLength(4)
    expect(cateringMenu.find(item => item.id === 'duck-sliders')?.price).toBe(90)
    expect(cateringMenu.find(item => item.id === 'gyoza')?.price).toBe(20)
    expect(cateringMenu.find(item => item.id === 'matcha-tiramisu')?.price).toBe(84)
  })

  it('validates selections and computes the subtotal on the server', () => {
    const parsed = cateringInquirySchema.parse(valid)
    expect(parsed.email).toBe('alex@example.com')
    const html = cateringInquiryEmailHtml(parsed, 'CAT-261020-ABC123')
    expect(html).toContain('Indicative menu subtotal: $176.00')
    expect(cateringInquirySchema.safeParse({ ...valid, selection: [{ id: 'unknown', quantity: 1 }] }).success).toBe(false)
    expect(cateringInquirySchema.safeParse({ ...valid, selection: [valid.selection[0], valid.selection[0]] }).success).toBe(false)
  })

  it('escapes customer-supplied details in the team email', () => {
    const parsed = cateringInquirySchema.parse({ ...valid, details: '<script>alert(1)</script> & happy people' })
    const html = cateringInquiryEmailHtml(parsed, 'CAT-261020-ABC123')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; happy people')
  })

  for (const language of ['en', 'zh'] as const) {
    it(`renders the menu, inquiry fields and navigation in ${language}`, () => {
      const html = renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: language, children: createElement(CateringContent) }))
      expect(html).toContain('/catering')
      expect(html).toContain('Sichuan Peppercorn Pulled Chicken')
      expect(html).toContain('Japanese Basque Cheesecake')
      expect(html).toContain('name="eventDate"')
      expect(html).toContain('name="address"')
      expect(html).toContain(language === 'en' ? 'Send catering inquiry' : '发送餐饮咨询')
    })
  }
})
