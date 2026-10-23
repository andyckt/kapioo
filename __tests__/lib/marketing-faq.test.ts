import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/lib/language-context'
import { FaqContent } from '@/app/faq/faq-content'

describe('Kapioo FAQ customer journey', () => {
  for (const language of ['en', 'zh'] as const) {
    it(`renders voucher, delivery, and ordering answers in the ${language} HTML`, () => {
      // eslint-disable-next-line react/no-children-prop -- The provider requires children in its React 19 props type.
      const html = renderToStaticMarkup(createElement(LanguageProvider, {
        initialLanguage: language,
        children: createElement(FaqContent),
      }))

      expect(html.match(/<h1[ >]/g)).toHaveLength(1)
      expect(html).toContain('aria-current="page"')
      expect(html).toContain('href="/how-it-works"')
      expect(html).toContain('href="/starter"')
      expect(html).toContain('<details')
      expect(html).toContain(language === 'zh' ? '餐券如何使用' : 'How do meal vouchers work?')
      expect(html).toContain(language === 'zh' ? '不会自动生成餐食订单' : 'Meal orders are not automatic.')
      expect(html).toContain(language === 'zh' ? '请输入详细地址确认可用计划' : 'Enter your exact address to see your options.')
      expect(html).not.toContain('href="/daily-delivery"')
      expect(html).not.toContain('href="/weekly-meal"')
    })
  }
})
