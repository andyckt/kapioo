"use client"

import React, { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'

// Using the single image from local path
const IMAGE_PATH = "/images/_MG_E2616.jpg"

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
    
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className="overflow-hidden rounded-xl">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {/* Using a single image instead of multiple slides */}
          <div 
            className="relative flex-[0_0_100%] min-w-0 overflow-hidden"
            style={{ aspectRatio: "16/9" }}
          >
            <Image 
              src={IMAGE_PATH}
              alt="Hero Image"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 90vw"
            />
          </div>
        </div>
      </div>
    </div>
  )
} 