import { NextResponse } from 'next/server';

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
  'credentials',
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

export function middleware(request) {
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
  
  const response = NextResponse.next({
    request: {
      // Clone the request headers and set a higher limit for body size
      headers: new Headers(request.headers),
    },
  });

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent indexing for private/account routes only.
  const shouldNoIndex = PRIVATE_NOINDEX_PATHS.some(
    (privatePath) => pathname === privatePath || pathname.startsWith(`${privatePath}/`)
  );
  if (shouldNoIndex) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  
  return response;
}

// Apply this middleware to specific routes
export const config = {
  matcher: [
    '/api/upload',
    // Apply to non-API pages while excluding static assets.
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}; 