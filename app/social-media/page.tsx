'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, X, Download, CheckCircle } from 'lucide-react';

export default function SocialMediaPage() {
  const [hoveredLogo, setHoveredLogo] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const qrCodePath = '/KapiooWeChatQRcode.JPG';
  const wechatId = 'Kapioo卡皮喔';

  const socialLinks = [
    {
      id: "instagram",
      url: "https://www.instagram.com/kapioo_official/?igsh=NzR3cWF0YWU5cjZk",
      logo: "/instagram.svg",
      ariaLabel: "Visit our Instagram page",
      title: "Instagram",
      description: "Follow us for beautiful food photos and daily updates"
    },
    {
      id: "xiaohongshu",
      url: "https://www.xiaohongshu.com/user/profile/66ad59e5000000001d0303d8?xsec_token=ABdcazfEV_I7ZnKK-qYVq8RyEXTqmw8Dtv2AguBABFh6w=&xsec_source=pc_search",
      logo: "/XiaohongshuLOGO (1).svg",
      ariaLabel: "Visit our Xiaohongshu (Redbook) page",
      title: "小红书",
      description: "查看我们的食谱和美食分享"
    },
    {
      id: "wechat",
      url: "#",
      logo: "/wechat-logo.svg",
      ariaLabel: "View our WeChat QR code",
      title: "WeChat",
      description: "Scan our QR code to follow us on WeChat",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setShowQRCode(true);
      }
    }
  ];

  // Function to close popup
  const closeQRPopup = () => {
    setShowQRCode(false);
  };

  // Close popup when clicking outside or pressing escape
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowQRCode(false);
      }
    };

    if (showQRCode) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [showQRCode]);

  // Download QR code
  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodePath;
    link.download = 'Kapioo-微信二维码.jpeg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaf8] to-[#FBF7F2] dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link 
            href="/" 
            className="flex items-center gap-2 group mr-4"
          >
            <div className="rounded-full bg-[#C2884E]/10 p-1">
              <ArrowLeft className="h-4 w-4 text-[#C2884E]" />
            </div>
            <span className="text-sm font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors">
              Back to Home
            </span>
          </Link>
          <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center gap-2 group">
              <Image 
                src="/未命名設計.png" 
                alt="Kapioo Logo" 
                width={32} 
                height={32} 
                className="h-8 w-8 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" 
              />
              <span className="inline-block font-bold text-[#C2884E] text-lg transition-all duration-300 group-hover:scale-105 group-hover:tracking-wider">Kapioo</span>
            </Link>
          </div>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main content */}
      <main className="container py-12 px-4">
        {/* Title section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C] mb-4">
              Follow Kapioo on Social Media
            </h1>
            <p className="text-[#6B5F53] max-w-2xl mx-auto">
              Stay connected with us for the latest updates, special offers, and delicious food inspiration. Join our community on your favorite platforms.
            </p>
          </motion.div>
        </div>

        {/* Social platforms */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {socialLinks.map((platform, index) => (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 100, 
                damping: 20,
                delay: index * 0.2
              }}
              className="relative"
              onHoverStart={() => setHoveredLogo(platform.id)}
              onHoverEnd={() => setHoveredLogo(null)}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#C2884E]/10 shadow-lg shadow-[#C2884E]/5 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="p-6 flex flex-col items-center">
                  {platform.id === "wechat" ? (
                    <button
                      onClick={(e) => platform.onClick && platform.onClick(e)}
                      aria-label={platform.ariaLabel}
                      className="focus:outline-none"
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
                        <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40">
                          <Image
                            src={platform.logo}
                            alt={`${platform.title} logo`}
                            fill
                            className="object-contain transition-all duration-300 ease-in-out"
                            sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
                            priority
                          />
                        </div>
                      </motion.div>
                    </button>
                  ) : (
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
                        <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40">
                          <Image
                            src={platform.logo}
                            alt={`${platform.title} logo`}
                            fill
                            className="object-contain transition-all duration-300 ease-in-out"
                            sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
                            priority
                          />
                        </div>
                      </motion.div>
                    </Link>
                  )}
                  
                  <h2 className="mt-6 text-xl font-semibold text-[#C2884E]">{platform.title}</h2>
                  <p className="mt-2 text-sm text-[#6B5F53] text-center">{platform.description}</p>
                  
                  <div className="mt-6">
                    {platform.id === "wechat" ? (
                      <button
                        onClick={(e) => platform.onClick && platform.onClick(e)}
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white font-medium text-sm hover:shadow-md transition-shadow"
                      >
                        View QR Code
                      </button>
                    ) : (
                      <Link
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white font-medium text-sm hover:shadow-md transition-shadow inline-block"
                      >
                        Follow Us
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* WeChat QR Code Popup */}
      <AnimatePresence>
        {showQRCode && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black"
              onClick={closeQRPopup}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative z-[101] w-full max-w-md"
            >
              <div className="relative bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl border border-[#C2884E]/20">
                <button 
                  onClick={closeQRPopup}
                  className="absolute top-3 right-3 text-gray-400 hover:text-[#C2884E] transition-colors z-10"
                >
                  <X size={24} />
                </button>

                <div className="text-center">
                  <h3 className="text-xl font-bold text-[#C2884E] mb-1">关注我们的微信</h3>
                  <p className="text-sm text-[#6B5F53] mb-6">扫描二维码添加我们的微信</p>

                  <div className="relative mx-auto mb-6 w-[280px] h-[280px]">
                    <div className="rounded-xl overflow-hidden border-4 border-[#C2884E]/20 shadow-lg">
                      <Image 
                        src="/KapiooWeChatQRcode.JPG"
                        alt="Kapioo WeChat QR code" 
                        width={280} 
                        height={280}
                        className="w-full h-full object-cover"
                        priority
                      />
                    </div>
                  </div>

                  <div className="bg-[#C2884E]/5 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-500">微信号</p>
                    <p className="font-medium text-[#C2884E]">{wechatId}</p>
                  </div>

                  <div className="w-full bg-[#C2884E]/5 dark:bg-[#C2884E]/10 rounded-lg p-4 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">保存二维码</p>
                      <p className="font-medium text-[#C2884E]">下载到手机</p>
                    </div>
                    <button
                      onClick={downloadQR}
                      className="border border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10 min-w-[90px] py-1.5 px-3 rounded-md text-sm font-medium flex items-center justify-center transition-colors"
                    >
                      {downloaded ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          已保存
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          保存图片
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
} 