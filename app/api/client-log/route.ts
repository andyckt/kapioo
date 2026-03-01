import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    console.error("[client-log]", {
      source: payload?.source,
      errorName: payload?.errorName,
      errorMessage: payload?.errorMessage,
      path: payload?.path,
      href: payload?.href,
      userAgent: payload?.userAgent,
      componentStack: payload?.componentStack,
      timestamp: payload?.timestamp ?? Date.now(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[client-log] failed to parse payload", error)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
