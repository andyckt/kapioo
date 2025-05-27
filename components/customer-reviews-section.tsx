"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function CustomerReviewsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Array of review images
  const reviewImages = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    src: `/reviews/${i + 1}.png`,
    alt: `Customer review screenshot ${i + 1}`,
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
        transform: `translateX(${isNext ? "60px" : "-60px"}) translateY(10px) scale(0.9) rotateY(${isNext ? "-15deg" : "15deg"})`,
        zIndex: 20,
        opacity: 0.7,
      }
    } else if (normalizedDiff === 2 || normalizedDiff === totalImages - 2) {
      // Second layer - barely visible
      const isNext = normalizedDiff === 2
      return {
        transform: `translateX(${isNext ? "80px" : "-80px"}) translateY(20px) scale(0.8) rotateY(${isNext ? "-25deg" : "25deg"})`,
        zIndex: 10,
        opacity: 0.4,
      }
    } else {
      // Hidden images
      return {
        transform: "translateX(0) translateY(30px) scale(0.7)",
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
        <div className="absolute top-1/3 right-0 w-40 h-40 rounded-full border border-[#C2884E]/5 opacity-50"></div>
        <div className="absolute bottom-1/4 left-[10%] w-16 h-16 rounded-full border border-[#C2884E]/10 opacity-70"></div>
        
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="inline-flex items-center justify-center mb-4">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full"></div>
              <div className="px-4 py-1 mx-3 bg-[#C2884E]/5 rounded-full">
                <span className="text-sm font-medium text-[#C2884E]">用户体验</span>
              </div>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full"></div>
            </div>
          </motion.div>
          
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4 relative inline-block"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
              来自用户的真实反馈
            </span>
            <motion.div 
              className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C2884E]/0 via-[#C2884E]/70 to-[#C2884E]/0"
              initial={{ width: 0, x: "50%" }}
              whileInView={{ width: "100%", x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.7 }}
            ></motion.div>
          </motion.h2>
          
          <motion.p 
            className="text-lg md:text-xl text-[#6B5F53] mt-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            What our customers say about Kapioo
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Screenshot Stack Carousel */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative h-[500px] flex items-center justify-center perspective-1000">
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
              <div className="relative w-80 h-96">
                {reviewImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    className="absolute inset-0 transition-all duration-500 ease-out cursor-pointer"
                    style={getImageStyle(index)}
                    onClick={() => setCurrentIndex(index)}
                    whileHover={{ scale: index === currentIndex ? 1.05 : 1, transition: { duration: 0.3 } }}
                  >
                    <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#C2884E]/10">
                      <Image src={image.src} alt={image.alt} fill className="object-cover" />
                    </div>
                  </motion.div>
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
            <div className="space-y-4 text-[#6B5F53] leading-relaxed">
              <p className="text-lg">这些不是精心包装的宣传语，而是用户吃过之后亲自发来的消息截图。</p>

              <p>
                有人说<span className="text-[#C2884E] font-medium">"第一次体验就满分"</span>，有人说
                <span className="text-[#C2884E] font-medium">"这是我吃过最满意的一餐"</span>，还有人直接晒图夸
                <span className="text-[#C2884E] font-medium">"连拍照都好看"</span>。
              </p>

              <p>Kapioo 不只是送餐，更是在忙碌生活中，带来一份温暖与真实的连接。</p>

              <div className="relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C2884E] to-[#D1A46C] rounded-full"></div>
                <p className="text-[#6B5F53] italic pl-6">
                  每一句评价，我们都珍藏，也会继续努力，让更多人吃到满意的一餐。
                </p>
              </div>
            </div>
            
            {/* Decorative element */}
            <motion.div 
              className="w-24 h-24 absolute -bottom-12 -right-12 opacity-20 pointer-events-none"
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { 
                  duration: 20, 
                  repeat: Infinity,
                  ease: "linear"
                },
                scale: {
                  duration: 8,
                  repeat: Infinity,
                  repeatType: "reverse"
                }
              }}
            >
              <div className="w-full h-full rounded-full border-4 border-dashed border-[#C2884E]/30"></div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 