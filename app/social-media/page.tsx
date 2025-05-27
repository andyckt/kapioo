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
      <div className="flex flex-col md:flex-row items-center justify-center gap-16 md:gap-32">
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
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48">
                  <Image
                    src={platform.logo}
                    alt={platform.id === "instagram" ? "Instagram logo" : "Xiaohongshu logo"}
                    fill
                    className="object-contain transition-all duration-300 ease-in-out"
                    sizes="(max-width: 640px) 128px, (max-width: 768px) 160px, 192px"
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