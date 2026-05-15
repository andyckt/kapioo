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
    <div className="relative mx-auto mt-4 min-h-[3.25rem] w-full max-w-md px-1 text-center">
      <motion.span 
        className="inline-block text-balance text-[#6B5F53] text-lg font-light leading-snug tracking-wide"
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fcfaf8] dark:bg-gray-950 px-4 relative overflow-hidden">
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
        className="mb-8 mt-8 flex flex-col items-center"
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
              width={70} 
              height={70}
              className="drop-shadow-lg transition-all duration-300"
              priority
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#C2884E]/5 to-[#D1A46C]/10 opacity-0 group-hover:opacity-70 transition-opacity duration-500 animate-pulse"></div>
          </motion.div>
          <span className="font-bold text-[#C2884E] text-2xl transition-all duration-300 group-hover:tracking-wider">Kapioo</span>
        </Link>
        
        {/* Typing animation */}
        <TypingAnimation key={language} text={t('subSlogan')} />
      </motion.div>

      <div className="z-10 mt-8 flex flex-col items-center justify-center gap-10 sm:flex-row sm:flex-nowrap sm:gap-12 md:gap-24 lg:gap-32">
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
                    className="relative flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
                  >
                    {/* Squircle with soft depth — still minimal, richer on hover */}
                    <div className="relative isolate flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[1.875rem] border border-[#CBB69A]/70 bg-gradient-to-br from-[#FFFCFA] via-[#FFFAF8] to-[#F9F4EF] shadow-[0_12px_32px_-18px_rgba(74,61,53,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] ring-1 ring-white/85 transition-[box-shadow,border-color,background-color] duration-300 ease-out group-hover:border-[#C9A068]/92 group-hover:shadow-[0_18px_42px_-20px_rgba(194,136,78,0.28),0_8px_20px_-14px_rgba(74,61,53,0.14),inset_0_1px_0_rgba(255,255,255,1)] sm:h-36 sm:w-36 md:h-48 md:w-48">
                      <span
                        className="pointer-events-none absolute inset-x-4 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent opacity-95"
                        aria-hidden
                      />
                      <span
                        className="pointer-events-none absolute -top-14 left-1/2 z-0 h-28 w-28 -translate-x-1/2 rounded-full bg-[#C2884E]/10 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
                        aria-hidden
                      />
                      <Globe
                        className="relative z-[1] size-[4rem] text-[#8E6B45] transition-[color,filter] duration-300 ease-out group-hover:text-[#B07845] sm:size-[5rem] md:size-[6rem]"
                        strokeWidth={1.72}
                        aria-hidden
                      />
                    </div>

                    <div className="flex max-w-[12.5rem] flex-col items-center gap-3 text-center sm:max-w-[15rem] sm:items-start sm:text-left">
                      <span
                        className={`text-[0.9375rem] font-semibold leading-snug text-[#382f29] antialiased md:text-lg md:leading-snug ${
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
                  <div className="relative h-32 w-32 sm:h-36 sm:w-36 md:h-48 md:w-48">
                    <Image
                      src={ext.logo}
                      alt={altSocial}
                      fill
                      className="object-contain transition-all duration-300 ease-in-out"
                      sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 192px"
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
  );
} 