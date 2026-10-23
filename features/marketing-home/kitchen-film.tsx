"use client"

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCw, Volume2, VolumeX } from 'lucide-react'
import { KapiooIcon } from './kapioo-icons'
import type { HomeCopy } from './content'

const VIMEO_ORIGIN = 'https://player.vimeo.com'

export function KitchenFilm({ videoId, copy }: { videoId: string; copy: HomeCopy }) {
  const host = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [active, setActive] = useState(false)
  const [autoplayAllowed, setAutoplayAllowed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const pausedByUser = useRef(false)

  const send = (method: string, value?: string | number | boolean) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ method, value }), VIMEO_ORIGIN)
  }

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= .25) {
        setAutoplayAllowed(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        setActive(true)
      } else if (!entry.isIntersecting) {
        setActive(false)
      }
    }, { threshold: [0, .25] })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (active) return
    pausedByUser.current = false
    setLoaded(false)
    setPlaying(false)
    setMuted(true)
  }, [active])

  useEffect(() => {
    const iframe = frame.current
    if (!iframe || !active) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let ready = false
    let inView = false
    const syncPlayback = () => {
      if (!ready) return
      send(inView && !document.hidden && !preference.matches && !pausedByUser.current ? 'play' : 'pause')
    }
    const markReady = () => {
      if (ready) return
      ready = true
      setLoaded(true)
      send('addEventListener', 'error')
      send('addEventListener', 'play')
      send('addEventListener', 'pause')
      send('addEventListener', 'volumechange')
      syncPlayback()
    }
    const message = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN || event.source !== iframe.contentWindow) return
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (payload?.event === 'ready' || payload?.method === 'ping') markReady()
        if (payload?.event === 'error' && ['PrivacyError', 'PasswordError'].includes(payload.data?.name)) setFailed(true)
        if (payload?.event === 'play') setPlaying(true)
        if (payload?.event === 'pause') setPlaying(false)
        if (payload?.event === 'volumechange' && typeof payload.data?.muted === 'boolean') setMuted(payload.data.muted)
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
  }, [videoId, attempt, active])

  const togglePlayback = () => {
    pausedByUser.current = playing
    send(playing ? 'pause' : 'play')
    setPlaying(!playing)
  }

  const toggleSound = () => {
    send('setMuted', !muted)
    setMuted(!muted)
  }

  const videoSrc = `${VIMEO_ORIGIN}/video/${encodeURIComponent(videoId)}?api=1&autoplay=${autoplayAllowed ? 1 : 0}&muted=1&loop=1&playsinline=1&title=0&byline=0&portrait=0&badge=0&vimeo_logo=0&controls=0&dnt=1`

  return <figure className="kh-film" aria-label={copy.filmLabel}>
    <div ref={host} className="kh-film-frame">
      {!loaded && <div className="kh-film-loading" aria-hidden="true"><KapiooIcon name="cook" size={32} /></div>}
      <iframe key={attempt} ref={frame}
        src={active ? videoSrc : 'about:blank'} data-src={videoSrc}
        title={copy.filmLabel} loading="eager" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen
        onLoad={() => { if (active) setLoaded(true) }} onError={() => setFailed(true)} />
      {loaded && !failed && <div className="kh-film-controls" aria-label={copy.filmLabel}>
        <button type="button" onClick={togglePlayback} aria-label={playing ? copy.filmPause : copy.filmPlay} title={playing ? copy.filmPause : copy.filmPlay}>
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
        </button>
        <span className="kh-film-controls-title">{copy.filmShortLabel}</span>
        <button type="button" onClick={toggleSound} aria-label={muted ? copy.filmUnmute : copy.filmMute} title={muted ? copy.filmUnmute : copy.filmMute}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>}
      {failed && <div className="kh-film-fallback"><button className="kh-film-retry" onClick={() => { setFailed(false); setLoaded(false); setAttempt(value => value + 1) }}><RotateCw size={20} />{copy.filmRetry}</button></div>}
    </div>
  </figure>
}
