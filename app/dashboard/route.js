// This file ensures the dashboard route is always dynamically rendered
// and not statically generated or server-side rendered

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

// This is a dummy route handler that won't actually be used
// It's just here to enforce the dynamic rendering of the dashboard
export async function GET() {
  return new Response(null, {
    status: 307,
    headers: {
      'Location': '/dashboard',
    },
  })
}
