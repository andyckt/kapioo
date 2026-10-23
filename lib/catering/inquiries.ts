import { z } from 'zod'
import { cateringCurrency, cateringMenuById } from './menu'

export const cateringInquirySchema = z.object({
  intent: z.enum(['quote', 'order']),
  service: z.enum(['sharing-trays', 'corporate-bentos']),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().max(60).optional().default(''),
  organization: z.string().trim().max(120).optional().default(''),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  servingTime: z.string().trim().max(80).optional().default(''),
  guests: z.coerce.number().int().min(1).max(10000),
  eventType: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(300),
  details: z.string().trim().max(5000).optional().default(''),
  selection: z.array(z.object({ id: z.string(), quantity: z.number().int().min(1).max(100) })).max(30).default([]),
}).superRefine((value, context) => {
  const ids = new Set<string>()
  for (const [index, line] of value.selection.entries()) {
    if (!cateringMenuById.has(line.id) || ids.has(line.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['selection', index], message: 'Invalid menu selection' })
    ids.add(line.id)
  }
})

export type CateringInquiry = z.infer<typeof cateringInquirySchema>

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)

export function cateringInquiryEmailHtml(inquiry: CateringInquiry, reference: string) {
  const field = (label: string, value: string) => `<tr><th align="left" style="padding:8px 18px 8px 0;color:#786652;font-weight:500;vertical-align:top">${label}</th><td style="padding:8px 0;color:#4a3a2b">${escapeHtml(value)}</td></tr>`
  const subtotal = inquiry.selection.reduce((sum, line) => sum + (cateringMenuById.get(line.id)?.price || 0) * line.quantity, 0)
  const lines = inquiry.selection.map(line => {
    const item = cateringMenuById.get(line.id)!
    return `<li>${escapeHtml(item.name)} — ${line.quantity} × ${cateringCurrency(item.price)} = ${cateringCurrency(line.quantity * item.price)}</li>`
  }).join('')
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#4a3a2b;line-height:1.55">
    <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9b7952">Kapioo catering inquiry</p>
    <h1 style="font-size:28px;font-weight:500">${escapeHtml(reference)}</h1>
    <table style="border-collapse:collapse;width:100%;border-top:1px solid #e6d8c9;border-bottom:1px solid #e6d8c9">
      ${field('Intent', inquiry.intent === 'order' ? 'Start an order' : 'Request a quote')}
      ${field('Service', inquiry.service === 'sharing-trays' ? 'Sharing trays' : 'Corporate bentos')}
      ${field('Name', inquiry.name)}${field('Email', inquiry.email)}${inquiry.phone ? field('Phone', inquiry.phone) : ''}
      ${inquiry.organization ? field('Company / event', inquiry.organization) : ''}
      ${field('Date', inquiry.eventDate)}${inquiry.servingTime ? field('Serving time', inquiry.servingTime) : ''}
      ${field('Guests', String(inquiry.guests))}${field('Event type', inquiry.eventType)}${field('Delivery address', inquiry.address)}
    </table>
    <h2 style="font-size:17px;font-weight:500;margin:24px 0 8px">Menu shortlist</h2>
    ${lines ? `<ul style="padding-left:20px">${lines}</ul><p><strong>Indicative menu subtotal: ${cateringCurrency(subtotal)}</strong></p>` : '<p>No items selected yet.</p>'}
    <p style="font-size:13px;color:#786652">Subtotal excludes HST, delivery and any refundable dessert-container deposits. Final availability and quote must be confirmed by the team.</p>
    <h2 style="font-size:17px;font-weight:500;margin:24px 0 8px">Event details</h2>
    <div style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f8f2e9;border-radius:16px;padding:20px">${escapeHtml(inquiry.details || 'No additional details provided.')}</div>
    <p style="font-size:13px;color:#786652;margin-top:24px">Reply to this email to respond to the customer within 24–48 hours on business days.</p>
  </div>`
}
