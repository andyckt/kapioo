import {
  EMAIL_LOGO_PUBLIC_PATH,
  getEmailLogoAbsoluteUrl,
} from '@/lib/email/logo-url';

describe('lib/email/logo-url', () => {
  const originalBase = process.env.NEXT_PUBLIC_BASE_URL;
  const originalOverride = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL;

  afterEach(() => {
    if (originalBase === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
    else process.env.NEXT_PUBLIC_BASE_URL = originalBase;
    if (originalOverride === undefined) delete process.env.NEXT_PUBLIC_EMAIL_LOGO_URL;
    else process.env.NEXT_PUBLIC_EMAIL_LOGO_URL = originalOverride;
  });

  it('returns override URL when NEXT_PUBLIC_EMAIL_LOGO_URL is set', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NEXT_PUBLIC_EMAIL_LOGO_URL = 'https://cdn.example.com/k-logo.png';
    expect(getEmailLogoAbsoluteUrl()).toBe('https://cdn.example.com/k-logo.png');
  });

  it('builds absolute URL from NEXT_PUBLIC_BASE_URL and strips trailing slashes', () => {
    delete process.env.NEXT_PUBLIC_EMAIL_LOGO_URL;
    process.env.NEXT_PUBLIC_BASE_URL = 'https://kapioo.com/';
    expect(getEmailLogoAbsoluteUrl()).toBe(
      `https://kapioo.com${EMAIL_LOGO_PUBLIC_PATH}`
    );
  });

  it('defaults base to localhost when env is missing', () => {
    delete process.env.NEXT_PUBLIC_EMAIL_LOGO_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    expect(getEmailLogoAbsoluteUrl()).toBe(
      `http://localhost:3000${EMAIL_LOGO_PUBLIC_PATH}`
    );
  });
});
