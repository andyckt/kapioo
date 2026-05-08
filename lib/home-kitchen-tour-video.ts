/**
 * Homepage Kapioo kitchen tour — Vimeo embed only.
 * Set `KITCHEN_TOUR_VIDEO_URL` or `NEXT_PUBLIC_KITCHEN_TOUR_VIDEO_URL` to a normal Vimeo watch URL.
 */

/** Used when env is unset or doesn't match a Vimeo URL. */
const DEFAULT_VIMEO_ID = "1190305785"

const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)(?:\?|\/|#|\s|$)/

/** Read on the server (see `app/page.tsx`). */
export function resolveKitchenTourVimeoIdFromEnv(): string {
  const raw =
    process.env.KITCHEN_TOUR_VIDEO_URL?.trim() ||
    process.env.NEXT_PUBLIC_KITCHEN_TOUR_VIDEO_URL?.trim() ||
    ""
  if (raw) {
    const m = raw.match(VIMEO_RE)
    if (m?.[1]) return m[1]
  }
  return DEFAULT_VIMEO_ID
}

export function vimeoEmbedSrc(videoId: string): string {
  /** Chromeless muted loop; Unmute via postMessage + mute button (`api=1`). */
  const q = new URLSearchParams({
    api: "1",
    background: "1",
    dnt: "1",
  })
  return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?${q.toString()}`
}

/** @see https://developer.vimeo.com/player/sdk/postmessage */
export function postVimeoMethod(iframe: HTMLIFrameElement, method: string, value?: unknown): void {
  const payload: Record<string, unknown> = { method }
  if (value !== undefined) {
    payload.value = value
  }
  iframe.contentWindow?.postMessage(JSON.stringify(payload), "*")
}
