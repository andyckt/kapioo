'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Volume2, VolumeX, Maximize2, Minimize2, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// Music video interface
interface MusicVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
}

export default function MusicPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [captchaDetected, setCaptchaDetected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [musicVideos, setMusicVideos] = useState<MusicVideo[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load music videos from localStorage
  useEffect(() => {
    const storedVideos = localStorage.getItem('musicVideos');
    if (storedVideos) {
      try {
        const videos = JSON.parse(storedVideos);
        setMusicVideos(videos);
      } catch (error) {
        console.error('Error parsing stored music videos:', error);
        // Use default video if there's an error
        setMusicVideos([{
          id: 'default',
          videoId: 'ygTZZpVkmKg',
          title: '用餐背景音乐',
          description: '舒缓的旋律将提升您的用餐体验'
        }]);
      }
    } else {
      // Use default video if none exist
      setMusicVideos([{
        id: 'default',
        videoId: 'ygTZZpVkmKg',
        title: '用餐背景音乐',
        description: '舒缓的旋律将提升您的用餐体验'
      }]);
    }
  }, []);

  // Current video getter
  const currentVideo = musicVideos.length > 0 ? 
    musicVideos[currentVideoIndex] : 
    { id: 'default', videoId: 'ygTZZpVkmKg', title: '用餐背景音乐', description: '舒缓的旋律将提升您的用餐体验' };

  // Start music playback
  const startMusic = () => {
    setIsPlaying(true);
  };

  // Handle iframe load errors
  const handleIframeError = () => {
    setCaptchaDetected(true);
  };

  // Toggle fullscreen mode for the player container
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Navigate to previous video
  const prevVideo = () => {
    if (isPlaying) {
      setCaptchaDetected(false);
      setIsPlaying(false);
      setTimeout(() => {
        setCurrentVideoIndex((prevIndex) => 
          prevIndex === 0 ? musicVideos.length - 1 : prevIndex - 1
        );
        setIsPlaying(true);
      }, 300);
    } else {
      setCurrentVideoIndex((prevIndex) => 
        prevIndex === 0 ? musicVideos.length - 1 : prevIndex - 1
      );
    }
  };

  // Navigate to next video
  const nextVideo = () => {
    if (isPlaying) {
      setCaptchaDetected(false);
      setIsPlaying(false);
      setTimeout(() => {
        setCurrentVideoIndex((prevIndex) => 
          prevIndex === musicVideos.length - 1 ? 0 : prevIndex + 1
        );
        setIsPlaying(true);
      }, 300);
    } else {
      setCurrentVideoIndex((prevIndex) => 
        prevIndex === musicVideos.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  // Handle mute/unmute with iframe
  useEffect(() => {
    if (!iframeRef.current || !isPlaying) return;
    
    // Update the iframe src with the new mute parameter
    const currentSrc = iframeRef.current.src;
    const baseUrl = currentSrc.split('?')[0];
    const params = new URLSearchParams(currentSrc.split('?')[1]);
    
    params.set('mute', isMuted ? '1' : '0');
    
    iframeRef.current.src = `${baseUrl}?${params.toString()}`;
  }, [isMuted, isPlaying]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      
      // ESC key to exit fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }

      // M key to toggle mute
      if (e.key === 'm' || e.key === 'M') {
        setIsMuted(!isMuted);
      }

      // F key to toggle fullscreen
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }

      // Left arrow key for previous video
      if (e.key === 'ArrowLeft' && musicVideos.length > 1) {
        prevVideo();
      }

      // Right arrow key for next video
      if (e.key === 'ArrowRight' && musicVideos.length > 1) {
        nextVideo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen, isMuted, musicVideos.length]);

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
          className="w-full max-w-4xl"
        >
          <Card 
            className={`w-full border-[#C2884E]/20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-all duration-500 shadow-lg hover:shadow-xl ${
              isFullscreen 
                ? 'max-w-full fixed inset-0 z-50 rounded-none overflow-auto' 
                : 'rounded-xl overflow-hidden'
            }`}
          >
            <CardHeader className={`relative transition-all duration-300 border-b border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 ${isFullscreen ? 'py-3 px-4' : 'py-5 sm:py-6 px-5 sm:px-8'}`}>
              <div className="flex items-center gap-3 mb-2">
                <motion.div 
                  whileHover={{ rotate: 10 }}
                  className="bg-[#C2884E] rounded-full p-2 text-white flex-shrink-0"
                >
                  <Music size={isFullscreen ? 18 : 20} />
                </motion.div>
                <CardTitle className="text-xl sm:text-2xl font-bold text-[#C2884E]">{currentVideo.title}</CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base text-[#D1A46C]">
                {currentVideo.description}
              </CardDescription>
              
              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-3">
                {musicVideos.length > 1 && (
                  <>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={prevVideo} 
                        className="h-9 w-9 sm:h-10 sm:w-10 text-[#C2884E] hover:text-[#C2884E] hover:bg-[#C2884E]/10"
                        title="上一个视频 (←)"
                      >
                        <ChevronLeft size={18} />
                      </Button>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={nextVideo}
                        className="h-9 w-9 sm:h-10 sm:w-10 text-[#C2884E] hover:text-[#C2884E] hover:bg-[#C2884E]/10"
                        title="下一个视频 (→)"
                      >
                        <ChevronRight size={18} />
                      </Button>
                    </motion.div>
                  </>
                )}
                
                {isPlaying && (
                  <>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsMuted(!isMuted)} 
                        className="h-9 w-9 sm:h-10 sm:w-10 text-[#C2884E] hover:text-[#C2884E] hover:bg-[#C2884E]/10"
                        title={isMuted ? "取消静音 (M)" : "静音 (M)"}
                      >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </Button>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleFullscreen}
                        className="h-9 w-9 sm:h-10 sm:w-10 text-[#C2884E] hover:text-[#C2884E] hover:bg-[#C2884E]/10"
                        title={isFullscreen ? "退出全屏 (F)" : "全屏 (F)"}
                      >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                      </Button>
                    </motion.div>
                  </>
                )}
              </div>
            </CardHeader>
            
            <CardContent className={`transition-all duration-300 ${isFullscreen ? 'p-3 sm:p-4' : 'p-5 sm:p-8'}`}>
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div
                    key={`player-${currentVideo.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div 
                      className={`relative overflow-hidden transition-all duration-500 ${
                        isFullscreen 
                          ? 'aspect-video w-full' 
                          : 'aspect-video w-full rounded-lg shadow-lg'
                      }`}
                    >
                      <iframe
                        ref={iframeRef}
                        src={`https://www.youtube-nocookie.com/embed/${currentVideo.videoId}?autoplay=1&mute=${isMuted ? '1' : '0'}&enablejsapi=1&modestbranding=1&rel=0&showinfo=0&origin=${encodeURIComponent(window.location.origin)}&hl=en&cc_load_policy=0&iv_load_policy=3&playsinline=1&controls=1`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="eager"
                        onError={handleIframeError}
                        title="音乐播放器"
                      ></iframe>
                    </div>
                    
                    {captchaDetected && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg flex items-start gap-3"
                      >
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-300">检测到验证码</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                            YouTube 可能正在显示验证。您可以尝试直接链接：
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Link 
                              href={`https://www.youtube-nocookie.com/embed/${currentVideo.videoId}?autoplay=1`} 
                              target="_blank"
                              className="text-sm font-medium text-yellow-800 dark:text-yellow-300 underline"
                            >
                              打开直接链接
                            </Link>
                            <span className="mx-2 text-yellow-600 hidden sm:inline-block">|</span>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 border-yellow-600 text-yellow-700 dark:border-yellow-500 dark:text-yellow-400"
                              onClick={() => {
                                setIsPlaying(false);
                                setCaptchaDetected(false);
                                setTimeout(() => {
                                  setIsPlaying(true);
                                }, 100);
                              }}
                            >
                              重试
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`startScreen-${currentVideo.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onHoverStart={() => setIsHovering(true)}
                    onHoverEnd={() => setIsHovering(false)}
                    className="aspect-video w-full bg-gradient-to-br from-[#fff6ef] to-white dark:from-[#332217] dark:to-gray-900 rounded-lg flex flex-col items-center justify-center shadow-lg transition-all duration-300 py-10 relative"
                  >
                    {/* Video preview image */}
                    <div className="absolute inset-0 opacity-30 z-0">
                      <img 
                        src={`https://img.youtube.com/vi/${currentVideo.videoId}/maxresdefault.jpg`}
                        alt={currentVideo.title}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          // If maxresdefault doesn't exist, try mqdefault
                          const target = e.target as HTMLImageElement;
                          target.src = `https://img.youtube.com/vi/${currentVideo.videoId}/mqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-[#fff6ef]/80 to-white/80 dark:from-[#332217]/80 dark:to-black/80 z-1"></div>
                    </div>
                    
                    {/* Video selection buttons for multiple videos */}
                    {musicVideos.length > 1 && (
                      <div className="absolute top-4 w-full flex justify-center z-10">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/70 dark:bg-black/30 backdrop-blur-sm rounded-full">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={prevVideo}
                            className="h-8 w-8 rounded-full text-[#C2884E]"
                            title="上一个视频"
                          >
                            <ChevronLeft size={16} />
                          </Button>
                          <span className="text-xs text-[#C2884E]/80">
                            {currentVideoIndex + 1} / {musicVideos.length}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={nextVideo}
                            className="h-8 w-8 rounded-full text-[#C2884E]"
                            title="下一个视频"
                          >
                            <ChevronRight size={16} />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <motion.div 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#C2884E]/10 flex items-center justify-center mb-5 relative overflow-hidden z-10"
                      animate={{ 
                        scale: isHovering ? 1.1 : 1,
                        boxShadow: isHovering ? "0 0 25px rgba(194, 136, 78, 0.3)" : "0 0 0px rgba(194, 136, 78, 0)"
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        animate={{ 
                          scale: isHovering ? 1.2 : 1
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <svg className="h-10 w-10 sm:h-12 sm:w-12 text-[#C2884E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </motion.div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="z-10"
                    >
                      <Button 
                        size="lg" 
                        onClick={startMusic}
                        className="font-medium bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#D1A46C] hover:to-[#C2884E] text-white border-none transition-all duration-300 hover:shadow-lg hover:shadow-[#C2884E]/20 px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg"
                      >
                        开始播放背景音乐
                      </Button>
                    </motion.div>
                    
                    <motion.p 
                      className="text-xs sm:text-sm text-[#C2884E]/70 dark:text-[#D1A46C]/70 mt-5 max-w-xs text-center px-4 z-10"
                      animate={{ opacity: isHovering ? 1 : 0.7 }}
                    >
                      {currentVideo.description || "舒缓的旋律将提升您的用餐体验"}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
            
            <CardFooter className={`text-xs sm:text-sm text-[#C2884E]/70 justify-center transition-opacity duration-300 border-t border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 py-4 px-5 sm:px-8 ${isFullscreen ? 'opacity-0' : 'opacity-100'}`}>
              {isPlaying ? (
                <div className="flex flex-col items-center">
                  <p className="text-center">
                    键盘快捷键: 
                    <span className="px-1.5 py-0.5 bg-[#C2884E]/10 rounded text-xs mx-1 text-[#C2884E]">M</span> 静音/取消静音, 
                    <span className="px-1.5 py-0.5 bg-[#C2884E]/10 rounded text-xs mx-1 text-[#C2884E]">F</span> 全屏切换
                    {musicVideos.length > 1 && (
                      <>
                        , <span className="px-1.5 py-0.5 bg-[#C2884E]/10 rounded text-xs mx-1 text-[#C2884E]">←</span> 上一个, 
                        <span className="px-1.5 py-0.5 bg-[#C2884E]/10 rounded text-xs mx-1 text-[#C2884E]">→</span> 下一个
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span className="text-[#C2884E]">Kapioo</span> 
                  <span className="text-[#C2884E]/50">•</span> 
                  <span>背景音乐将提升您的用餐体验</span>
                </div>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 