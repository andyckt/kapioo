/**
 * Homepage kitchen tour media: direct HTTPS MP4, YouTube, or Vimeo (`NEXT_PUBLIC_KITCHEN_TOUR_VIDEO_URL`).
 * No MP4 is kept in the repo; optional local file at {@link FALLBACK_MP4_PATH} is gitignored.
 */

export type KitchenTourResolved =
  | { kind: "mp4"; src: string }
  | { kind: "youtube"; videoId: string }
  | { kind: "vimeo"; videoId: string }

const FALLBACK_MP4_PATH = "/home-kitchen/kapioo-kitchen-tour.mp4"

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:embed\/|watch(?:\?|.*&)v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?\s#/]|$)/

const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)(?:\?|\/|#|\s|$)/

export function resolveKitchenTourVideo(raw: string | undefined): KitchenTourResolved {
  const t = raw?.trim()
  if (!t) {
    return { kind: "mp4", src: FALLBACK_MP4_PATH }
  }

  const yt = t.match(YOUTUBE_RE)
  if (yt?.[1]) {
    return { kind: "youtube", videoId: yt[1] }
  }

  const vm = t.match(VIMEO_RE)
  if (vm?.[1]) {
    return { kind: "vimeo", videoId: vm[1] }
  }

  return { kind: "mp4", src: t }
}

export function youtubeEmbedSrc(videoId: string): string {
  const q = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    controls: "1",
    loop: "1",
    playlist: videoId,
    enablejsapi: "1",
  })
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${q.toString()}`
}

export function vimeoEmbedSrc(videoId: string): string {
  /** Chromeless muted loop; no Vimeo “Unmute” overlay. Unmute via postMessage + our button (`api=1`). */
  const q = new URLSearchParams({
    api: "1",
    background: "1",
    dnt: "1",
  })
  return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?${q.toString()}`
}

/** @see https://developers.google.com/youtube/iframe_api_reference */
export function postYouTubeCommand(iframe: HTMLIFrameElement, func: string, args: unknown[] = []): void {
  iframe.contentWindow?.postMessage(
    JSON.stringify({
      event: "command",
      func,
      args: args.length ? args : "",
    }),
    "*"
  )
}

/** @see https://developer.vimeo.com/player/sdk/postmessage */
export function postVimeoMethod(iframe: HTMLIFrameElement, method: string, value?: unknown): void {
  const payload: Record<string, unknown> = { method }
  if (value !== undefined) {
    payload.value = value
  }
  iframe.contentWindow?.postMessage(JSON.stringify(payload), "*")
}
