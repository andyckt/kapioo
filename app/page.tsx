"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroCarousel } from "@/components/hero-carousel"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function Home() {
  const { t } = useLanguage();
  
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex gap-4 md:gap-10">
            <Link href="/" className="flex items-center gap-2 group">
              <Image 
                src="/未命名設計.png" 
                alt="Kapioo Logo" 
                width={32} 
                height={32} 
                className="h-8 w-8 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" 
              />
              <span className="inline-block font-bold text-[#C2884E] text-lg sm:text-xl transition-all duration-300 group-hover:scale-105 group-hover:tracking-wider">Kapioo</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <nav className="flex items-center space-x-1 sm:space-x-2">
              <Link href="/login" className="px-2 sm:px-4 py-2 text-sm font-medium transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#C2884E] hover:to-[#D1A46C] hover:scale-105 transition-transform">
                {t('login')}
              </Link>
              <Button asChild size="sm" className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-105 transition-transform sm:size-default">
                <Link href="/login">
                  <span className="sm:block">{t('getStarted')}</span> <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline-block" />
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-10 md:py-24 lg:py-32 xl:py-40 bg-[#fff6ef] relative overflow-hidden">
          {/* Background pattern for premium feel */}
          <div className="absolute inset-0 z-0 opacity-5">
            <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:20px_20px]"></div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#C2884E]/10 to-transparent rounded-full blur-3xl"></div>
          
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_600px] lg:gap-12 xl:grid-cols-[1fr_700px] items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col justify-center space-y-8 order-2 lg:order-1"
              >
                {/* Redesigned title and subtitle section */}
                <div className="relative z-10 bg-white/80 backdrop-blur-sm p-8 rounded-xl border border-[#C2884E]/20 shadow-lg mt-10">
                  {/* Logo positioned on top right of card with automatic animation */}
                  <motion.div 
                    className="absolute -top-16 right-8"
                    animate={{ 
                      y: [0, -8, 0],
                      rotate: [0, 6, 0]
                    }}
                    transition={{ 
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut" 
                    }}
                  >
                    <Image 
                      src="/未命名設計.png" 
                      alt="Kapioo Logo" 
                      width={50} 
                      height={50}
                      className="h-20 w-20 drop-shadow-lg" 
                    />
                  </motion.div>
                  
                  <div className="space-y-6">
                    <div className="relative mb-8">
                      <div className="w-20 h-1.5 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] mb-4"></div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tighter sm:text-4xl xl:text-5xl/none bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]/80">
                        <span dangerouslySetInnerHTML={{ __html: t('heroTitle') }} />
                      </h1>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Tagline section - removed background container */}
                      <div className="p-1">
                        <div className="text-base sm:text-lg font-medium text-[#C2884E] mb-3">
                          每日现做 每日配送
                        </div>
                        
                        {/* Tags in a more elegant layout */}
                        <div className="flex flex-wrap gap-3 mb-4">
                          {['健康', '高质', '舒服', '幸福'].map((tag, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-white/60 backdrop-blur-sm rounded-full text-sm text-[#C2884E] shadow-sm flex items-center"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] mr-1.5 inline-block"></span>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Motto section with buttons on the same line */}
                      <div className="flex justify-between items-center p-1">
                        <div className="space-y-2">
                          <p className="text-sm sm:text-base italic text-[#6B5F53]">
                            一顿饭的时间 给生活松一口气
                          </p>
                          <p className="text-sm sm:text-base font-medium text-[#C2884E]">
                            Kapioo，你每天的松弛美好时刻
                          </p>
                        </div>
                        
                        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
                          <Button asChild size="sm" className="hover:scale-105 transition-transform bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-sm">
                            <Link href="/login">
                              {t('getStartedBtn')} <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                          {/* 
                          <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-transform border-[#C2884E]/30 text-[#C2884E]">
                            <Link href="#how-it-works">{t('howItWorksBtn')}</Link>
                          </Button>
                          */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                className="mx-auto w-full order-1 lg:order-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                {/* Premium styled carousel wrapper */}
                <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/20 relative w-full">
                  <HeroCarousel />
                  <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-black/10"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Food Gallery Section - Enhanced */}
        <section className="w-full py-20 sm:py-28 bg-gradient-to-b from-white to-[#FBF7F2] relative overflow-hidden">
          {/* Enhanced decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-[10%] w-[500px] h-[500px] bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-[100px]"></div>
            <div className="absolute -bottom-20 left-[5%] w-[400px] h-[400px] bg-gradient-to-tr from-[#C2884E]/10 to-transparent rounded-full blur-[80px]"></div>
            <div className="absolute top-1/3 right-0 w-40 h-40 rounded-full border border-[#C2884E]/5 opacity-50"></div>
            <div className="absolute bottom-1/4 left-[10%] w-16 h-16 rounded-full border border-[#C2884E]/10 opacity-70"></div>
            <div className="absolute top-1/2 left-[30%] w-3 h-3 rounded-full bg-[#C2884E]/20"></div>
            <div className="absolute top-[70%] right-[20%] w-5 h-5 rounded-full bg-[#C2884E]/20"></div>
            
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute inset-0 bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]"></div>
            </div>
          </div>
          
          <div className="container px-4 md:px-6 relative">
            {/* Enhanced Section Header */}
            <motion.div 
              className="text-center max-w-3xl mx-auto mb-20"
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
                    <span className="text-sm font-medium text-[#C2884E]">精选菜系</span>
                  </div>
                  <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full"></div>
                </div>
              </motion.div>
              
              <motion.h2 
                className="text-3xl md:text-5xl font-bold mb-4 relative inline-block"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                  多元融合 丰富美味 轻盈健康
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
                Diverse Fusion, Rich Flavors, Light & Healthy
              </motion.p>
            </motion.div>
            
            {/* Enhanced Food Gallery Grid - Creative Layout */}
            <div className="relative z-10 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                {/* Chinese Cuisine - Larger Size Card */}
                <motion.div 
                  className="group relative rounded-2xl overflow-hidden shadow-xl lg:col-span-2 lg:row-span-2 h-[480px] md:h-[550px] transform transition-all duration-700"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  whileHover={{ 
                    y: -5,
                    boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-10 opacity-80 group-hover:opacity-70 transition-opacity duration-500"></div>
                  <motion.div 
                    className="relative h-full w-full overflow-hidden"
                    whileHover={{ scale: 1.07 }}
                    transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <Image 
                      src="/food-gallery/Chinese style meal.jpg" 
                      alt="Chinese Cuisine" 
                      fill
                      className="object-cover transition-transform duration-[1.5s]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </motion.div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="h-[2px] w-8 bg-[#C2884E]"></div>
                        <span className="text-[#C2884E] font-medium">FEATURED</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">中式菜系</h3>
                      <p className="text-white/90 text-sm sm:text-base max-w-md">
                        优质食材 · 控油控盐 · 健康烹饪方式 · 轻盈美味
                      </p>
                      <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                          initial={{ x: "-100%" }}
                          whileInView={{ x: "0%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
                
                {/* Western Cuisine */}
                <motion.div 
                  className="group relative rounded-2xl overflow-hidden shadow-xl lg:col-span-2 h-[300px] md:h-[350px] transform transition-all duration-700"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  whileHover={{ 
                    y: -5,
                    boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-10 opacity-80 group-hover:opacity-70 transition-opacity duration-500"></div>
                  <motion.div 
                    className="relative h-full w-full overflow-hidden"
                    whileHover={{ scale: 1.07 }}
                    transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <Image 
                      src="/food-gallery/westernfood.JPG" 
                      alt="Western Cuisine" 
                      fill
                      className="object-cover transition-transform duration-[1.5s]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </motion.div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="space-y-3"
                    >
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">西式餐点</h3>
                      <p className="text-white/90 text-sm max-w-md">
                        融合风格 · 中西结合 · 创意改良
                      </p>
                      <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                          initial={{ x: "-100%" }}
                          whileInView={{ x: "0%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
                
                {/* Japanese/Korean Cuisine */}
                <motion.div 
                  className="group relative rounded-2xl overflow-hidden shadow-xl h-[300px] md:h-[350px] transform transition-all duration-700"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  whileHover={{ 
                    y: -5,
                    boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-10 opacity-80 group-hover:opacity-70 transition-opacity duration-500"></div>
                  <motion.div 
                    className="relative h-full w-full overflow-hidden"
                    whileHover={{ scale: 1.07 }}
                    transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <Image 
                      src="/food-gallery/Korean.jpg" 
                      alt="Korean Cuisine" 
                      fill
                      className="object-cover transition-transform duration-[1.5s]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </motion.div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="space-y-3"
                    >
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">日韩料理</h3>
                      <p className="text-white/90 text-sm max-w-md">
                        原汁原味 · local食材 · 经典味道
                      </p>
                      <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                          initial={{ x: "-100%" }}
                          whileInView={{ x: "0%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
                
                {/* Southeast Asian Cuisine */}
                <motion.div 
                  className="group relative rounded-2xl overflow-hidden shadow-xl h-[300px] md:h-[350px] transform transition-all duration-700"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  whileHover={{ 
                    y: -5,
                    boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-10 opacity-80 group-hover:opacity-70 transition-opacity duration-500"></div>
                  <motion.div 
                    className="relative h-full w-full overflow-hidden"
                    whileHover={{ scale: 1.07 }}
                    transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <Image 
                      src="/food-gallery/Thai.JPG" 
                      alt="Southeast Asian Cuisine" 
                      fill
                      className="object-cover transition-transform duration-[1.5s]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </motion.div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="space-y-3"
                    >
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">东南亚风味</h3>
                      <p className="text-white/90 text-sm max-w-md">
                        地域风情 · 香料酸辣 · 特色滋味
                      </p>
                      <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                          initial={{ x: "-100%" }}
                          whileInView={{ x: "0%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
              
              {/* Decorative design element */}
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
            </div>
          </div>
        </section>
        
        {/* How It Works section removed */}
        
      </main>
      <footer className="w-full border-t bg-background py-4 sm:py-6 md:py-8">
        <div className="container flex flex-col items-center justify-center gap-3 md:flex-row md:gap-8">
          <p className="text-center text-xs sm:text-sm leading-loose text-muted-foreground md:text-left">
            {t('copyright')}
          </p>
          <div className="flex gap-3 sm:gap-4">
            {/* 
            <Link href="#" className="text-xs sm:text-sm font-medium hover:underline">
              Terms
            </Link>
            <Link href="#" className="text-xs sm:text-sm font-medium hover:underline">
              Privacy
            </Link>
            <Link href="#" className="text-xs sm:text-sm font-medium hover:underline">
              Contact
            </Link>
            */}
          </div>
        </div>
      </footer>
    </div>
  )
}

