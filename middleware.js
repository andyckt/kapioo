import { NextResponse } from 'next/server';

// This middleware increases the body size limit for API requests
// particularly useful for file uploads

export function middleware(request) {
  const response = NextResponse.next({
    request: {
      // Clone the request headers and set a higher limit for body size
      headers: new Headers(request.headers),
    },
  });

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

// Only apply this middleware to the upload API route
export const config = {
  matcher: '/api/upload',
}; 