"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"

export default function CustomerReviewsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { t } = useLanguage();

  // Array of review images - using only images 4-14
  const reviewImages = Array.from({ length: 11 }, (_, i) => ({
    id: i + 4, // Start from image 4
    src: `/reviews/${i + 4}.png`,
    alt: `Customer review screenshot ${i + 4}`,
  }))

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % reviewImages.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + reviewImages.length) % reviewImages.length)
  }

  const getImageStyle = (index: number) => {
    const diff = index - currentIndex
    const totalImages = reviewImages.length

    // Normalize the difference to handle wrapping
    const normalizedDiff = ((diff % totalImages) + totalImages) % totalImages

    if (normalizedDiff === 0) {
      // Current image - front and center
      return {
        transform: "translateX(0) translateY(0) scale(1) rotateY(0deg)",
        zIndex: 30,
        opacity: 1,
      }
    } else if (normalizedDiff === 1 || normalizedDiff === totalImages - 1) {
      // Adjacent images - slightly visible
      const isNext = normalizedDiff === 1
      return {
        transform: `translateX(${isNext ? "55px" : "-55px"}) translateY(10px) scale(0.92) rotateY(${isNext ? "-10deg" : "10deg"})`,
        zIndex: 20,
        opacity: 0.8,
      }
    } else if (normalizedDiff === 2 || normalizedDiff === totalImages - 2) {
      // Second layer - barely visible
      const isNext = normalizedDiff === 2
      return {
        transform: `translateX(${isNext ? "75px" : "-75px"}) translateY(20px) scale(0.85) rotateY(${isNext ? "-15deg" : "15deg"})`,
        zIndex: 10,
        opacity: 0.5,
      }
    } else {
      // Hidden images
      return {
        transform: "translateX(0) translateY(30px) scale(0.8)",
        zIndex: 0,
        opacity: 0,
      }
    }
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-white to-[#FBF7F2] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-[10%] w-[500px] h-[500px] bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-20 left-[5%] w-[400px] h-[400px] bg-gradient-to-tr from-[#C2884E]/10 to-transparent rounded-full blur-[80px]"></div>
        
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full"></div>
            <div className="px-4 py-1 mx-3 bg-[#C2884E]/5 rounded-full">
              <span className="text-sm font-medium text-[#C2884E]">{t('customerReviewsTag')}</span>
            </div>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full"></div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-light mb-6 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
              {t('customerReviewsTitle')}
            </span>
            <span className="block font-extralight text-[#6B5F53]">{t('customerReviewsSubtitle')}</span>
          </h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-[#C2884E]/20 to-[#D1A46C]/60 mx-auto"></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Screenshot Stack Carousel */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative h-[450px] flex items-center justify-center perspective-1000">
              {/* Navigation Buttons */}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 z-40 bg-white/90 hover:bg-white shadow-lg border-[#C2884E]/20 hover:border-[#C2884E]/40 hover:scale-105 transition-all"
                onClick={prevImage}
              >
                <ChevronLeft className="h-5 w-5 text-[#C2884E]" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 z-40 bg-white/90 hover:bg-white shadow-lg border-[#C2884E]/20 hover:border-[#C2884E]/40 hover:scale-105 transition-all"
                onClick={nextImage}
              >
                <ChevronRight className="h-5 w-5 text-[#C2884E]" />
              </Button>

              {/* Image Stack */}
              <div className="relative w-[300px] h-[400px]">
                {reviewImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="absolute inset-0 transition-all duration-500 ease-out cursor-pointer"
                    style={getImageStyle(index)}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#C2884E]/10">
                      <Image 
                        src={image.src} 
                        alt={image.alt} 
                        fill 
                        className="object-cover"
                        objectPosition="top center"
                        sizes="(max-width: 768px) 100vw, 300px"
                        priority={index === currentIndex}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center mt-8 space-x-2">
              {reviewImages.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] w-6" : "bg-[#C2884E]/20 hover:bg-[#C2884E]/40"
                  }`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </motion.div>

          {/* Right side - Review Summary */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="inline-flex items-center space-x-2 bg-[#C2884E]/10 text-[#C2884E] px-4 py-2 rounded-full text-sm font-medium">
              <span>💬</span>
              <span>{t('realFeedbackTag')}</span>
            </div>

            <div className="space-y-4 text-[#6B5F53] leading-relaxed">
              <p className="text-lg">{t('realFeedbackDesc1')}</p>

              <p dangerouslySetInnerHTML={{ __html: t('realFeedbackDesc2') }}></p>

              <p>{t('realFeedbackDesc3')}</p>

              <p className="text-[#6B5F53]/80 italic border-l-4 border-[#C2884E]/20 pl-4">
                {t('realFeedbackQuote')}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#C2884E]">500+</div>
                <div className="text-sm text-[#6B5F53]">{t('satisfiedReviews')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#C2884E]">4.9</div>
                <div className="text-sm text-[#6B5F53]">{t('averageRating')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#C2884E]">98%</div>
                <div className="text-sm text-[#6B5F53]">{t('repurchaseRate')}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 