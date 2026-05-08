"use client"

import { Fragment, type CSSProperties } from "react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useState } from "react"
import {
  ArrowRight,
  Bike,
  CreditCard,
  Heart,
  Menu,
  Soup,
  Truck,
  UtensilsCrossed,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroCarousel } from "@/components/hero-carousel"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ScreenshotCarousel } from "@/components/screenshot-carousel"
import SectionNavigation from "@/components/section-navigation"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import CustomerReviewsSection from "@/components/customer-reviews-section"
import { EnglishReviewSection } from "@/components/english-review-section"
import HomeKapiooKitchenSection from "@/components/home-kapioo-kitchen-section"
import { productLineChooseSeriesSentenceEn, productLineChooseSeriesSentenceZh } from "@/lib/product-lines/names"
import { SHOW_HOME_LOCATION_MEAL_PLANS_SECTION } from "@/lib/home-page-section-flags"

const LocationMealPlans = dynamic(
  () => import("@/components/location-meal-plans").then((m) => ({ default: m.default })),
  { loading: () => <div className="h-64 animate-pulse rounded-xl bg-[#FBF7F2]" /> }
)

/** Hero value row: icon + two lines; order matches `heroValue{n}Line{1|2}` in language-context. */
const HOME_HERO_VALUE_ROWS = [
  { Icon: Soup, line1Key: "heroValue1Line1", line2Key: "heroValue1Line2" },
  { Icon: Bike, line1Key: "heroValue2Line1", line2Key: "heroValue2Line2" },
  { Icon: Heart, line1Key: "heroValue3Line1", line2Key: "heroValue3Line2" },
] as const

const heroIntroContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
}

const heroIntroEase = [0.25, 0.46, 0.45, 0.94] as const

const heroIntroFadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: heroIntroEase },
  },
}

const heroIntroGoldBar: Variants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.48, ease: heroIntroEase },
  },
}

