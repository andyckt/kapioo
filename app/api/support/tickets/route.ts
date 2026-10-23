import { randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import { errorJson, successJson } from '@/lib/api'
import connectToDatabase from '@/lib/db'
import { assertSameOrigin, boundedJson, rateLimit } from '@/lib/support/security'
import { ticketEmailHtml, ticketSchema } from '@/lib/support/tickets'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const parsed = ticketSchema.safeParse(await boundedJson(request, 12000))
    if (!parsed.success) return errorJson('Please check the form and try again.', 400)

    await connectToDatabase()
    await rateLimit(request, 'support-ticket', 5, 3600)

    const key = process.env.RESEND_API_KEY
    if (!key) {
      console.error('Support ticket email is unavailable: RESEND_API_KEY is missing')
      return errorJson('We could not send your request right now. Please try again later.', 503)
    }

    const reference = `KAP-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from: 'Kapioo Support <contact@kapioo.com>',
      to: 'info@kapioo.com',
      replyTo: parsed.data.email,
      subject: `[${reference}] ${parsed.data.topic}`,
      html: ticketEmailHtml(parsed.data, reference),
    })
    if (error || !data?.id) {
      console.error('Support ticket email delivery failed', { name: error?.name || 'missing_message_id' })
      return errorJson('We could not send your request right now. Please try again later.', 503)
    }

    return successJson({ reference })
  } catch (error) {
    if (error instanceof Error && 'status' in error && typeof error.status === 'number' && error.status < 500) {
      return errorJson(error.message, error.status)
    }
    console.error('Support ticket submission failed', error)
    return errorJson('We could not send your request right now. Please try again later.', 503)
  }
}
