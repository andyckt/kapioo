// This configuration ensures the dashboard page is rendered only on the client side
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Use the Edge Runtime that doesn't support server components with client dependencies
