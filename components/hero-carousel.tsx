"use client"

import React from 'react'
import Image from 'next/image'

// Using the single image from local path
const IMAGE_PATH = "/images/_MG_E2616.jpg"

export function HeroCarousel() {
  return (
    <div className="h-full w-full overflow-hidden rounded-xl">
      <div className="h-full w-full">
        <Image 
          src={IMAGE_PATH}
          alt="Hero Image"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </div>
  )
} 