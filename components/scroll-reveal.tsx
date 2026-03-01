"use client"

import { useRef, useEffect, useState, type ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  /** Root margin for IntersectionObserver, e.g. "0px 0px -50px 0px" */
  rootMargin?: string
  /** Minimum fraction of element visible (0-1) */
  threshold?: number
}

/**
 * Lightweight scroll reveal using a single IntersectionObserver + CSS transitions.
 * Replaces Framer Motion whileInView for better scroll performance.
 * Child elements with class "reveal-item" will animate in when section enters view.
 */
export function ScrollReveal({
  children,
  className = "",
  rootMargin = "0px 0px -60px 0px",
  threshold = 0.05,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return (
    <div
      ref={ref}
      className={`reveal-section ${inView ? "in-view" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
