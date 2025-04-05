"use client"

import React, { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'

const SLIDES = [
  "https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/src/%E7%B5%84%E5%90%88+1.png",
  "https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/src/%E7%B5%84%E5%90%88+2.png",
  "https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/src/%E7%B5%84%E5%90%88+3.png"
]

export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    onSelect()
    emblaApi.on('select', onSelect)
    
    // Auto-scroll every 8 seconds
    const autoScroll = setInterval(() => {
      emblaApi.scrollNext()
    }, 8000)
    
    return () => {
      clearInterval(autoScroll)
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className="overflow-hidden rounded-xl">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {SLIDES.map((src, index) => (
            <div 
              key={index}
              className="relative flex-[0_0_100%] min-w-0 overflow-hidden"
              style={{ aspectRatio: "16/9" }}
            >
              <img 
                src={src}
                alt={`Slide ${index + 1}`}
                className="h-full w-full object-cover sm:object-contain"
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 flex justify-center gap-1.5 sm:gap-2 z-10">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => scrollTo(index)}
            className={`
              h-2 sm:h-2.5 transition-all rounded-full
              ${index === selectedIndex ? 'w-6 sm:w-8 bg-white' : 'w-2 sm:w-2.5 bg-white/50 hover:bg-white/70'}
            `}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
} 