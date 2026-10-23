import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/catering/inquiries/route'

const mocks = vi.hoisted(() => ({ send: vi.fn(), rateLimit: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/support/security', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/support/security')>()),
  rateLimit: mocks.rateLimit,
}))
vi.mock('resend', () => ({ Resend: class { emails = { send: mocks.send } } }))

const origin = 'http://localhost:3000'
const valid = {
  intent: 'quote', service: 'sharing-trays', name: 'Alex Kim', email: 'alex@example.com',
  eventDate: '2026-11-20', guests: 24, eventType: 'Office lunch', address: '100 King St W, Toronto',
  selection: [{ id: 'peppercorn-chicken', quantity: 2 }],
}
function request(body: unknown, withOrigin = true) {
  return new Request(origin + '/api/catering/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(withOrigin ? { origin } : {}) },
    body: JSON.stringify(body),
  })
}

describe('catering inquiry email delivery', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key'
    mocks.send.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    mocks.rateLimit.mockReset().mockResolvedValue(undefined)
  })

  it('sends inquiry and price summary to info@kapioo.com', async () => {
    const response = await POST(request(valid))
    expect(response.status).toBe(200)
    expect((await response.json()).data.reference).toMatch(/^CAT-\d{6}-[0-9A-F]{6}$/)
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'info@kapioo.com', replyTo: valid.email,
      subject: expect.stringContaining('quote request'),
      html: expect.stringContaining('Indicative menu subtotal: $156.00'),
    }))
  })

  it('rejects invalid or cross-origin inquiries without emailing', async () => {
    expect((await POST(request({ ...valid, selection: [{ id: 'fake-dish', quantity: 2 }] }))).status).toBe(400)
    expect((await POST(request(valid, false))).status).toBe(403)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('only confirms receipt after the mail provider accepts the message', async () => {
    mocks.send.mockResolvedValueOnce({ data: null, error: { name: 'validation_error' } })
    const response = await POST(request(valid))
    expect(response.status).toBe(503)
    expect((await response.json()).success).toBe(false)
  })
})
