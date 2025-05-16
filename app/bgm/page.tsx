'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, VolumeX, RotateCcw, Music, RefreshCw, ChevronLeft, ChevronRight, Pause, Play, Edit2, Info, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Add YouTube IFrame API type definitions
declare global {
  interface Window {
    YT: {
      Player: any;
      PlayerState: {
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady: () => void;
    ytPlayer: any;
  }
}

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
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    songName: '',
    artistName: '',
    reason: '',
    submitterName: ''
  });

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

  // Handle YouTube player events
  useEffect(() => {
    if (loading || !musicVideos.length) return;
    
    // Create a player reference to store at global scope
    let player: any = null;
    
    // Initialize YouTube API
    if (typeof window !== 'undefined' && !window.YT) {
      // Load YouTube IFrame API
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      // Create global onYouTubeIframeAPIReady callback
      window.onYouTubeIframeAPIReady = initializeYouTubePlayer;
    } else if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      // YouTube API already loaded
      initializeYouTubePlayer();
    }
    
    // Initialize YouTube player with API
    function initializeYouTubePlayer() {
      console.log('Initializing YouTube player with API');
      if (!playerRef.current) {
        console.warn('Player reference not available');
        return;
      }
      
      try {
        player = new window.YT.Player('youtube-player', {
          events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': (e: any) => console.error('YouTube Player Error:', e.data)
          }
        });
        
        // Store player reference globally
        window.ytPlayer = player;
        console.log('YouTube player initialized successfully');
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    }
    
    // When player is ready
    function onPlayerReady(event: any) {
      console.log('YouTube player is ready');
      // Set initial mute state
      if (!isMuted) {
        event.target.unMute();
      } else {
        event.target.mute();
      }
      
      // Ensure video is playing
      if (isPlaying) {
        event.target.playVideo();
      }
    }
    
    // When player state changes
    function onPlayerStateChange(event: any) {
      console.log('YouTube player state changed to:', event.data);
      
      // YT.PlayerState.ENDED = 0
      if (event.data === 0) {
        console.log('Video ended, playing next song automatically');
        // Play next song
        setCurrentVideoIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % musicVideos.length;
          console.log(`Moving from song ${prevIndex} to song ${nextIndex}`);
          return nextIndex;
        });
      }
    }
    
    // Create an interval to check video progress and handle auto-play as a backup mechanism
    const checkVideoInterval = setInterval(() => {
      if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
        try {
          const currentTime = player.getCurrentTime();
          const duration = player.getDuration();
          const remainingTime = duration - currentTime;
          
          // If less than 1 second remains and it's not already at the end
          if (remainingTime > 0 && remainingTime < 1 && duration > 1) {
            console.log('Video almost ended (interval check), preparing next song');
            
            // Move to the next song when it gets very close to the end
            // This is a backup to the onStateChange event
            setCurrentVideoIndex(prevIndex => {
              const nextIndex = (prevIndex + 1) % musicVideos.length;
              console.log(`Backup mechanism: Moving from song ${prevIndex} to song ${nextIndex}`);
              return nextIndex;
            });
          }
        } catch (error) {
          // Silent catch
        }
      }
    }, 1000);
    
    // Cleanup
    return () => {
      clearInterval(checkVideoInterval);
      
      if (typeof window !== 'undefined') {
        // Clean up YouTube API
        if ('onYouTubeIframeAPIReady' in window) {
          window.onYouTubeIframeAPIReady = () => {};
        }
        // Clean up player reference
        if (window.ytPlayer) {
          try {
            window.ytPlayer.destroy();
          } catch (error) {
            console.error('Error destroying YouTube player:', error);
          }
          window.ytPlayer = undefined;
        }
      }
    };
  }, [loading, musicVideos, isMuted, isPlaying]);

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

  const handleSubmissionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSubmissionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitSongRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form - only songName and submitterName are required
    if (!submissionForm.songName || !submissionForm.submitterName) {
      setMessage('请填写所有必填字段（歌曲名称和您的名字是必填的）');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/music-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionForm),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmissionSuccess(true);
        // Reset form
        setSubmissionForm({
          songName: '',
          artistName: '',
          reason: '',
          submitterName: ''
        });
      } else {
        setMessage(data.message || '提交失败，请稍后再试');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('网络错误，请稍后再试');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

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
                
                <div className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    animate={{ 
                      y: [0, -3, 0],
                      transition: { 
                        repeat: Infinity, 
                        duration: 2,
                        ease: "easeInOut" 
                      }
                    }}
                  >
                    <Button
                      onClick={() => setShowSubmissionForm(true)}
                      className="relative overflow-hidden bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#D1A46C] hover:to-[#C2884E] text-white shadow-md hover:shadow-lg transition-all duration-300"
                      size="sm"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      <span className="font-medium">推荐我的歌</span>
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                      </span>
                    </Button>
                  </motion.div>
                  
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
                          src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&mute=1&enablejsapi=1&modestbranding=1&rel=0&playsinline=1&loop=0&playlist=${currentVideo.videoId}&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={currentVideo.title}
                          className="absolute inset-0 w-full h-full"
                          id="youtube-player"
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

        {/* Modal popup for submission form */}
        <AnimatePresence>
          {showSubmissionForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-lg"
              >
                <Card className="border-[#C2884E]/20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5">
                    <CardTitle className="text-xl font-bold text-[#C2884E]">推荐我的歌 🎵</CardTitle>
                    <CardDescription className="text-[#D1A46C]">
                      把你爱听的歌推荐给大家吧～我们会从投稿中挑选加入每日歌单！
                    </CardDescription>
                  </CardHeader>
                  
                  {submissionSuccess ? (
                    <CardContent className="p-6 text-center">
                      <div className="text-[#C2884E] mb-2 flex justify-center">
                        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-[#C2884E] mb-2">投稿成功！</h3>
                      <p className="text-[#D1A46C] mb-4">
                        感谢你的推荐～我们会根据顺序逐一加入每日歌单，Kapioo用户很快就能听到你的歌啦！🎧
                      </p>
                      <Button 
                        onClick={() => {
                          setSubmissionSuccess(false);
                          setShowSubmissionForm(false);
                        }}
                        className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#D1A46C] hover:to-[#C2884E] text-white"
                      >
                        关闭
                      </Button>
                    </CardContent>
                  ) : (
                    <>
                      <CardContent className="p-5 sm:p-8">
                        <form onSubmit={submitSongRecommendation} className="space-y-4">
                          <div>
                            <Label htmlFor="songName" className="text-[#C2884E] mb-1.5 block">
                              🎵 歌曲名称：
                            </Label>
                            <Input 
                              id="songName"
                              name="songName"
                              value={submissionForm.songName}
                              onChange={handleSubmissionChange}
                              placeholder="请输入歌曲名称"
                              className="bg-white/80 dark:bg-gray-800/80"
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="artistName" className="text-[#C2884E] mb-1.5 block">
                              👤 歌手名字：
                            </Label>
                            <Input 
                              id="artistName"
                              name="artistName"
                              value={submissionForm.artistName}
                              onChange={handleSubmissionChange}
                              placeholder="请输入歌手名字"
                              className="bg-white/80 dark:bg-gray-800/80"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="reason" className="text-[#C2884E] mb-1.5 block">
                              💬 为什么想分享这首歌？
                            </Label>
                            <Textarea 
                              id="reason"
                              name="reason"
                              value={submissionForm.reason}
                              onChange={handleSubmissionChange}
                              placeholder="回忆，故事，你喜欢的歌手，聊聊都行！"
                              className="resize-none h-24 bg-white/80 dark:bg-gray-800/80"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="submitterName" className="text-[#C2884E] mb-1.5 block">
                              📝 想我们怎么称呼你？
                            </Label>
                            <Input 
                              id="submitterName"
                              name="submitterName"
                              value={submissionForm.submitterName}
                              onChange={handleSubmissionChange}
                              placeholder="小名、网名、昵称都可以～"
                              className="bg-white/80 dark:bg-gray-800/80"
                              required
                            />
                          </div>
                          
                          {message && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-300">
                              {message}
                            </div>
                          )}
                        </form>
                      </CardContent>
                      
                      <CardFooter className="flex justify-end gap-3 pt-2 border-t border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 py-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowSubmissionForm(false)}
                          className="border-[#C2884E] text-[#C2884E]"
                        >
                          取消
                        </Button>
                        
                        <Button 
                          type="button"
                          onClick={submitSongRecommendation}
                          className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#D1A46C] hover:to-[#C2884E] text-white"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              提交中...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              提交!
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </>
                  )}
                </Card>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}