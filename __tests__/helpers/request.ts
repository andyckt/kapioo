import { NextRequest } from "next/server"

type BuildRequestOptions = {
  cookies?: Record<string, string>
  method?: string
}

export function buildJsonRequest(
  url: string,
  body: unknown,
  options: BuildRequestOptions = {}
) {
  const headers = new Headers({
    "content-type": "application/json",
  })

  if (options.cookies) {
    headers.set(
      "cookie",
      Object.entries(options.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ")
    )
  }

  return new NextRequest(url, {
    method: options.method ?? "POST",
    headers,
    body: JSON.stringify(body),
  })
}

export function buildRequest(url: string, options: BuildRequestOptions = {}) {
  const headers = new Headers()

  if (options.cookies) {
    headers.set(
      "cookie",
      Object.entries(options.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ")
    )
  }

  return new NextRequest(url, {
    method: options.method ?? "GET",
    headers,
  })
}
