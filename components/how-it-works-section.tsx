"use client"

import { CreditCard, Calendar, Truck, X, Download, CheckCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

export default function HowItWorksSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const qrCodePath = '/KapiooWeChatQRcode.JPG'
  const wechatId = 'Kapioo卡皮喔'

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

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
    },
    {
      id: "wechat",
      url: "#",
      logo: "/wechat-logo.svg",
      ariaLabel: "View our WeChat QR code",
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
    const link = document.createElement('a')
    link.href = qrCodePath
    link.download = 'Kapioo-微信二维码.jpeg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  const steps = [
    {
      number: "01",
      icon: CreditCard,
      title: "充值餐券",
      subtitle: "Top up meal vouchers",
      description: "Kapioo采用【先购餐券，送一餐扣一餐】的灵活订阅模式",
      subdescription: "请通过以下任一客服渠道进行餐券购买",
      delay: "0ms",
    },
    {
      number: "02",
      icon: Calendar,
      title: "安排你的送餐日程",
      subtitle: "Schedule your delivery",
      description: "每天从中央厨房统一制作出餐，当天配送当天餐食",
      subdescription: "根据你的需求，选择每周需要餐食的日期（例如：周一，二，四，五需要）",
      delay: "200ms",
    },
    {
      number: "03",
      icon: Truck,
      title: "新鲜送达 开启你的松弛美好时刻",
      subtitle: "Fresh delivery & enjoy your relaxing moments",
      description: "你选择的日期，我们都会出现。收到新鲜餐食，享受你的餐食",
      subdescription: "享受「被好好对待」的时刻",
      delay: "400ms",
    },
  ]

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gradient-to-b from-[#FBF7F2] to-white overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-40 left-[5%] w-[400px] h-[400px] bg-gradient-to-tr from-[#C2884E]/5 to-transparent rounded-full blur-[80px]"></div>
        <div className="absolute bottom-40 right-[5%] w-[500px] h-[500px] bg-gradient-to-bl from-[#C2884E]/5 to-transparent rounded-full blur-[100px]"></div>
        
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <div
            className={`inline-block transition-all duration-1000 ease-out ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center justify-center mb-4">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full"></div>
              <div className="px-4 py-1 mx-3 bg-[#C2884E]/5 rounded-full">
                <span className="text-sm font-medium text-[#C2884E]">如何订阅</span>
              </div>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full"></div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-light mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                How Kapioo
              </span>
              <span className="block font-extralight text-[#6B5F53]">Meal Plan Works</span>
            </h2>
            <div className="w-16 h-0.5 bg-gradient-to-r from-[#C2884E]/20 to-[#D1A46C]/60 mx-auto"></div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {steps.map((step, index) => {
            const IconComponent = step.icon
            const isEven = index % 2 === 0

            return (
              <div
                key={index}
                className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 transition-all duration-1000 ease-out ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                } ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"}`}
                style={{ transitionDelay: isVisible ? step.delay : "0ms" }}
              >
                {/* Content */}
                <div className={`flex-1 ${isEven ? "lg:text-left" : "lg:text-right"} text-center`}>
                  <div className="group cursor-default">
                    <div className={`flex items-center gap-4 mb-6 justify-center ${isEven ? "lg:justify-start" : "lg:justify-end"}`}>
                      <span className="text-6xl font-extralight text-[#C2884E]/20 group-hover:text-[#C2884E]/30 transition-colors duration-500">
                        {step.number}
                      </span>
                      <div className="w-px h-12 bg-[#C2884E]/20 group-hover:bg-[#C2884E]/30 transition-colors duration-500"></div>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-light text-[#6B5F53] mb-2 group-hover:text-[#C2884E] transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-sm font-medium text-[#C2884E]/70 tracking-wide uppercase mb-6">{step.subtitle}</p>

                    <div className="space-y-3 max-w-md mx-auto lg:mx-0">
                      <p className="text-[#6B5F53] leading-relaxed font-light">{step.description}</p>
                      <p className="text-sm text-[#6B5F53]/80 leading-relaxed">{step.subdescription}</p>
                      
                      {/* Social Media Icons - Only for the first step */}
                      {index === 0 && (
                        <div className={`flex gap-4 mt-4 ${isEven ? "lg:justify-start" : "lg:justify-end"} justify-center`}>
                          {socialLinks.map((platform) => (
                            <Link 
                              key={platform.id}
                              href={platform.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              aria-label={platform.ariaLabel}
                              className="group/icon transition-all duration-300 hover:scale-110"
                              onClick={platform.onClick}
                            >
                              <div className="w-8 h-8 relative overflow-hidden">
                                <Image
                                  src={platform.logo}
                                  alt={platform.id === "instagram" ? "Instagram logo" : platform.id === "xiaohongshu" ? "Xiaohongshu logo" : "WeChat logo"}
                                  fill
                                  className="object-contain"
                                  sizes="32px"
                                />
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white to-[#FBF7F2] flex items-center justify-center border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-500 group-hover:shadow-xl group-hover:scale-105">
                      <IconComponent className="w-12 h-12 text-[#C2884E] group-hover:text-[#C2884E] transition-colors duration-300" />
                    </div>

                    {/* Floating animation */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#C2884E]/5 to-[#D1A46C]/10 opacity-0 group-hover:opacity-70 transition-opacity duration-500 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Call to action */}
        <div
          className={`text-center mt-24 transition-all duration-1000 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: isVisible ? "600ms" : "0ms" }}
        >
          <Link 
            href="/login" 
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white rounded-full font-light tracking-wide hover:shadow-lg hover:shadow-[#C2884E]/20 transition-all duration-300 hover:scale-105"
          >
            <span>开始订阅 Kapioo</span>
            <span className="text-xs opacity-70 group-hover:opacity-100 transition-opacity">Start Your Journey</span>
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

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
                    
                    <div className="absolute -bottom-3 -right-3">
                      <Image 
                        src="/未命名設計.png" 
                        alt="Kapioo logo" 
                        width={50} 
                        height={50}
                        className="h-14 w-14 drop-shadow-md"
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
    </section>
  )
}