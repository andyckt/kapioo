'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, VolumeX, RotateCcw, Music, RefreshCw, ChevronLeft, ChevronRight, Pause, Play, Edit2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface MusicVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
}

// Default video definition
const defaultVideo: MusicVideo = {
  id: 'default',
  videoId: 'ygTZZpVkmKg',
  title: '用餐背景音乐',
  description: '舒缓的旋律将提升您的用餐体验'
};

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
      
      let hasValidVideos = false;
      
      // Prioritize getting videos from the server/MongoDB
      try {
        console.log('Fetching videos from server...');
        const response = await fetch('/api/music-videos', {
          // Add cache-busting to ensure we get fresh data
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
          cache: 'no-store',
        });
        
        if (response.ok) {
          const serverVideos = await response.json();
          if (serverVideos && Array.isArray(serverVideos) && serverVideos.length > 0) {
            console.log('Loaded videos from server:', serverVideos.length);
            setMusicVideos(serverVideos);
            localStorage.setItem('musicVideos', JSON.stringify(serverVideos));
            hasValidVideos = true;
          } else {
            console.log('No videos found on server');
          }
        } else {
          console.error('Error fetching from server:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching from server:', error);
      }
      
      // Fall back to localStorage only if server fetch failed
      if (!hasValidVideos) {
        console.log('Trying to load from localStorage...');
        const storedVideos = localStorage.getItem('musicVideos');
        try {
          if (storedVideos) {
            const parsedVideos = JSON.parse(storedVideos);
            if (parsedVideos && Array.isArray(parsedVideos) && parsedVideos.length > 0) {
              console.log('Loaded videos from localStorage:', parsedVideos.length);
              setMusicVideos(parsedVideos);
              hasValidVideos = true;
              
              // Try to sync localStorage videos to server
              try {
                await fetch('/api/music-videos', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: storedVideos,
                });
                console.log('Synced localStorage videos to server');
              } catch (syncError) {
                console.error('Failed to sync localStorage videos to server:', syncError);
              }
            }
          }
        } catch (error) {
          console.error('Error loading videos from localStorage:', error);
        }
      }
      
      // If we still don't have valid videos after trying both sources, initialize with default
      if (!hasValidVideos) {
        console.log('Initializing with default video');
        initializeDefaultVideo();
        
        // Try to push default video to server
        try {
          await fetch('/api/music-videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([defaultVideo]),
          });
        } catch (error) {
          console.error('Failed to push default video to server:', error);
        }
      }
      
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
  
  // Force sync with server
  const forceSyncWithServer = async () => {
    setSyncing(true);
    setMessage('正在同步音乐数据...');
    
    try {
      // Fetch from API with cache busting
      const response = await fetch('/api/music-videos', {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        cache: 'no-store',
      });
      
      if (response.ok) {
        const serverVideos = await response.json();
        if (serverVideos && Array.isArray(serverVideos) && serverVideos.length > 0) {
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
              if (parsedVideos && Array.isArray(parsedVideos) && parsedVideos.length > 0) {
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
            
            // Push default to server
            try {
              await fetch('/api/music-videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([defaultVideo]),
              });
            } catch (error) {
              console.error('Error pushing default video to server:', error);
            }
            
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

  const currentVideo = musicVideos[currentVideoIndex] || defaultVideo;

  // Handle YouTube player events including video end
  useEffect(() => {
    // Only run if not loading and we have videos
    if (loading || !musicVideos.length) return;
    
    // Function to handle YouTube player state changes
    const handleYouTubeEvent = (event: MessageEvent) => {
      // Only process messages from YouTube
      if (typeof event.data !== 'string') {
        try {
          const data = JSON.parse(event.data);
          // YouTube API sends event data in a specific format
          if (data.event === "onStateChange" && data.info === 0) {
            // State 0 means the video ended
            console.log('Video ended, playing next video');
            if (musicVideos.length > 1) {
              nextVideo();
            } else {
              // If there's only one video, restart it
              resetPlayer();
            }
          }
        } catch (error) {
          // Not JSON or not our event, ignore
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('message', handleYouTubeEvent);
    console.log('Added YouTube event listener');
    
    // Clean up event listener on component unmount or when deps change
    return () => {
      window.removeEventListener('message', handleYouTubeEvent);
      console.log('Removed YouTube event listener');
    };
  }, [loading, musicVideos, nextVideo, resetPlayer]);

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
            src="/songlogo.png" 
            alt="Kapioo 音乐" 
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
                          src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&mute=1&enablejsapi=1&modestbranding=1&rel=0&playsinline=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={currentVideo.title}
                          className="absolute inset-0 w-full h-full"
                        ></iframe>
                      </div>
                      
                      {/* Player Controls */}
                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 mb-4">
                        <div className="flex flex-wrap gap-3 justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetPlayer}
                              className="w-9 h-9 p-0 border-[#C2884E]/30"
                            >
                              <RotateCcw className="h-4 w-4 text-[#C2884E]" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={prevVideo}
                              disabled={musicVideos.length <= 1}
                              className="w-9 h-9 p-0 border-[#C2884E]/30"
                            >
                              <ChevronLeft className="h-5 w-5 text-[#C2884E]" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={togglePlayPause}
                              className="w-9 h-9 p-0 border-[#C2884E]/30"
                            >
                              {isPlaying ? (
                                <Pause className="h-5 w-5 text-[#C2884E]" />
                              ) : (
                                <Play className="h-5 w-5 text-[#C2884E]" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={nextVideo}
                              disabled={musicVideos.length <= 1}
                              className="w-9 h-9 p-0 border-[#C2884E]/30"
                            >
                              <ChevronRight className="h-5 w-5 text-[#C2884E]" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={toggleMute}
                              className="w-9 h-9 p-0 border-[#C2884E]/30"
                            >
                              {isMuted ? (
                                <VolumeX className="h-4 w-4 text-[#C2884E]" />
                              ) : (
                                <Volume2 className="h-4 w-4 text-[#C2884E]" />
                              )}
                            </Button>
                          </div>
                          
                          <div className="flex-grow min-w-[200px]">
                            <h3 className="font-medium text-[#C2884E] truncate">{currentVideo.title}</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{currentVideo.description}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Music List (Desktop) */}
                {!loading && musicVideos.length > 1 && (
                  <div className="w-full md:w-1/3 hidden md:block">
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 h-full">
                      <h3 className="font-medium text-[#C2884E] mb-3">音乐列表</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {musicVideos.map((video, index) => (
                          <button
                            key={video.id}
                            onClick={() => setCurrentVideoIndex(index)}
                            className={`w-full text-left p-2 rounded-md transition-colors ${
                              currentVideoIndex === index
                                ? 'bg-[#C2884E] text-white'
                                : 'bg-[#C2884E]/10 text-[#C2884E] hover:bg-[#C2884E]/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-black/10 rounded-md flex-shrink-0 overflow-hidden">
                                <img 
                                  src={`https://img.youtube.com/vi/${video.videoId}/default.jpg`}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-grow overflow-hidden">
                                <h4 className="font-medium truncate">{video.title}</h4>
                                <p className="text-xs opacity-80 truncate">{video.description}</p>
                              </div>
                              {currentVideoIndex === index && (
                                <div className="ml-auto">
                                  {isPlaying ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="text-xs sm:text-sm text-[#C2884E]/70 justify-center border-t border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 py-4">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-[#C2884E]">Kapioo 卡皮喔</span> 
                <span className="text-[#C2884E]/50">•</span> 
                <span>背景音乐播放系统</span>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}