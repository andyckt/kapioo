const DEFAULT_PRODUCTION_BASE_URL = "https://kapioo.com";

export function resolvePublicEmailBaseUrl(): string {
  const candidate =
    process.env.EMAIL_SEND_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    DEFAULT_PRODUCTION_BASE_URL;

  return candidate.replace(/\/+$/, "");
}

export function assertPublicEmailBaseUrl(baseUrl: string) {
  if (/localhost|127\.0\.0\.1/i.test(baseUrl)) {
    throw new Error(
      `Refusing to send email with local base URL (${baseUrl}). Set NEXT_PUBLIC_BASE_URL or EMAIL_SEND_BASE_URL to your production site.`
    );
  }

  if (!/^https:\/\//i.test(baseUrl)) {
    throw new Error(`Email base URL must use HTTPS: ${baseUrl}`);
  }
}
