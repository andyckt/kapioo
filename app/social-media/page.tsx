'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

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
    <div className="flex min-h-screen items-center justify-center bg-[#fcfaf8] dark:bg-gray-950 px-4">
      <Link 
        href="/" 
        className="absolute top-8 left-8 inline-flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Back to homepage"
      >
        <Image 
          src="/未命名設計.png" 
          alt="Kapioo Logo" 
          width={24} 
          height={24} 
          className="h-6 w-6" 
          priority
        />
        <span className="text-sm font-medium text-[#C2884E]">Kapioo</span>
      </Link>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-16 md:gap-32">
        {socialLinks.map((platform) => (
          <motion.div
            key={platform.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
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
                  scale: 1.1,
                  rotate: [0, -5, 5, -3, 3, 0],
                  transition: { duration: 0.5 }
                }}
                className="relative z-10"
              >
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 overflow-hidden">
                  <Image
                    src={platform.logo}
                    alt={platform.id === "instagram" ? "Instagram logo" : "Xiaohongshu logo"}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 640px) 128px, (max-width: 768px) 160px, 192px"
                    priority
                  />
                </div>
              </motion.div>
              
              {/* Animated background effect */}
              <motion.div
                className={`absolute inset-0 rounded-full ${
                  platform.id === "instagram" 
                    ? "bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500" 
                    : "bg-gradient-to-r from-red-500 to-rose-600"
                }`}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: hoveredLogo === platform.id ? 0.15 : 0,
                  scale: hoveredLogo === platform.id ? 1.2 : 1
                }}
                transition={{ duration: 0.3 }}
                style={{ filter: "blur(20px)" }}
              />
            </Link>
          </motion.div>
        ))}
      </div>
      
      <div className="absolute bottom-6 text-center text-xs text-gray-400">
        <span className="text-[#C2884E]">Kapioo 卡皮喔</span> 
        <span className="mx-2 text-gray-300 dark:text-gray-700">•</span> 
        <span>您的健康饮食伙伴</span>
      </div>
    </div>
  );
} 