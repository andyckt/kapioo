"use client"

import { useEffect, type RefObject } from 'react'

/** One passive listener / one animation frame. Measure parents, transform children. */
export function useHomeMotion(root: RefObject<HTMLElement | null>, language: string) {
  useEffect(() => {
    const element = root.current
    if (!element) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let cleanup = () => {}
    const setup = () => {
      cleanup()
      if (preference.matches) return
      const scenes = Array.from(element.querySelectorAll<HTMLElement>('[data-scene]'))
      const reveals = Array.from(element.querySelectorAll<HTMLElement>('[data-reveal]'))
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('kh-visible'); observer.unobserve(entry.target) }
      }), { rootMargin: '0px 0px -28px 0px', threshold: 0.06 })
      reveals.forEach(node => {
        if (node.getBoundingClientRect().top < window.innerHeight) node.classList.add('kh-visible')
        else observer.observe(node)
      })
      element.classList.add('kh-motion')
      let frame = 0
      const update = () => {
        frame = 0
        const height = window.innerHeight
        scenes.forEach(node => {
          const box = node.getBoundingClientRect()
          if (box.bottom < -height || box.top > height * 2) return
          const progress = Math.max(0, Math.min(1, (height - box.top) / (height + box.height)))
          node.style.setProperty('--kh-progress', progress.toFixed(4))
          const chapter = Math.max(0, Math.min(2, Math.floor((height * .5 - box.top) / Math.max(1, box.height - height * .5) * 3)))
          node.dataset.chapter = String(chapter)
        })
        const scrollable = document.documentElement.scrollHeight - height
        element.style.setProperty('--kh-page-progress', String(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0))
        element.classList.toggle('kh-past-hero', window.scrollY > height * .7)
      }
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule, { passive: true })
      update()
      cleanup = () => {
        observer.disconnect()
        cancelAnimationFrame(frame)
        window.removeEventListener('scroll', schedule)
        window.removeEventListener('resize', schedule)
        element.classList.remove('kh-motion')
        scenes.forEach(node => node.style.removeProperty('--kh-progress'))
      }
    }
    setup()
    preference.addEventListener('change', setup)
    return () => { cleanup(); preference.removeEventListener('change', setup) }
  // Translated list keys replace DOM nodes, so observe the new content too.
  }, [root, language])
}
