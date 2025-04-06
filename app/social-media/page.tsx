'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { MessageSquare, Download, CheckCircle } from 'lucide-react';

export default function SocialMediaPage() {
  const [downloaded, setDownloaded] = useState(false);
  const wechatId = 'Kapioo卡皮喔';
  // QR code image path
  const qrCodePath = '/WhatsApp Image 2025-04-07 at 3.45.16 AM.jpeg';

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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#fff6ef]/70 to-white/90 dark:from-[#332217]/30 dark:to-gray-950/90">
      <header className="w-full py-5 px-4 flex justify-center items-center sticky top-0 z-10 backdrop-blur-sm bg-white/60 dark:bg-gray-950/60 border-b border-[#C2884E]/10">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <Image 
            src="/未命名設計.png" 
            alt="Kapioo 标志" 
            width={42} 
            height={42} 
            className="h-[42px] w-[42px] transition-transform duration-300 group-hover:rotate-6" 
            priority
          />
          <span className="inline-block font-bold text-[#C2884E] text-2xl md:text-3xl transition-all duration-300 group-hover:tracking-wider">Kapioo</span>
        </Link>
      </header>
      
      <div className="container mx-auto px-4 sm:px-6 flex flex-1 items-center justify-center py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="w-full border-[#C2884E]/20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="text-center border-b border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 pb-6">
              <div className="flex justify-center mb-4">
                <motion.div 
                  whileHover={{ rotate: 6 }}
                  className="bg-[#C2884E] rounded-full p-3 text-white flex-shrink-0"
                >
                  <MessageSquare size={24} />
                </motion.div>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#C2884E] mb-2">关注我们的微信</CardTitle>
              <CardDescription className="text-sm sm:text-base text-[#D1A46C]">
                扫描下方二维码添加我们的微信，获取最新优惠和菜单更新
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8 flex flex-col items-center">
              <div className="relative mb-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="rounded-xl overflow-hidden border-4 border-[#C2884E]/20 shadow-lg"
                >
                  <Image 
                    src={qrCodePath}
                    alt="Kapioo 微信二维码" 
                    width={280} 
                    height={280}
                    className="w-64 h-64 sm:w-72 sm:h-72 object-contain bg-white"
                    priority
                  />
                </motion.div>
                
                <div className="absolute -bottom-3 -right-3">
                  <Image 
                    src="/未命名設計.png" 
                    alt="Kapioo 标志" 
                    width={50} 
                    height={50}
                    className="h-14 w-14 drop-shadow-md"
                  />
                </div>
              </div>
              
              <div className="w-full bg-[#C2884E]/5 dark:bg-[#C2884E]/10 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">微信号</p>
                  <p className="font-medium text-[#C2884E]">{wechatId}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQR}
                  className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10 min-w-[90px]"
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
                </Button>
              </div>
              
              <div className="text-center">
                <h3 className="font-medium text-[#C2884E] mb-2">添加方式</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <li className="flex items-center gap-2 justify-center">
                    <span className="w-5 h-5 rounded-full bg-[#C2884E]/10 flex items-center justify-center text-xs text-[#C2884E]">1</span>
                    <span>打开微信扫一扫功能</span>
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <span className="w-5 h-5 rounded-full bg-[#C2884E]/10 flex items-center justify-center text-xs text-[#C2884E]">2</span>
                    <span>扫描上方二维码</span>
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <span className="w-5 h-5 rounded-full bg-[#C2884E]/10 flex items-center justify-center text-xs text-[#C2884E]">3</span>
                    <span>点击"添加到通讯录"</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            
            <CardFooter className="text-xs sm:text-sm text-[#C2884E]/70 justify-center border-t border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 py-4 px-6">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-[#C2884E]">Kapioo 卡皮喔</span> 
                <span className="text-[#C2884E]/50">•</span> 
                <span>您的健康饮食伙伴</span>
                <span className="text-[#C2884E]/50">•</span>
                <Link href="/" className="text-[#C2884E] hover:underline">
                  返回主页
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 