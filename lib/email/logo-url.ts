/**
 * Public path for the Kapioo mark used in transactional HTML emails.
 * File must exist under `public/` so it is served with the app deployment.
 */
export const EMAIL_LOGO_PUBLIC_PATH = '/kapioo-logo.png';

/**
 * Absolute URL for the email header logo. Prefer HTTPS and the same host as
 * `NEXT_PUBLIC_BASE_URL` so the asset always matches what was deployed.
 *
 * Optional `NEXT_PUBLIC_EMAIL_LOGO_URL` overrides (e.g. CDN); must be absolute.
 */
export function getEmailLogoAbsoluteUrl(): string {
  const override = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim();
  if (override) return override;

  const raw = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const base = raw.replace(/\/+$/, '');
  return `${base}${EMAIL_LOGO_PUBLIC_PATH}`;
}
