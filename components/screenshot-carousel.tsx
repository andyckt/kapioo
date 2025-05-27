"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Define the image paths for the reviews
const REVIEW_IMAGES = [
  '/reviews/1.png',
  '/reviews/2.png',
  '/reviews/3.png',
  '/reviews/4.png',
  '/reviews/5.png',
  '/reviews/6.png',
  '/reviews/7.png',
  '/reviews/8.png',
  '/reviews/9.png',
]

export function ScreenshotCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Get previous image index with wraparound
  const getPrevIndex = (index: number) => {
    return index === 0 ? REVIEW_IMAGES.length - 1 : index - 1
  }
  
  // Get next image index with wraparound
  const getNextIndex = (index: number) => {
    return index === REVIEW_IMAGES.length - 1 ? 0 : index + 1
  }
  
  // Handle navigation between images
  const handleNavigation = (direction: 'prev' | 'next') => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    
    if (direction === 'prev') {
      setCurrentIndex(getPrevIndex(currentIndex))
    } else {
      setCurrentIndex(getNextIndex(currentIndex))
    }
    
    // Reset transitioning state after animation completes
    setTimeout(() => {
      setIsTransitioning(false)
    }, 500)
  }
  
  // Auto advance the carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleNavigation('next')
    }, 5000)
    
    return () => clearInterval(interval)
  }, [currentIndex, isTransitioning])
  
  return (
    <div className="relative w-full h-full">
      {/* Main image container with stacked design */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Behind image (Previous) */}
        <motion.div 
          className="absolute z-10 rounded-xl overflow-hidden shadow-lg max-w-[70%] max-h-[80%] opacity-60"
          initial={{ x: '-28%', rotateY: '-15deg', scale: 0.85 }}
          animate={{ x: '-28%', rotateY: '-15deg', scale: 0.85 }}
          style={{ 
            transformStyle: 'preserve-3d',
            transformOrigin: 'center right'
          }}
        >
          <Image 
            src={REVIEW_IMAGES[getPrevIndex(currentIndex)]}
            alt="Customer review"
            width={400}
            height={600}
            className="object-contain w-auto h-auto"
            priority
          />
        </motion.div>
        
        {/* Center image (Current) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="z-20 rounded-xl overflow-hidden shadow-2xl max-w-[80%] max-h-[90%]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Image 
              src={REVIEW_IMAGES[currentIndex]}
              alt="Customer review"
              width={450}
              height={700}
              className="object-contain w-auto h-auto"
              priority
            />
          </motion.div>
        </AnimatePresence>
        
        {/* Forward image (Next) */}
        <motion.div 
          className="absolute z-10 rounded-xl overflow-hidden shadow-lg max-w-[70%] max-h-[80%] opacity-60"
          initial={{ x: '28%', rotateY: '15deg', scale: 0.85 }}
          animate={{ x: '28%', rotateY: '15deg', scale: 0.85 }}
          style={{ 
            transformStyle: 'preserve-3d',
            transformOrigin: 'center left'
          }}
        >
          <Image 
            src={REVIEW_IMAGES[getNextIndex(currentIndex)]}
            alt="Customer review"
            width={400}
            height={600}
            className="object-contain w-auto h-auto"
            priority
          />
        </motion.div>
      </div>
      
      {/* Navigation buttons */}
      <Button
        onClick={() => handleNavigation('prev')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white text-[#C2884E] rounded-full p-2 shadow-md"
        size="icon"
        variant="ghost"
        disabled={isTransitioning}
      >
        <ChevronLeft className="h-6 w-6" />
        <span className="sr-only">Previous</span>
      </Button>
      
      <Button
        onClick={() => handleNavigation('next')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white text-[#C2884E] rounded-full p-2 shadow-md"
        size="icon"
        variant="ghost"
        disabled={isTransitioning}
      >
        <ChevronRight className="h-6 w-6" />
        <span className="sr-only">Next</span>
      </Button>
      
      {/* Pagination indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
        {REVIEW_IMAGES.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentIndex === index ? 'bg-[#C2884E] w-4' : 'bg-[#C2884E]/30'
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
} 