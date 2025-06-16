'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

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
    <div className="relative h-8 mt-4">
      <motion.span 
        className="text-[#6B5F53] text-lg font-light tracking-wider"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {displayedText}
        {!isComplete && (
          <motion.span
            className="inline-block w-1 h-5 ml-0.5 bg-[#C2884E]/70"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.span>
    </div>
  );
}

export default function SocialMediaPage() {
  const [hoveredLogo, setHoveredLogo] = useState<string | null>(null);

  const socialLinks = [
    {
      id: "instagram",
      url: "https://www.instagram.com/kapioo_official/?igsh=NzR3cWF0YWU5cjZk",
      logo: "/instagram.svg",
      ariaLabel: "Visit our Instagram page"
    },
    {
      id: "xiaohongshu",
      url: "https://www.xiaohongshu.com/user/profile/66ad59e5000000001d0303d8?xsec_token=ABdcazfEV_I7ZnKK-qYVq8RyEXTqmw8Dtv2AguBABFh6w=&xsec_source=pc_search",
      logo: "/XiaohongshuLOGO (1).svg",
      ariaLabel: "Visit our Xiaohongshu (Redbook) page"
    }
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fcfaf8] dark:bg-gray-950 px-4 relative overflow-hidden">
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
        <TypingAnimation text="让你每天拥有「被好好对待」的时刻" />
      </motion.div>

      <div className="flex flex-row items-center justify-center gap-8 sm:gap-16 md:gap-32 z-10 mt-8">
        {socialLinks.map((platform) => (
          <motion.div
            key={platform.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 25,
              delay: platform.id === "instagram" ? 0.1 : 0.3
            }}
            className="relative"
            onHoverStart={() => setHoveredLogo(platform.id)}
            onHoverEnd={() => setHoveredLogo(null)}
          >
            <Link 
              href={platform.url} 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label={platform.ariaLabel}
            >
              <motion.div
                whileHover={{ 
                  scale: 1.05,
                  y: -5,
                  transition: { 
                    type: "spring", 
                    stiffness: 300,
                    damping: 15,
                    duration: 0.4 
                  }
                }}
                className="relative"
              >
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-48 md:h-48">
                  <Image
                    src={platform.logo}
                    alt={platform.id === "instagram" ? "Instagram logo" : "Xiaohongshu logo"}
                    fill
                    className="object-contain transition-all duration-300 ease-in-out"
                    sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 192px"
                    priority
                  />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 