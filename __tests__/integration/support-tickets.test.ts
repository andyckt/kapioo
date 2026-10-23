import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/support/tickets/route'

const mocks = vi.hoisted(() => ({ send: vi.fn(), rateLimit: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/support/security', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/support/security')>()),
  rateLimit: mocks.rateLimit,
}))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send }
  },
}))

const origin = 'http://localhost:3000'
const valid = {
  name: 'Alex Kim',
  email: 'alex@example.com',
  topic: 'Order or delivery',
  orderReference: 'D-123',
  message: 'Please help with my delivery date.',
}
function request(body: unknown, withOrigin = true) {
  return new Request(origin + '/api/support/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(withOrigin ? { origin } : {}) },
    body: JSON.stringify(body),
  })
}

describe('support ticket email delivery', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key'
    mocks.send.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    mocks.rateLimit.mockReset().mockResolvedValue(undefined)
  })

  it('sends the ticket to the support inbox with customer reply-to', async () => {
    const response = await POST(request(valid))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.data.reference).toMatch(/^KAP-\d{6}-[0-9A-F]{6}$/)
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'info@kapioo.com',
      replyTo: valid.email,
      subject: expect.stringContaining(valid.topic),
      html: expect.stringContaining(valid.message),
    }))
  })

  it('rejects invalid and cross-origin requests without sending mail', async () => {
    expect((await POST(request({ ...valid, email: 'invalid' }))).status).toBe(400)
    expect((await POST(request(valid, false))).status).toBe(403)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('does not claim receipt when email delivery fails', async () => {
    mocks.send.mockResolvedValueOnce({ data: null, error: { name: 'validation_error' } })
    const response = await POST(request(valid))
    expect(response.status).toBe(503)
    expect((await response.json()).success).toBe(false)
  })

  it('does not claim receipt when the email service is not configured', async () => {
    delete process.env.RESEND_API_KEY
    const response = await POST(request(valid))
    expect(response.status).toBe(503)
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
