import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/lib/language-context'
import { SupportContent } from '@/app/support/support-content'
import { ticketEmailHtml, ticketSchema } from '@/lib/support/tickets'

describe('Kapioo support tickets', () => {
  const valid = {
    name: 'Alex Kim',
    email: 'Alex@example.com',
    topic: 'Order or delivery',
    orderReference: 'D-123',
    message: 'Please help with the delivery window.',
  }

  it('validates and normalizes a customer ticket', () => {
    const parsed = ticketSchema.parse(valid)
    expect(parsed.email).toBe('alex@example.com')
    expect(ticketSchema.safeParse({ ...valid, message: 'short' }).success).toBe(false)
    expect(ticketSchema.safeParse({ ...valid, topic: 'arbitrary' }).success).toBe(false)
  })

  it('escapes customer content in the team email', () => {
    const html = ticketEmailHtml(ticketSchema.parse({
      ...valid,
      name: '<script>alert("x")</script>',
      message: 'I need help with <b>delivery</b> & payment.',
    }), 'KAP-261017-ABC123')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>delivery</b>')
    expect(html).toContain('&lt;b&gt;delivery&lt;/b&gt; &amp; payment.')
    expect(html).toContain('KAP-261017-ABC123')
  })

  for (const language of ['en', 'zh'] as const) {
    it('renders the ticket form and reply time in ' + language, () => {
      // eslint-disable-next-line react/no-children-prop -- Provider typing requires children.
      const html = renderToStaticMarkup(createElement(LanguageProvider, {
        initialLanguage: language,
        children: createElement(SupportContent),
      }))
      expect(html).toContain('name="email"')
      expect(html).toContain('name="topic"')
      expect(html).toContain('name="message"')
      expect(html).toContain('info@kapioo.com')
      expect(html).toContain(language === 'en' ? '2–3 business days' : '2–3 个工作日')
      expect(html).not.toContain('Chat &amp; help')
    })
  }
})
