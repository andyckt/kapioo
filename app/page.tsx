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
          
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_600px] lg:gap-12 xl:grid-cols-[1fr_700px] items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col justify-center space-y-4 order-2 lg:order-1"
              >
                <div className="space-y-2 relative">
                  <div className="relative">
                    <div className="relative">
                      {/* Mascot character - commented out
                      <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="absolute bottom-[80%] sm:bottom-[85%] md:bottom-[90%] left-0 z-10"
                      >
                        <Image 
                          src="/未命名設計 (2).png" 
                          alt="Kapioo Mascot" 
                          width={80} 
                          height={80}
                          sizes="(max-width: 640px) 80px, (max-width: 768px) 90px, 100px"
                          priority
                          className="select-none sm:w-[90px] sm:h-[90px] md:w-[100px] md:h-[100px]"
                        />
                      </motion.div>
                      */}
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]/80">
                        {/* <span className="inline-block w-[15px] sm:w-[20px] md:w-[25px]"></span> */}
                        {t('heroTitle')}
                      </h1>
                    </div>
                  </div>
                  <p className="max-w-[600px] text-base sm:text-lg text-muted-foreground md:text-xl mt-8">
                    {t('heroDescription')}
                  </p>
                </div>
                <motion.div 
                  className="flex flex-col sm:flex-row gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <Button asChild size="lg" className="w-full sm:w-auto hover:scale-105 transition-transform bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white">
                    <Link href="/login">
                      {t('getStartedBtn')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild className="w-full sm:w-auto hover:scale-105 transition-transform">
                    <Link href="#how-it-works">{t('howItWorksBtn')}</Link>
                  </Button>
                </motion.div>
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

