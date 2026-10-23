import { z } from 'zod'

export const ticketTopics = ['Order or delivery', 'Meal plans and vouchers', 'Food or ingredients', 'Account or payment', 'Something else'] as const

export const ticketSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  topic: z.enum(ticketTopics),
  orderReference: z.string().trim().max(100).optional().default(''),
  message: z.string().trim().min(10).max(5000),
})

export type TicketInput = z.infer<typeof ticketSchema>

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character] || character)

export function ticketEmailHtml(ticket: TicketInput, reference: string) {
  const field = (label: string, value: string) => `<tr><th align="left" style="padding:9px 16px 9px 0;color:#786652;font-weight:500;vertical-align:top">${label}</th><td style="padding:9px 0;color:#4a3a2b">${escapeHtml(value)}</td></tr>`
  return `<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#4a3a2b;line-height:1.55">
    <p style="font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#9b7952">Kapioo support ticket</p>
    <h1 style="font-size:28px;font-weight:500;margin:12px 0 22px">${escapeHtml(reference)}</h1>
    <table style="border-collapse:collapse;width:100%;border-top:1px solid #e6d8c9;border-bottom:1px solid #e6d8c9">
      ${field('Name', ticket.name)}${field('Email', ticket.email)}${field('Topic', ticket.topic)}${ticket.orderReference ? field('Order', ticket.orderReference) : ''}
    </table>
    <h2 style="font-size:16px;font-weight:500;margin:25px 0 10px">Customer message</h2>
    <div style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f8f2e9;border-radius:16px;padding:20px">${escapeHtml(ticket.message)}</div>
    <p style="font-size:13px;color:#786652;margin-top:24px">Reply to this email to respond to the customer. Target response: 2–3 business days.</p>
  </div>`
}
