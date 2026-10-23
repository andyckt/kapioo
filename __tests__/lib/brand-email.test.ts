import { describe, expect, it } from 'vitest';
import { brandEmailButton, brandEmailCode, brandEmailFrame, escapeEmailHtml } from '@/lib/email/brand-email';

describe('Kapioo email design', () => {
  it('keeps account messages readable without loading remote styles or fonts', () => {
    const html = brandEmailFrame({
      title: 'Welcome back',
      body: `<p>Your meal is ready.</p>${brandEmailButton('Open account', 'https://www.kapioo.com/dashboard')}`,
    });

    expect(html).toContain('kapioo<span');
    expect(html).toContain('Your meal is ready.');
    expect(html).toContain('https://www.kapioo.com/dashboard');
    expect(html).toContain('background:#f8f3eb');
    expect(html).not.toContain('linear-gradient');
    expect(html).not.toContain('fonts.googleapis.com');
  });

  it('escapes customer input, codes, and link attributes', () => {
    const unsafe = `Mina <script>alert('x')</script>`;
    const html = brandEmailFrame({ title: unsafe, body: brandEmailCode('<123>') + brandEmailButton('Open', 'https://kapioo.com/?x="oops"') });

    expect(escapeEmailHtml(unsafe)).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;123&gt;');
    expect(html).toContain('&quot;oops&quot;');
  });
});
