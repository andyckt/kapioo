'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import Link from 'next/link';

export default function MusicPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [captchaDetected, setCaptchaDetected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoId = 'ygTZZpVkmKg'; // From the provided URL
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen, isMuted]);

  return (
    <div className="container mx-auto py-10 flex flex-col items-center justify-center min-h-screen transition-all duration-300">
      <Card 
        className={`w-full transition-all duration-500 ${
          isFullscreen 
            ? 'max-w-full fixed inset-0 z-50 rounded-none' 
            : 'max-w-3xl rounded-xl'
        }`}
      >
        <CardHeader className={`relative transition-all duration-300 ${isFullscreen ? 'py-3' : 'py-6'}`}>
          <CardTitle className="text-2xl font-bold">Music While You Eat</CardTitle>
          <CardDescription>
            Enjoy some relaxing background music with your meal
          </CardDescription>
          
          {isPlaying && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMuted(!isMuted)} 
                className="text-muted-foreground hover:text-primary"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullscreen}
                className="text-muted-foreground hover:text-primary"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent className={`transition-all duration-300 ${isFullscreen ? 'pb-3' : 'pb-6'}`}>
          {isPlaying ? (
            <>
              <div 
                className={`relative overflow-hidden transition-all duration-500 ${
                  isFullscreen 
                    ? 'aspect-video w-full' 
                    : 'aspect-video w-full rounded-lg shadow-lg'
                }`}
              >
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${isMuted ? '1' : '0'}&enablejsapi=1&modestbranding=1&rel=0&showinfo=0&origin=${encodeURIComponent(window.location.origin)}&hl=en&cc_load_policy=0&iv_load_policy=3&playsinline=1&controls=1`}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="eager"
                  onError={handleIframeError}
                ></iframe>
              </div>
              
              {captchaDetected && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg flex items-start gap-3 animate-fadeIn">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-300">CAPTCHA Detected</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      YouTube may be showing a verification. You can try the direct link instead:
                    </p>
                    <div className="mt-2">
                      <Link 
                        href="https://www.youtube-nocookie.com/embed/ygTZZpVkmKg?autoplay=1" 
                        target="_blank"
                        className="text-sm font-medium text-yellow-800 dark:text-yellow-300 underline"
                      >
                        Open direct link
                      </Link>
                      <span className="mx-2 text-yellow-600">|</span>
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
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex flex-col items-center justify-center shadow-lg transition-all duration-300 hover:shadow-xl">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 transition-all duration-300 hover:scale-110">
                <svg className="h-10 w-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Button 
                size="lg" 
                onClick={startMusic}
                className="font-medium bg-primary hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px] px-6"
              >
                Start Background Music
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Relaxing tunes to accompany your meal</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className={`text-sm text-muted-foreground justify-center transition-opacity duration-300 ${isFullscreen ? 'opacity-0' : 'opacity-100'}`}>
          {isPlaying ? (
            <div className="flex flex-col items-center">
              <p>Keyboard shortcuts: <span className="px-1.5 py-0.5 bg-muted rounded text-xs mx-1">M</span> for mute, <span className="px-1.5 py-0.5 bg-muted rounded text-xs mx-1">F</span> for fullscreen</p>
            </div>
          ) : (
            "Background music enhances your dining experience"
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 