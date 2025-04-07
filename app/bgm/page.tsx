'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, VolumeX, RotateCcw, Music, RefreshCw, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface MusicVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
}

export default function BGMPage() {
  const [musicVideos, setMusicVideos] = useState<MusicVideo[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      
      // Load from localStorage first for immediate display
      const storedVideos = localStorage.getItem('musicVideos');
      try {
        if (storedVideos) {
          const parsedVideos = JSON.parse(storedVideos);
          if (parsedVideos && parsedVideos.length > 0) {
            setMusicVideos(parsedVideos);
          } else {
            initializeDefaultVideo();
          }
        } else {
          initializeDefaultVideo();
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        initializeDefaultVideo();
      }
      
      // In a real app, you would check for server updates here
      await simulateServerSync();
      
      setLoading(false);
    };
    
    loadVideos();
  }, []);
  
  // Try to unmute after the player loads
  useEffect(() => {
    if (playerRef.current && playerRef.current.contentWindow) {
      // Try to unmute after a short delay to allow the player to initialize
      const timer = setTimeout(() => {
        try {
          playerRef.current?.contentWindow?.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          setIsMuted(false);
          
          // Ensure the video is playing initially
          playerRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          setIsPlaying(true);
        } catch (error) {
          console.error('Could not initialize player state:', error);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  // Simulate server synchronization (would be a real API call in production)
  const simulateServerSync = async () => {
    setSyncing(true);
    
    try {
      // Fetch from API
      const response = await fetch('/api/music-videos');
      
      if (response.ok) {
        const serverVideos = await response.json();
        if (serverVideos && serverVideos.length > 0) {
          setMusicVideos(serverVideos);
          localStorage.setItem('musicVideos', JSON.stringify(serverVideos));
        }
      } else {
        console.error('Error fetching from server:', await response.text());
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  // Force sync with "server" (simulated)
  const forceSyncWithServer = async () => {
    setSyncing(true);
    setMessage('正在同步音乐数据...');
    
    try {
      // Fetch from API
      const response = await fetch('/api/music-videos');
      
      if (response.ok) {
        const serverVideos = await response.json();
        if (serverVideos && serverVideos.length > 0) {
          setMusicVideos(serverVideos);
          localStorage.setItem('musicVideos', JSON.stringify(serverVideos));
          setMessage('音乐数据已同步');
          setTimeout(() => setMessage(''), 2000);
        } else {
          // If server has no videos, we'll use what's in localStorage
          const storedVideos = localStorage.getItem('musicVideos');
          if (storedVideos) {
            try {
              const parsedVideos = JSON.parse(storedVideos);
              if (parsedVideos && parsedVideos.length > 0) {
                // Save back to server to initialize it
                await fetch('/api/music-videos', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: storedVideos,
                });
                setMessage('已将本地音乐数据同步到服务器');
                setTimeout(() => setMessage(''), 2000);
              } else {
                initializeDefaultVideo();
                setMessage('已恢复默认音乐');
                setTimeout(() => setMessage(''), 2000);
              }
            } catch (error) {
              console.error('Error parsing stored videos:', error);
              initializeDefaultVideo();
              setMessage('已恢复默认音乐');
              setTimeout(() => setMessage(''), 2000);
            }
          } else {
            setMessage('服务器上没有音乐数据，已恢复默认设置');
            initializeDefaultVideo();
            setTimeout(() => setMessage(''), 2000);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Error fetching from server:', errorText);
        setMessage('同步失败：' + (errorText || '未知错误'));
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
      setMessage('同步失败，使用本地数据');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setSyncing(false);
    }
  };

  const initializeDefaultVideo = () => {
    const defaultVideo: MusicVideo = {
      id: 'default',
      videoId: 'ygTZZpVkmKg',
      title: '用餐背景音乐',
      description: '舒缓的旋律将提升您的用餐体验'
    };
    setMusicVideos([defaultVideo]);
    localStorage.setItem('musicVideos', JSON.stringify([defaultVideo]));
  };

  const toggleMute = () => {
    if (playerRef.current && playerRef.current.contentWindow) {
      // Send message to the YouTube iframe to toggle mute
      try {
        if (isMuted) {
          playerRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        } else {
          playerRef.current.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
        }
        setIsMuted(!isMuted);
      } catch (error) {
        console.error('Error toggling mute:', error);
      }
    }
  };

  const nextVideo = () => {
    if (musicVideos.length > 1) {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % musicVideos.length);
      
      // Set playing state to true when changing videos
      setIsPlaying(true);
      
      // Need to reset the mute state after the iframe reloads
      setTimeout(() => {
        if (playerRef.current && playerRef.current.contentWindow) {
          try {
            if (!isMuted) {
              playerRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            }
            // Ensure video is playing after changing
            playerRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          } catch (error) {
            console.error('Error restoring player state after track change:', error);
          }
        }
      }, 500);
    }
  };

  const prevVideo = () => {
    if (musicVideos.length > 1) {
      setCurrentVideoIndex((prevIndex) => (prevIndex - 1 + musicVideos.length) % musicVideos.length);
      
      // Set playing state to true when changing videos
      setIsPlaying(true);
      
      // Need to reset the mute state after the iframe reloads
      setTimeout(() => {
        if (playerRef.current && playerRef.current.contentWindow) {
          try {
            if (!isMuted) {
              playerRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            }
            // Ensure video is playing after changing
            playerRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          } catch (error) {
            console.error('Error restoring player state after track change:', error);
          }
        }
      }, 500);
    }
  };

  const resetPlayer = () => {
    if (playerRef.current && playerRef.current.contentWindow) {
      try {
        // Send message to the YouTube iframe to reset the video
        playerRef.current.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[0, true]}', '*');
        
        // Ensure the video is playing and unmuted after reset
        playerRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        if (isMuted) {
          playerRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          setIsMuted(false);
        }
        
        // Update playing state
        setIsPlaying(true);
      } catch (error) {
        console.error('Error resetting player:', error);
      }
    }
  };

  // Stop/pause the playing video
  const togglePlayPause = () => {
    if (playerRef.current && playerRef.current.contentWindow) {
      try {
        if (isPlaying) {
          // Pause the video
          playerRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          setIsPlaying(false);
        } else {
          // Play the video
          playerRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error toggling play/pause:', error);
      }
    }
  };

  const currentVideo = musicVideos[currentVideoIndex] || {
    id: 'default',
    videoId: 'ygTZZpVkmKg', 
    title: '用餐背景音乐',
    description: '舒缓的旋律将提升您的用餐体验'
  };

  // Keep track of changes to the current video to handle mute state
  useEffect(() => {
    // Only run this effect if we have a player ref and we're not loading
    if (playerRef.current && playerRef.current.contentWindow && !loading) {
      // Short delay to let the new video load
      const timer = setTimeout(() => {
        try {
          // If we should be unmuted, make sure we restore that state
          if (!isMuted) {
            playerRef.current?.contentWindow?.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          }
          
          // Ensure the video keeps playing if it should be playing
          if (isPlaying) {
            playerRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
        } catch (error) {
          console.error('Could not set player state after video change:', error);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentVideoIndex, loading, isMuted, isPlaying]);

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

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 flex flex-col py-8 md:py-12 flex-grow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex-grow flex flex-col"
        >
          <Card className="w-full border-[#C2884E]/20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg flex-grow flex flex-col">
            <CardHeader className="border-b border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#C2884E] rounded-full p-2 text-white flex-shrink-0">
                    <Music size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-[#C2884E]">背景音乐</CardTitle>
                    <CardDescription className="text-sm sm:text-base text-[#D1A46C]">
                      享受舒适的用餐氛围
                    </CardDescription>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceSyncWithServer}
                  disabled={syncing}
                  className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      同步数据
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-5 sm:p-8 flex-grow flex flex-col">
              {/* Message */}
              <AnimatePresence>
                {message && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-800 dark:text-blue-300"
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
            
              {/* Video selection for mobile */}
              {musicVideos.length > 1 && (
                <div className="mb-5 flex flex-wrap gap-2 md:hidden">
                  <p className="w-full text-sm text-[#C2884E] mb-2">选择音乐:</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 w-full flex-nowrap">
                    {musicVideos.map((video, index) => (
                      <button
                        key={video.id}
                        onClick={() => setCurrentVideoIndex(index)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          currentVideoIndex === index
                            ? 'bg-[#C2884E] text-white'
                            : 'bg-[#C2884E]/10 text-[#C2884E]'
                        }`}
                      >
                        {video.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            
              <div className="flex flex-col md:flex-row gap-6 flex-grow">
                {/* Video Player */}
                <div className="w-full md:w-2/3 flex flex-col">
                  {loading ? (
                    <div className="flex-grow flex justify-center items-center bg-black/5 dark:bg-black/20 rounded-lg">
                      <RefreshCw className="h-10 w-10 text-[#C2884E] animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-video mb-4">
                        <iframe
                          ref={playerRef}
                          src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&mute=1&loop=1&playlist=${currentVideo.videoId}&enablejsapi=1&modestbranding=1&rel=0&playsinline=1`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          className="absolute top-0 left-0 w-full h-full border-0"
                          title="背景音乐"
                        ></iframe>
                        
                        <div 
                          className="absolute inset-0 cursor-pointer" 
                          onClick={() => {
                            if (playerRef.current && playerRef.current.contentWindow) {
                              try {
                                // Unmute and try to play
                                playerRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
                                playerRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                                setIsMuted(false);
                                setIsPlaying(true);
                              } catch (error) {
                                console.error('Could not interact with video:', error);
                              }
                            }
                          }}
                        />
                        
                        {isMuted && (
                          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                            <VolumeX className="h-4 w-4" />
                            <span>点击取消静音</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        {musicVideos.length > 1 && (
                          <>
                            <Button 
                              onClick={prevVideo} 
                              variant="outline" 
                              size="sm"
                              className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              上一个
                            </Button>
                            <Button 
                              onClick={nextVideo} 
                              variant="outline" 
                              size="sm"
                              className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                            >
                              下一个
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </>
                        )}
                        <Button 
                          onClick={toggleMute} 
                          variant={isMuted ? "default" : "outline"}
                          size="sm"
                          className={isMuted 
                            ? "bg-[#C2884E] hover:bg-[#D1A46C] text-white" 
                            : "border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                          }
                        >
                          {isMuted ? (
                            <>
                              <VolumeX className="h-4 w-4 mr-1" />
                              取消静音
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-4 w-4 mr-1" />
                              静音
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={togglePlayPause} 
                          variant="outline" 
                          size="sm"
                          className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              停止
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              播放
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={resetPlayer} 
                          variant="outline" 
                          size="sm"
                          className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          重新开始
                        </Button>
                      </div>
                      
                      <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-[#C2884E]/10">
                        <h3 className="text-lg font-medium text-[#C2884E] mb-2">
                          {currentVideo.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {currentVideo.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Video List - for desktop only */}
                <div className="w-full md:w-1/3 hidden md:block">
                  <div className="rounded-lg border border-[#C2884E]/20 bg-white/60 dark:bg-gray-800/60 overflow-hidden h-full">
                    <div className="p-3 bg-[#C2884E]/10 border-b border-[#C2884E]/20">
                      <h3 className="font-medium text-[#C2884E]">可用音乐</h3>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '200px' }}>
                      {loading ? (
                        <div className="flex justify-center items-center py-20">
                          <RefreshCw className="h-6 w-6 text-[#C2884E] animate-spin" />
                        </div>
                      ) : (
                        <div className="p-2">
                          {musicVideos.map((video, index) => (
                            <button
                              key={video.id}
                              onClick={() => setCurrentVideoIndex(index)}
                              className={`w-full text-left p-3 mb-2 rounded-lg transition-all ${
                                currentVideoIndex === index
                                  ? 'bg-[#C2884E] text-white'
                                  : 'bg-white dark:bg-gray-700 hover:bg-[#C2884E]/10'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-md bg-black/5 dark:bg-black/40 mr-3 flex-shrink-0 overflow-hidden">
                                  <img 
                                    src={`https://img.youtube.com/vi/${video.videoId}/default.jpg`}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="overflow-hidden">
                                  <h4 className={`font-medium text-sm truncate ${
                                    currentVideoIndex === index ? 'text-white' : 'text-[#C2884E]'
                                  }`}>
                                    {video.title}
                                  </h4>
                                  <p className={`text-xs truncate ${
                                    currentVideoIndex === index ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {video.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="text-xs sm:text-sm text-[#C2884E]/70 justify-center border-t border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 py-4">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-[#C2884E]">Kapioo 卡皮喔</span> 
                <span className="text-[#C2884E]/50">•</span> 
                <span>背景音乐播放器</span>
                <span className="text-[#C2884E]/50">•</span>
                <Link href="/editmusic" className="text-[#C2884E] hover:underline">
                  管理音乐列表
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 