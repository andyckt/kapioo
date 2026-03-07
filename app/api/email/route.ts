import { NextResponse } from 'next/server';

// Deprecated to avoid exposing a generic email-sending HTTP surface.
// All application email should be sent from server-side code paths only.
export async function POST(request: Request) {
  void request;

  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated email route. Send email from server-side helpers only.',
    },
    { status: 410 }
  );
}