"use client"

import { useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { KapiooIcon } from './kapioo-icons'
import type { HomeCopy } from './content'

const VIMEO_ORIGIN = 'https://player.vimeo.com'

export function KitchenFilm({ videoId, copy }: { videoId: string; copy: HomeCopy }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const iframe = frame.current
    if (!iframe) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let ready = false
    let inView = false
    const send = (method: string, value?: string | number) => {
      iframe.contentWindow?.postMessage(JSON.stringify({ method, value }), VIMEO_ORIGIN)
    }
    const syncPlayback = () => {
      if (!ready) return
      send(inView && !document.hidden && !preference.matches ? 'play' : 'pause')
    }
    const markReady = () => {
      if (ready) return
      ready = true
      setLoaded(true)
      send('addEventListener', 'error')
      syncPlayback()
    }
    const message = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN || event.source !== iframe.contentWindow) return
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (payload?.event === 'ready' || payload?.method === 'ping') markReady()
        if (payload?.event === 'error' && ['PrivacyError', 'PasswordError'].includes(payload.data?.name)) setFailed(true)
      } catch { /* Ignore unrelated cross-window messages. */ }
    }
    // Ping handles a cached player whose ready event arrives before the listener.
    const ping = () => send('ping')
    const observer = new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .45
      if (visible === inView) return
      inView = visible
      syncPlayback()
    }, { threshold: [0, .45] })
    observer.observe(iframe)
    iframe.addEventListener('load', ping)
    window.addEventListener('message', message)
    document.addEventListener('visibilitychange', syncPlayback)
    preference.addEventListener('change', syncPlayback)
    ping()
    return () => {
      observer.disconnect()
      iframe.removeEventListener('load', ping)
      window.removeEventListener('message', message)
      document.removeEventListener('visibilitychange', syncPlayback)
      preference.removeEventListener('change', syncPlayback)
      send('pause')
    }
  }, [videoId, attempt])

  return <figure className="kh-film" aria-label={copy.filmLabel}>
    <div className="kh-film-frame">
      {!loaded && <div className="kh-film-loading" aria-hidden="true"><KapiooIcon name="cook" size={32} /></div>}
      <iframe key={attempt} ref={frame}
        src={`${VIMEO_ORIGIN}/video/${encodeURIComponent(videoId)}?api=1&autoplay=0&muted=1&loop=1&playsinline=1&title=0&byline=0&portrait=0&dnt=1&controls=1`}
        title={copy.filmLabel} loading="eager" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen
        onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      {failed && <div className="kh-film-fallback"><button className="kh-film-retry" onClick={() => { setFailed(false); setLoaded(false); setAttempt(value => value + 1) }}><RotateCw size={20} />{copy.filmRetry}</button></div>}
    </div>
  </figure>
}
