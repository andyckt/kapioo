"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1, rootMargin: "-20px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : undefined;

  return (
    <div
      ref={ref}
      className={`${isVisible ? "animate-fade-in-up" : "opacity-0"} ${className}`}
      style={delayStyle}
    >
      {children}
    </div>
  );
}
