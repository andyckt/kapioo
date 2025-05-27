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

        <section id="how-it-works" className="w-full py-10 sm:py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <motion.div 
              className="flex flex-col items-center justify-center space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{t('howItWorksTitle')}</h2>
                <p className="max-w-[900px] text-sm sm:text-base text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t('howItWorksDescription')}
                </p>
              </div>
            </motion.div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-8 sm:py-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
              <motion.div 
                className="flex flex-col justify-center space-y-4 rounded-lg border p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#C2884E]/20 cursor-pointer">
                  1
                </div>
                <h3 className="text-lg sm:text-xl font-bold">{t('step1Title')}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t('step1Description')}
                </p>
              </motion.div>
              <motion.div 
                className="flex flex-col justify-center space-y-4 rounded-lg border p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#C2884E]/20 cursor-pointer">
                  2
                </div>
                <h3 className="text-lg sm:text-xl font-bold">{t('step2Title')}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t('step2Description')}
                </p>
              </motion.div>
              <motion.div 
                className="flex flex-col justify-center space-y-4 rounded-lg border p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 md:col-span-2 lg:col-span-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#C2884E]/20 cursor-pointer">
                  3
                </div>
                <h3 className="text-lg sm:text-xl font-bold">{t('step3Title')}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t('step3Description')}
                </p>
              </motion.div>
            </div>
          </div>
        </section>
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

