/** A small, table-based shell that works in common email clients. */
export function escapeEmailHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function brandEmailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0"><tr><td bgcolor="#4a3a2b" style="border-radius:999px;background:#4a3a2b"><a href="${escapeEmailHtml(href)}" style="display:inline-block;padding:15px 28px;color:#fffaf4;font:600 15px/1.2 Arial,Helvetica,sans-serif;text-decoration:none">${escapeEmailHtml(label)}</a></td></tr></table>`;
}

export function brandEmailCode(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:30px 0"><tr><td style="padding:22px 18px;border:1px solid #ddcfc0;border-radius:16px;background:#f7f0e7;color:#4a3a2b;text-align:center;font:700 32px/1.2 Arial,Helvetica,sans-serif;letter-spacing:8px">${escapeEmailHtml(code)}</td></tr></table>`;
}

export function brandEmailFrame(input: {
  eyebrow?: string;
  title: string;
  body: string;
  language?: 'en' | 'zh';
}): string {
  const language = input.language === 'zh' ? 'zh' : 'en';
  const footer = language === 'zh'
    ? '这是 Kapioo 的账户或订单邮件。如需帮助，请访问网站支持页面。'
    : 'This email is about your Kapioo account or order. Need help? Visit our support page.';
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f8f3eb;color:#4a3a2b"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f3eb"><tr><td align="center" style="padding:32px 16px 48px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px"><tr><td style="padding:8px 4px 25px;font:700 29px/1 Arial,Helvetica,sans-serif;letter-spacing:-2px;color:#4a3a2b">kapioo<span style="color:#a35e27">.</span></td></tr><tr><td style="padding:38px 36px 42px;border:1px solid #e7dbcd;border-radius:22px;background:#fffcf8"><p style="margin:0 0 17px;color:#9e7555;font:700 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:2px;text-transform:uppercase">${escapeEmailHtml(input.eyebrow || 'A NOTE FROM KAPIOO')}</p><h1 style="margin:0 0 26px;color:#4a3a2b;font:400 34px/1.14 Georgia,Times,serif;letter-spacing:-1px">${escapeEmailHtml(input.title)}</h1><div style="color:#5e5044;font:400 16px/1.7 Arial,Helvetica,sans-serif">${input.body}</div></td></tr><tr><td style="padding:24px 5px 0;color:#827366;font:400 12px/1.6 Arial,Helvetica,sans-serif">${escapeEmailHtml(footer)}<br>© ${new Date().getFullYear()} Kapioo · Toronto &amp; the GTA</td></tr></table></td></tr></table></body></html>`;
}
