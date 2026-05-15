'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Globe } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SocialMediaLeadLanguageGate } from '@/components/social-media-lead-language-gate';
import { useLanguage } from '@/lib/language-context';

// Typing animation component
function TypingAnimation({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 100); // Speed of typing
      
      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, text]);

  return (
    <div className="relative mx-auto mt-3 min-h-[2.85rem] w-full max-w-md px-1 text-center sm:mt-4 sm:min-h-[3.25rem]">
      <motion.span 
        className="inline-block text-balance text-base font-light leading-snug tracking-wide text-[#6B5F53] sm:text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {displayedText}
        {!isComplete && (
          <span className="inline-block w-1 h-5 ml-0.5 bg-[#C2884E]/70 animate-pulse" />
        )}
      </motion.span>
    </div>
  );
}

type ExternalSocialItem = {
  kind: 'external'
  id: string
  url: string
  logo: string
  ariaLabelZh: string
  ariaLabelEn: string
  altZh: string
  altEn: string
}

type HomepageSocialItem = {
  kind: 'homepage'
  id: string
  href: string
  ariaLabelZh: string
  ariaLabelEn: string
  labelZh: string
  labelEn: string
}

type SocialItem = ExternalSocialItem | HomepageSocialItem

export default function SocialMediaPage() {
  const { language, t } = useLanguage()

  /** Order left → right: Instagram | 官网主页 | Xiaohongshu */
  const socialLinks: SocialItem[] = [
    {
      kind: 'external',
      id: 'instagram',
      url: 'https://www.instagram.com/kapioo_official/?igsh=NzR3cWF0YWU5cjZk',
      logo: '/instagram.svg',
      ariaLabelZh: '访问 Kapioo Instagram',
      ariaLabelEn: 'Visit Kapioo on Instagram',
      altZh: 'Instagram',
      altEn: 'Instagram',
    },
    {
      kind: 'homepage',
      id: 'homepage',
      href: '/',
      ariaLabelZh: '访问 Kapioo 官网浏览菜单',
      ariaLabelEn: 'Visit Kapioo homepage to browse the menu',
      labelZh: '官网查阅菜单',
      labelEn: 'Browse menu on our site',
    },
    {
      kind: 'external',
      id: 'xiaohongshu',
      url:
        'https://www.xiaohongshu.com/user/profile/66ad59e5000000001d0303d8?xsec_token=ABdcazfEV_I7ZnKK-qYVq8RyEXTqmw8Dtv2AguBABFh6w=&xsec_source=pc_search',
      logo: '/XiaohongshuLOGO (1).svg',
      ariaLabelZh: '访问 Kapioo 小红书',
      ariaLabelEn: 'Visit Kapioo on Xiaohongshu (Rednote)',
      altZh: '小红书标志',
      altEn: 'Xiaohongshu logo',
    },
  ]

  return (
    <div className="relative flex min-h-[100dvh] min-h-[100svh] w-full flex-col bg-[#fcfaf8] text-[#382f29] dark:bg-gray-950">
      {/* Full-bleed background (avoids white gap when bouncing / overscroll on mobile) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-[1] bg-[#fcfaf8] dark:bg-gray-950" />

      <div className="relative flex min-h-[100dvh] min-h-[100svh] w-full flex-col items-center overflow-x-hidden px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+5.75rem)] max-sm:pb-[max(env(safe-area-inset-bottom),3.5rem)] sm:justify-center sm:pt-[max(8rem,min(26vh,10rem))] md:pt-24">
      <SocialMediaLeadLanguageGate />
      <div className="absolute right-3 top-3 z-30 sm:right-5 sm:top-5">
        <div className="rounded-xl border border-[#E8DDD4]/90 bg-[#FFFCFA]/95 shadow-sm backdrop-blur-sm [&_button]:h-11 [&_button]:w-11 [&_button]:rounded-lg [&_svg]:text-[#6B5346]">
          <LanguageSwitcher alwaysShow />
        </div>
      </div>
      {/* Brand icon background elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Large semi-transparent brand icon in bottom right */}
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] opacity-[0.03]">
          <Image 
            src="/未命名設計.png" 
            alt="Kapioo Logo Background" 
            fill
            className="object-contain"
          />
        </div>
        
        {/* Smaller brand icon in top left */}
        <div className="absolute -top-10 -left-10 w-[300px] h-[300px] opacity-[0.02] rotate-12">
          <Image 
            src="/未命名設計.png" 
            alt="Kapioo Logo Background" 
            fill
            className="object-contain"
          />
        </div>
        
        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #C2884E 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        ></div>
      </div>

      {/* Company Logo at top center with text */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-4 mt-0 flex flex-col items-center max-sm:pt-1 sm:mb-10 sm:mt-4 lg:mt-8"
      >
        <Link href="/" className="group flex items-center gap-3">
          <motion.div
            whileHover={{ 
              scale: 1.1,
              rotate: 6,
              transition: { 
                type: "spring", 
                stiffness: 300,
                damping: 15 
              }
            }}
            className="relative"
          >
            <Image 
              src="/未命名設計.png" 
              alt="Kapioo Logo" 
              width={56} 
              height={56}
              className="h-14 w-14 drop-shadow-lg transition-all duration-300 sm:h-[70px] sm:w-[70px]"
              priority
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#C2884E]/5 to-[#D1A46C]/10 opacity-0 group-hover:opacity-70 transition-opacity duration-500 animate-pulse"></div>
          </motion.div>
          <span className="text-xl font-bold text-[#C2884E] transition-all duration-300 group-hover:tracking-wider sm:text-2xl">Kapioo</span>
        </Link>
        
        {/* Typing animation */}
        <TypingAnimation key={language} text={t('subSlogan')} />
      </motion.div>

      <div className="z-10 mt-8 flex w-full max-w-sm flex-col items-center justify-center gap-5 max-sm:gap-[1.125rem] sm:mt-14 sm:max-w-none sm:flex-row sm:flex-nowrap sm:gap-12 md:gap-24 lg:gap-32">
        {socialLinks.map((platform) => {
          const delay =
            platform.id === 'instagram' ? 0.1 : platform.id === 'homepage' ? 0.22 : 0.34

          if (platform.kind === 'homepage') {
            const ariaLabel =
              language === 'zh' ? platform.ariaLabelZh : platform.ariaLabelEn
            const label = language === 'zh' ? platform.labelZh : platform.labelEn
            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 25,
                  delay,
                }}
                className="relative order-2 sm:order-2"
              >
                <Link
                  href={platform.href}
                  aria-label={ariaLabel}
                  className="group relative outline-none focus-visible:ring-2 focus-visible:ring-[#C2884E]/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcfaf8] rounded-[1.875rem]"
                >
                  <motion.div
                    whileHover={{
                      scale: 1.03,
                      y: -4,
                      transition: {
                        type: 'spring',
                        stiffness: 320,
                        damping: 22,
                      },
                    }}
                    className="relative flex flex-col items-center gap-2 sm:flex-row sm:gap-6"
                  >
                    {/* Squircle — smaller on narrow phones so three tiles fit */}
                    <div className="relative isolate flex size-[6.375rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border border-[#CBB69A]/70 bg-gradient-to-br from-[#FFFCFA] via-[#FFFAF8] to-[#F9F4EF] shadow-[0_12px_32px_-18px_rgba(74,61,53,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] ring-1 ring-white/85 transition-[box-shadow,border-color,background-color] duration-300 ease-out group-hover:border-[#C9A068]/92 group-hover:shadow-[0_18px_42px_-20px_rgba(194,136,78,0.28),0_8px_20px_-14px_rgba(74,61,53,0.14),inset_0_1px_0_rgba(255,255,255,1)] sm:h-36 sm:w-36 sm:rounded-[1.875rem] md:h-44 md:w-44">
                      <span
                        className="pointer-events-none absolute inset-x-4 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent opacity-95"
                        aria-hidden
                      />
                      <span
                        className="pointer-events-none absolute -top-14 left-1/2 z-0 h-28 w-28 -translate-x-1/2 rounded-full bg-[#C2884E]/10 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
                        aria-hidden
                      />
                      <Globe
                        className="relative z-[1] size-[2.625rem] text-[#8E6B45] transition-[color,filter] duration-300 ease-out group-hover:text-[#B07845] sm:size-[5rem] md:size-[5.75rem]"
                        strokeWidth={1.72}
                        aria-hidden
                      />
                    </div>

                    <div className="flex max-w-[11rem] flex-col items-center gap-2 text-center sm:max-w-[15rem] sm:items-start sm:gap-3 sm:text-left">
                      <span
                        className={`text-sm font-semibold leading-snug text-[#382f29] antialiased sm:text-[0.9375rem] md:text-lg md:leading-snug ${
                          language === 'zh' ? 'tracking-[0.03em]' : 'tracking-[-0.02em]'
                        }`}
                        lang={language === 'zh' ? 'zh' : 'en'}
                      >
                        {label}
                      </span>
                      <span
                        className={`pointer-events-none mt-1 h-[3px] w-12 rounded-full bg-gradient-to-r from-[#c9a26c]/35 via-[#C2884E] to-[#d4b089]/35 transition-[width,opacity] duration-300 ease-out group-hover:w-[4.25rem] group-hover:opacity-100 md:h-0.5 ${language === 'zh' ? 'max-sm:mx-auto' : 'opacity-80'}`}
                        aria-hidden
                      />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            )
          }

          const ext = platform
          const ariaLabelSocial =
            language === 'zh' ? ext.ariaLabelZh : ext.ariaLabelEn
          const altSocial = language === 'zh' ? ext.altZh : ext.altEn

          return (
            <motion.div
              key={ext.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 25,
                delay,
              }}
              className={
                ext.id === 'instagram'
                  ? 'relative order-3 sm:order-1'
                  : 'relative order-1 sm:order-3'
              }
            >
              <Link
                href={ext.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={ariaLabelSocial}
              >
                <motion.div
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                    transition: {
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                      duration: 0.4,
                    },
                  }}
                  className="relative"
                >
                  <div className="relative size-[6.375rem] sm:h-36 sm:w-36 md:h-44 md:w-44">
                    <Image
                      src={ext.logo}
                      alt={altSocial}
                      fill
                      className="object-contain transition-all duration-300 ease-in-out"
                      sizes="(max-width: 639px) 96px, (max-width: 768px) 144px, 176px"
                      priority={ext.id === 'instagram'}
                    />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          )
        })}
      </div>
      </div>
    </div>
  );
} 