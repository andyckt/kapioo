import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import {
  ADMIN_MFA_COOKIE_NAME,
  getAuthSessionCookieName,
} from '@/lib/auth/session';
import { AUTH_SECRET } from '@/lib/env';
import { isPublicApiReadRequest } from '@/lib/settings-access';
import { verifySignedAdminMfaCookie } from '@/lib/security/signed-cookie';

// This middleware increases the body size limit for API requests
// particularly useful for file uploads
// Also blocks common attack vectors and logs suspicious requests

// List of suspicious paths that indicate scanning/attack attempts
const SUSPICIOUS_PATHS = [
  '.env',
  '.git',
  '.aws',
  'phpinfo.php',
  'info.php',
  'test.php',
  'debug.log',
  'error.log',
  'laravel.log',
  'wp-content',
  'wp-admin',
  'wp-login',
  'phpmyadmin',
  'admin.php',
  'config.php',
  'database.yml',
  'settings.py',
  '_profiler',
  '.sql',
  '.bak',
  '.backup',
  'sitemap.xml.php'
];

const PRIVATE_NOINDEX_PATHS = [
  '/login',
  '/signup',
  '/dashboard',
  '/forgot-password',
  '/reset-password',
  '/reset-password-code',
  '/verify-email',
  '/verify-email-sent',
  '/address',
  '/weekly-meal',
  '/daily-delivery',
];

const AUTH_REQUIRED_PAGE_PATHS = [
  '/dashboard',
  '/address',
];

const ADMIN_PAGE_PATHS = ['/admin', '/maintain', '/editmusic'];
const ADMIN_MFA_PAGE = '/admin/mfa';

const ADMIN_API_PATHS = [
  '/api/admin',
  '/api/credits/request/admin',
  '/api/day-history',
  '/api/notifications',
  '/api/orders/stats',
  '/api/settings',
  '/api/users/count',
  '/api/users/export',
  '/api/users/with-order-counts',
  '/api/voucher-requests/export',
  '/api/credits/request/admin/export',
  '/api/weekly-delivery-history',
  '/api/weekly-meals/admin',
];

const LEGACY_AUTHJS_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

const AUTH_REQUIRED_API_PATHS = [
  '/api/orders',
  '/api/daily-delivery/order',
  '/api/transactions',
  '/api/voucher-requests',
  '/api/credits/request',
  '/api/promo-codes/apply',
  '/api/send-order-summary-email',
  '/api/weekly-subscription/user',
  '/api/upload',
  '/api/users/',
];

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildApiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function middleware(request: any) {
  const pathname = request.nextUrl.pathname.toLowerCase();

  // Check for suspicious paths
  const isSuspicious = SUSPICIOUS_PATHS.some(suspiciousPath =>
    pathname.includes(suspiciousPath)
  );

  if (isSuspicious) {
    // Log the attack attempt
    console.warn('🚨 SECURITY: Suspicious request blocked', {
      path: pathname,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Return 404 to not reveal that we detected the attack
    return new NextResponse(null, { status: 404 });
  }

  const secureCookie =
    request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
  const sessionCookieName = getAuthSessionCookieName(secureCookie);

  const token = await getToken({
    req: request,
    secret: AUTH_SECRET,
    secureCookie,
    cookieName: sessionCookieName,
    salt: sessionCookieName,
  });

  const tokenUserId = token?.sub ? String(token.sub) : null;
  const tokenRole = token?.role;
  const tokenSessionVersion = Number(token?.sessionVersion || 1);
  const adminMfaPayload = await verifySignedAdminMfaCookie(
    request.cookies.get(ADMIN_MFA_COOKIE_NAME)?.value
  );
  const hasValidAdminMfa =
    tokenRole === 'admin' &&
    adminMfaPayload &&
    adminMfaPayload.userId === tokenUserId &&
    Number(adminMfaPayload.sessionVersion) === tokenSessionVersion;

  const requiresAdminPage =
    matchesPath(pathname, ADMIN_PAGE_PATHS) && pathname !== ADMIN_MFA_PAGE;
  const requiresAdminApi =
    matchesPath(pathname, ADMIN_API_PATHS) && !isPublicApiReadRequest(request);
  const requiresAuthenticatedPage = matchesPath(pathname, AUTH_REQUIRED_PAGE_PATHS);
  const requiresAuthenticatedApi =
    matchesPath(pathname, AUTH_REQUIRED_API_PATHS) &&
    !requiresAdminApi &&
    !isPublicApiReadRequest(request);

  if (pathname === ADMIN_MFA_PAGE || pathname.startsWith(`${ADMIN_MFA_PAGE}/`)) {
    if (!tokenUserId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (tokenRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (requiresAdminPage) {
    if (!tokenUserId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (tokenRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (!hasValidAdminMfa) {
      return NextResponse.redirect(new URL('/admin/mfa', request.url));
    }
  }

  if (requiresAuthenticatedPage && !tokenUserId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (requiresAdminApi) {
    if (!tokenUserId) {
      return buildApiError('Unauthorized', 401);
    }

    if (tokenRole !== 'admin') {
      return buildApiError('Admin access required', 403);
    }

    if (!hasValidAdminMfa) {
      return buildApiError('Admin MFA verification required', 403);
    }
  }

  if (requiresAuthenticatedApi && !tokenUserId) {
    return buildApiError('Unauthorized', 401);
  }

  const response = NextResponse.next({
    request: {
      // Clone the request headers and set a higher limit for body size
      headers: new Headers(request.headers),
    },
  });

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const isBgmPage = pathname === '/bgm' || pathname.startsWith('/bgm/');
  const contentSecurityPolicy = isBgmPage
    ? "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; worker-src 'self' blob:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; child-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    : "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; worker-src 'self' blob:; child-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicy
  );
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Prevent indexing for private/account routes only.
  const shouldNoIndex = PRIVATE_NOINDEX_PATHS.some(
    (privatePath) => pathname === privatePath || pathname.startsWith(`${privatePath}/`)
  );
  if (shouldNoIndex) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }

  for (const legacyCookieName of LEGACY_AUTHJS_COOKIE_NAMES) {
    if (!request.cookies.get(legacyCookieName)?.value) {
      continue;
    }

    response.cookies.set(legacyCookieName, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: legacyCookieName.startsWith('__Secure-'),
      path: '/',
      maxAge: 0,
    });
  }

  return response;
}

// Apply this middleware to specific routes
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