export default function HomeClient({ kitchenTourVimeoId }: { kitchenTourVimeoId: string }) {
  const prefersReducedMotion = useReducedMotion()
  const heroIntroReduced = prefersReducedMotion === true

  const { t, language, setLanguage } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden md:flex">
              <LanguageSwitcher />
            </div>
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/how-it-works"
                className="hidden md:inline-flex px-2 sm:px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#C2884E] hover:to-[#D1A46C] hover:scale-105 transition-transform"
              >
                {language === 'zh' ? '如何订阅' : 'How It Works'}
              </Link>
              <Link
                href="/faq"
                className="hidden md:inline-flex px-2 sm:px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#C2884E] hover:to-[#D1A46C] hover:scale-105 transition-transform"
              >
                {language === 'zh' ? '常问问题' : 'FAQ'}
              </Link>
              <Link
                href="/login"
                className="px-2 sm:px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#C2884E] hover:to-[#D1A46C] hover:scale-105 transition-transform"
              >
                {t('login')}
              </Link>
              <Button asChild size="sm" className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-105 transition-transform sm:size-default">
                <Link href="/starter">
                  <span className="sm:block">{t('getStarted')}</span> <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline-block" />
                </Link>
              </Button>
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-xl"
                    aria-label={language === "zh" ? "打开导航菜单" : "Open navigation menu"}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] max-w-sm px-5 py-6 flex flex-col overflow-y-auto">
                  <SheetHeader className="text-left">
                    <SheetTitle>{language === "zh" ? "导航菜单" : "Navigation"}</SheetTitle>
                    <SheetDescription>
                      {language === "zh" ? "选择页面或切换语言" : "Browse pages and change language"}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-2">
                    <Link
                      href="/how-it-works"
                      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#6B5F53] hover:bg-[#F5EDE4] transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {language === "zh" ? "如何订阅" : "How It Works"}
                    </Link>
                    <Link
                      href="/faq"
                      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#6B5F53] hover:bg-[#F5EDE4] transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {language === "zh" ? "常问问题" : "FAQ"}
                    </Link>
                  </div>

                  <div className="mt-5 border-t border-[#C2884E]/15 pt-4">
                    <p className="mb-2 px-3 text-xs font-medium tracking-wide text-[#8A7968] uppercase">
                      {language === "zh" ? "语言" : "Language"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`justify-center border-[#C2884E]/20 ${language === "zh" ? "bg-[#F5EDE4] text-[#6B5F53]" : ""}`}
                        onClick={() => {
                          setLanguage("zh")
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        中文
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`justify-center border-[#C2884E]/20 ${language === "en" ? "bg-[#F5EDE4] text-[#6B5F53]" : ""}`}
                        onClick={() => {
                          setLanguage("en")
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        English
                      </Button>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-[#C2884E]/15 pt-4 space-y-2">
                    <Link
                      href="/login"
                      className="block rounded-xl border border-[#C2884E]/15 px-3 py-2.5 text-sm font-medium text-[#6B5F53] hover:bg-[#F5EDE4] transition-colors text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t("login")}
                    </Link>
                    <Button
                      asChild
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white"
                    >
                      <Link href="/starter" onClick={() => setIsMobileMenuOpen(false)}>
                        {t("getStarted")}
                      </Link>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {/* Navigation Menu */}
        <SectionNavigation />
        <section className="w-full relative overflow-hidden lg:min-h-screen bg-[#fff6ef]">
          {/* Decorative elements - lighter blur for scroll performance */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#C2884E]/10 to-transparent rounded-full blur-xl"></div>
          
          <div className="container px-4 md:px-6 relative z-10 py-8 md:py-12 lg:py-6 flex flex-col lg:flex-row lg:items-center lg:h-[calc(100vh-4rem)]">
            {/* Mobile: Order 1 - Desktop: Order 1 */}
            <motion.div 
              className="w-full order-1 lg:w-1/2 mb-4 md:mb-6 lg:mb-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              {/* 16:9 aspect ratio carousel */}
              <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/20 relative w-full">
                {/* 16:9 aspect ratio container using padding-bottom technique */}
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <div className="absolute inset-0">
                    <HeroCarousel />
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Mobile: Order 2 - Desktop: Order 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="order-2 flex min-w-0 flex-col justify-center space-y-4 md:space-y-6 lg:w-1/2 lg:pl-12"
            >
              {/* Redesigned card container with modern styling */}
              <motion.div 
                className="relative z-10 w-full min-w-0 overflow-visible bg-white/90 backdrop-blur-md p-6 sm:p-8 md:p-10 rounded-2xl border-0 shadow-xl ring-1 ring-[#C2884E]/10">
                {/* Logo with gentle bounce - pure CSS for smooth GPU-accelerated animation */}
                <div 
                  className="absolute -top-16 sm:-top-20 right-6 sm:right-10 animate-logo-float will-change-transform"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-md bg-gradient-to-br from-[#C2884E]/30 to-[#D1A46C]/30"></div>
                    <Image 
                      src="/bobe.png" 
                      alt="Kapioo Logo" 
                      width={80} 
                      height={80}
                      className="h-24 w-24 sm:h-28 sm:w-28 relative drop-shadow-xl" 
                    />
                  </div>
                </div>
                
                <motion.div
                  className="space-y-4 pt-4 sm:space-y-6 sm:pt-5 md:space-y-8"
                  variants={heroIntroContainer}
                  initial={heroIntroReduced ? "visible" : "hidden"}
                  animate="visible"
                >
                  {/* Main heading — fade up; avoids overflow clipping on descenders */}
                  <motion.div variants={heroIntroFadeUp} className="relative pb-1">
                    <div className="absolute -top-3 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#C2884E]/30 to-transparent origin-left pointer-events-none" />

                    <h1 className="text-balance pb-1.5 pt-1 text-3xl font-bold leading-snug tracking-tight sm:text-4xl sm:leading-snug md:text-5xl md:leading-[1.12]">
                      {language === "en" ? (
                        <>
                          <span className="text-[#3f352b]">Asian comfort meals for </span>
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                            everyday life.
                          </span>
                        </>
                      ) : (
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                          {t("mainSlogan")}
                        </span>
                      )}
                    </h1>
                  </motion.div>

                  <motion.div
                    variants={heroIntroGoldBar}
                    className="mb-4 mt-1 h-1.5 w-20 origin-left bg-gradient-to-r from-[#C2884E] to-[#D1A46C] sm:mb-5 sm:mt-2 sm:w-24"
                  />

                  <motion.p
                    variants={heroIntroFadeUp}
                    className="text-sm font-medium leading-relaxed text-[#6B5F53] sm:text-base md:text-lg"
                  >
                    {t("subSlogan")}
                  </motion.p>

                  {/* Value props — divider row fades in with staggered intro */}
                  <motion.div variants={heroIntroFadeUp} className="mt-5 w-full min-w-0 sm:mt-6">
                    <div
                      role="list"
                      aria-label={t("heroValuePropsAria")}
                      className="flex min-w-0 flex-nowrap items-center"
                    >
                      {HOME_HERO_VALUE_ROWS.map(({ Icon, line1Key, line2Key }, index) => (
                        <Fragment key={line1Key}>
                          {index > 0 ? (
                            <div className="flex shrink-0 self-stretch items-center justify-center px-2 sm:px-3 md:px-4" aria-hidden>
                              <span className="h-6 w-0.5 shrink-0 rounded-full bg-[#C2884E]/35 sm:h-8 sm:bg-[#C2884E]/38" />
                            </div>
                          ) : null}
                          <div
                            role="listitem"
                            className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-2 px-1 text-center sm:flex-row sm:items-center sm:gap-4 sm:px-1 sm:text-left"
                          >
                            <Icon
                              className="size-[22px] shrink-0 text-[#BA844D] opacity-[0.95] sm:size-6 sm:text-[#B07845]"
                              strokeWidth={1.85}
                              aria-hidden
                            />
                            <div className="min-w-0 max-w-[11rem] sm:max-w-none">
                              <p className="text-balance text-xs font-semibold leading-snug tracking-[-0.015em] text-[#382f29] sm:text-[13px]">
                                {t(line1Key)}
                              </p>
                              <p className="mt-0.5 text-balance text-[11px] font-medium leading-snug text-[#6B5F53]/88 sm:mt-1 sm:text-xs">
                                {t(line2Key)}
                              </p>
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    variants={heroIntroFadeUp}
                    className="flex justify-end !mt-10 sm:!mt-12 md:!mt-14"
                  >
                    <Button asChild size="lg" className="hover:scale-105 transition-transform bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md px-6 py-6 rounded-xl">
                      <Link href="/starter" className="flex items-center">
                        <span className="text-base">{t('getStartedBtn')}</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <HomeKapiooKitchenSection kitchenTourVimeoId={kitchenTourVimeoId} />
        
        {SHOW_HOME_LOCATION_MEAL_PLANS_SECTION ? (
          <div id="meal-plans">
            <LocationMealPlans />
          </div>
        ) : null}

        {/* Food Gallery Section - Enhanced */}
        <section id="food-gallery" className="w-full py-8 md:py-16 lg:py-24 bg-gradient-to-b from-white to-[#FBF7F2] relative overflow-hidden">
          {/* Enhanced decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-[10%] w-[500px] h-[500px] bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-2xl"></div>
            <div className="absolute -bottom-20 left-[5%] w-[400px] h-[400px] bg-gradient-to-tr from-[#C2884E]/10 to-transparent rounded-full blur-xl"></div>
            <div className="absolute top-1/3 right-0 w-40 h-40 rounded-full border border-[#C2884E]/5 opacity-50"></div>
            
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute inset-0 bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]"></div>
            </div>
          </div>
          
          <div className="container px-4 md:px-6 relative">
            {/* Section Header - CSS reveal for scroll performance */}
            <ScrollReveal className="text-center max-w-3xl mx-auto mb-10 md:mb-16 lg:mb-20">
              <div className="reveal-item reveal-item-delay-1">
                <div className="inline-flex items-center justify-center mb-4">
                  <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full"></div>
                  <div className="px-4 py-1 mx-3 bg-[#C2884E]/5 rounded-full">
                    <span className="text-sm font-medium text-[#C2884E]">{t('foodGalleryTag')}</span>
                  </div>
                  <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full"></div>
                </div>
              </div>
              
              <h2 className="text-3xl md:text-5xl font-bold mb-4 relative inline-block reveal-item reveal-item-delay-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                  {t('foodGalleryTitle')}
                </span>
                <div className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C2884E]/0 via-[#C2884E]/70 to-[#C2884E]/0 origin-center" />
              </h2>
              
              <p className="text-lg md:text-xl text-[#6B5F53] mt-6 max-w-2xl mx-auto reveal-item reveal-item-delay-3">
                {t('foodGallerySubtitle')}
              </p>
            </ScrollReveal>
            
            {/* Food Gallery Grid - CSS reveal + transform-only hover for smooth scrolling */}
            <ScrollReveal className="relative z-10 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                {/* Chinese Cuisine - Larger Size Card */}
                <div 
                  className="group relative rounded-2xl overflow-hidden shadow-xl lg:col-span-2 lg:row-span-2 h-[480px] md:h-[550px] reveal-item reveal-item-delay-1 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative h-full w-full overflow-hidden transition-transform duration-300 hover:scale-[1.02] hover:will-change-transform">
                    <Image 
                      src="/food-gallery/Chinese style meal.jpg" 
                      alt="Chinese Cuisine" 
                      fill
                      className="object-cover transition-transform duration-[1.5s]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-8">
                    <div className="space-y-4">
                      <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{t('chineseCuisineTitle')}</h3>
                      <p className="text-white/90 text-sm sm:text-base max-w-md">
                        {t('chineseCuisineDesc')}
                      </p>
                      <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="h-full w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Western Cuisine */}
                <div 
                  className="group relative rounded-2xl overflow-hidden shadow-xl lg:col-span-2 h-[300px] md:h-[350px] reveal-item reveal-item-delay-2 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative h-full w-full overflow-hidden transition-transform duration-300 hover:scale-[1.02] hover:will-change-transform">
                    <Image 
                      src="/food-gallery/westernfood.JPG" 
                      alt="Western Cuisine" 
                      fill
                      className="object-cover transition-transform duration-[1.5s]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('westernCuisineTitle')}</h3>
                      <p className="text-white/90 text-sm max-w-md">
                        {t('westernCuisineDesc')}
                      </p>
                      <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="h-full w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Japanese/Korean Cuisine */}
                <div 
                  className="group relative rounded-2xl overflow-hidden shadow-xl h-[300px] md:h-[350px] reveal-item reveal-item-delay-3 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative h-full w-full overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                    <Image 
                      src="/food-gallery/Korean.jpg" 
                      alt="Korean Cuisine" 
                      fill
                      className="object-cover transition-transform duration-[1.5s]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('japaneseKoreanCuisineTitle')}</h3>
                      <p className="text-white/90 text-sm max-w-md">
                        {t('japaneseKoreanCuisineDesc')}
                      </p>
                      <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="h-full w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Southeast Asian Cuisine */}
                <div 
                  className="group relative rounded-2xl overflow-hidden shadow-xl h-[300px] md:h-[350px] reveal-item reveal-item-delay-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative h-full w-full overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                    <Image 
                      src="/food-gallery/Thai.JPG" 
                      alt="Southeast Asian Cuisine" 
                      fill
                      className="object-cover transition-transform duration-[1.5s]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('southeastAsianCuisineTitle')}</h3>
                      <p className="text-white/90 text-sm max-w-md">
                        {t('southeastAsianCuisineDesc')}
                      </p>
                      <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="h-full w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative design element - static for performance */}
              <div className="w-24 h-24 absolute -bottom-12 -right-12 opacity-20 pointer-events-none">
                <div className="w-full h-full rounded-full border-4 border-dashed border-[#C2884E]/30" />
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* How it works – 3 steps */}
        <section id="how-it-works-steps" className="w-full py-16 md:py-24 lg:py-28 bg-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-[10%] w-[400px] h-[400px] bg-gradient-to-br from-[#C2884E]/8 to-transparent rounded-full blur-2xl" />
            <div className="absolute bottom-20 right-[10%] w-[500px] h-[500px] bg-gradient-to-bl from-[#D1A46C]/8 to-transparent rounded-full blur-3xl" />
            <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>
          <div className="container px-4 md:px-6 relative z-10 max-w-6xl mx-auto">
            <ScrollReveal rootMargin="0px 0px -80px 0px">
              <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20 reveal-item">
                <div className="inline-flex items-center justify-center mb-4">
                <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full" />
                <div className="px-4 py-1 mx-3 bg-[#C2884E]/5 rounded-full">
                  <span className="text-sm font-medium text-[#C2884E]">{t('howItWorksTag')}</span>
                </div>
                <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                  {t('howItWorksMainTitle')}
                </span>
                <span className="block text-[#6B5F53] font-semibold mt-1">{t('howItWorksSubtitle')}</span>
              </h2>
              <p className="text-lg text-[#6B5F53]/90 max-w-xl mx-auto">
                {language === "zh" ? "选计划、选餐、送达——就这么简单。" : "Choose your plan, pick your meals, we deliver. That’s it."}
              </p>
              </div>

            <div className="space-y-20 md:space-y-28">
              {[
                {
                  title: language === "zh" ? "选择计划" : "Choose your plan",
                  description: language === "zh" ? productLineChooseSeriesSentenceZh() : productLineChooseSeriesSentenceEn(),
                  image: "/foodjpg/Ordering%20Kapioo%20meals%20on%20website.jpeg",
                  icon: CreditCard,
                  align: "left",
                },
                {
                  title: language === "zh" ? "选择餐品" : "Pick your meals",
                  description: language === "zh" ? "从我们不断更新的菜单中挑选——常换常新，四季都吃不腻。" : "Choose from our never-repeat rotating menu—always fresh and exciting. We'll be here for you through every season of life, with meals you'll never get tired of.",
                  image: "/foodjpg/Kapioo%20Meals%20in%20fridge.jpeg",
                  icon: UtensilsCrossed,
                  align: "right",
                },
                {
                  title: language === "zh" ? "烹饪与配送" : "We cook & deliver",
                  description: language === "zh" ? "新鲜现做，在配送时段送抵您家。" : "Freshly cooked meals are delivered to your door during the delivery window.",
                  image: "/foodjpg/Kapioo%20Chef.jpg.jpeg",
                  icon: Truck,
                  align: "left",
                },
              ].map((step, index) => {
                const Icon = step.icon;
                const isEven = step.align === "left";
                return (
                  <article
                    key={step.title}
                    className={`flex flex-col lg:flex-row gap-10 lg:gap-16 items-center reveal-item ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"}`}
                    style={{ transitionDelay: `${(index + 1) * 0.08}s` } as CSSProperties}
                  >
                    <div className={`flex-1 text-center ${isEven ? "lg:text-left" : "lg:text-right"}`}>
                      <div className={`flex items-center gap-3 mb-4 justify-center ${isEven ? "lg:justify-start" : "lg:justify-end"}`}>
                        <span className="text-5xl font-extralight text-[#C2884E]/20">0{index + 1}</span>
                        <div className="w-px h-10 bg-[#C2884E]/20 rounded-full" />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-semibold text-[#3f352b] mb-3">
                        {step.title}
                      </h3>
                      <p className={`text-[#6B5F53] leading-relaxed max-w-lg ${!isEven ? "lg:ml-auto" : ""}`}>
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="relative group">
                        <div className="relative w-40 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-xl ring-1 ring-[#C2884E]/10 group-hover:ring-[#C2884E]/25 transition-all duration-300">
                          <Image
                            src={step.image}
                            alt={step.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 160px, 176px"
                          />
                        </div>
                        <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-xl bg-white shadow-lg flex items-center justify-center border border-[#C2884E]/10 group-hover:scale-105 transition-transform">
                          <Icon className="w-7 h-7 text-[#C2884E]" />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-14 md:mt-20 reveal-item reveal-item-delay-5">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
              >
                <Link href="/starter" className="flex items-center justify-center gap-2">
                  {language === "zh" ? "查看菜单并下单" : "View Menu and Order"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-[#C2884E]/30 text-[#6B5F53] hover:bg-[#C2884E]/5 px-8 py-6 rounded-xl"
              >
                <Link href="/how-it-works">{language === "zh" ? "了解更多" : "Learn more"}</Link>
              </Button>
            </div>
            </ScrollReveal>
          </div>
        </section>
        
        {/* Customer Reviews Section - English: premium design; Chinese: existing bilingual */}
        <div id="reviews">
          {language === "en" ? (
            <EnglishReviewSection />
          ) : (
            <CustomerReviewsSection />
          )}
        </div>
        
        {/* How It Works Section - Commented out as requested */}
        {/* <HowItWorksSection /> */}
        
      </main>
      <footer className="w-full border-t bg-background py-4 sm:py-6 md:py-8">
        <div className="container flex flex-col items-center justify-center gap-3 md:flex-row md:gap-8">
          <p className="text-center text-xs sm:text-sm leading-loose text-muted-foreground md:text-left">
            {t('copyright')}
          </p>
          <div className="flex gap-3 sm:gap-4">
            <Link href="/how-it-works" className="text-xs sm:text-sm font-medium hover:underline">
              {language === 'zh' ? '如何订阅' : 'How It Works'}
            </Link>
            <Link href="/faq" className="text-xs sm:text-sm font-medium hover:underline">
              {language === 'zh' ? '常问问题' : 'FAQ'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}


