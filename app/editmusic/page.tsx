'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Save, Check, X, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

// Music video interface
interface MusicVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
}

export default function EditMusicPage() {
  // State for music videos
  const [musicVideos, setMusicVideos] = useState<MusicVideo[]>([]);
  const [newVideoId, setNewVideoId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedVideoId, setEditedVideoId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load music videos from localStorage on component mount
  useEffect(() => {
    const storedVideos = localStorage.getItem('musicVideos');
    if (storedVideos) {
      try {
        setMusicVideos(JSON.parse(storedVideos));
      } catch (error) {
        console.error('Error parsing stored music videos:', error);
        // Initialize with default video if there's an error
        initializeDefaultVideo();
      }
    } else {
      // Initialize with default video if none exist
      initializeDefaultVideo();
    }
  }, []);

  // Initialize with the default video from the BGM page
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

  // Save videos to localStorage whenever they change
  useEffect(() => {
    if (musicVideos.length > 0) {
      localStorage.setItem('musicVideos', JSON.stringify(musicVideos));
    }
  }, [musicVideos]);

  // Helper to show success message that disappears after 3 seconds
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Helper to show error message that disappears after 3 seconds
  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 3000);
  };

  // Extract YouTube video ID from various URL formats
  const extractVideoId = (url: string): string => {
    if (!url) return '';
    
    // If it's already just an ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    // Try to extract from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : '';
  };

  // Add a new music video
  const handleAddVideo = () => {
    const videoId = extractVideoId(newVideoId);
    
    if (!videoId) {
      showError('请输入有效的 YouTube 视频 ID 或 URL');
      return;
    }
    
    if (!newTitle.trim()) {
      showError('请输入视频标题');
      return;
    }

    const newVideo: MusicVideo = {
      id: Date.now().toString(),
      videoId,
      title: newTitle,
      description: newDescription
    };

    setMusicVideos([...musicVideos, newVideo]);
    setNewVideoId('');
    setNewTitle('');
    setNewDescription('');
    showSuccess('成功添加新音乐视频');
  };

  // Start editing a video
  const handleEdit = (video: MusicVideo) => {
    setEditingId(video.id);
    setEditedTitle(video.title);
    setEditedDescription(video.description);
    setEditedVideoId(video.videoId);
  };

  // Save edited video
  const handleSaveEdit = (id: string) => {
    const videoId = extractVideoId(editedVideoId);
    
    if (!videoId) {
      showError('请输入有效的 YouTube 视频 ID 或 URL');
      return;
    }
    
    if (!editedTitle.trim()) {
      showError('请输入视频标题');
      return;
    }

    setMusicVideos(musicVideos.map(video => 
      video.id === id ? 
        { ...video, videoId, title: editedTitle, description: editedDescription } : 
        video
    ));
    setEditingId(null);
    showSuccess('音乐视频已更新');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Delete a video
  const handleDelete = (id: string) => {
    // If it's the only video, don't allow deletion
    if (musicVideos.length <= 1) {
      showError('无法删除最后一个视频');
      return;
    }

    // If it's the default first video, show warning
    if (id === 'default') {
      showError('警告：这是默认视频。删除它可能会影响 /bgm 页面。');
      // Still allow deletion after warning
    }

    setMusicVideos(musicVideos.filter(video => video.id !== id));
    setConfirmDelete(null);
    showSuccess('音乐视频已删除');
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

      <div className="container mx-auto px-4 sm:px-6 flex flex-col py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Card className="w-full border-[#C2884E]/20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-[#C2884E] rounded-full p-2 text-white flex-shrink-0">
                  <Music size={20} />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold text-[#C2884E]">音乐视频管理</CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base text-[#D1A46C]">
                添加、编辑或删除背景音乐视频
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-8">
              {/* Success and error messages */}
              <AnimatePresence>
                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-800 dark:text-green-300"
                  >
                    {successMessage}
                  </motion.div>
                )}
                
                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-300"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add new video form */}
              <div className="mb-8 p-5 border border-[#C2884E]/20 rounded-lg bg-white/50 dark:bg-gray-800/50">
                <h3 className="text-lg font-medium text-[#C2884E] mb-4">添加新音乐视频</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="videoId" className="mb-1.5 block text-sm font-medium">
                      YouTube 视频 ID 或 URL
                    </Label>
                    <Input
                      id="videoId"
                      value={newVideoId}
                      onChange={(e) => setNewVideoId(e.target.value)}
                      placeholder="例如: ygTZZpVkmKg 或 https://www.youtube.com/watch?v=ygTZZpVkmKg"
                      className="bg-white/80 dark:bg-gray-800/80"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title" className="mb-1.5 block text-sm font-medium">
                      标题
                    </Label>
                    <Input
                      id="title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="视频标题"
                      className="bg-white/80 dark:bg-gray-800/80"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="mb-1.5 block text-sm font-medium">
                      描述
                    </Label>
                    <Textarea
                      id="description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="视频描述（可选）"
                      className="resize-none h-20 bg-white/80 dark:bg-gray-800/80"
                    />
                  </div>
                  <div>
                    <Button 
                      onClick={handleAddVideo}
                      className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#D1A46C] hover:to-[#C2884E] text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      添加视频
                    </Button>
                  </div>
                </div>
              </div>

              {/* Video list */}
              <div>
                <h3 className="text-lg font-medium text-[#C2884E] mb-4">已保存的音乐视频</h3>
                <div className="space-y-4">
                  {musicVideos.map((video) => (
                    <Card key={video.id} className="border-[#C2884E]/20 overflow-hidden">
                      {editingId === video.id ? (
                        // Editing mode
                        <div className="p-4">
                          <div className="grid gap-3 mb-4">
                            <div>
                              <Label htmlFor={`edit-videoId-${video.id}`} className="mb-1.5 block text-sm font-medium">
                                YouTube 视频 ID 或 URL
                              </Label>
                              <Input
                                id={`edit-videoId-${video.id}`}
                                value={editedVideoId}
                                onChange={(e) => setEditedVideoId(e.target.value)}
                                className="bg-white/80 dark:bg-gray-800/80"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-title-${video.id}`} className="mb-1.5 block text-sm font-medium">
                                标题
                              </Label>
                              <Input
                                id={`edit-title-${video.id}`}
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="bg-white/80 dark:bg-gray-800/80"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-description-${video.id}`} className="mb-1.5 block text-sm font-medium">
                                描述
                              </Label>
                              <Textarea
                                id={`edit-description-${video.id}`}
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="resize-none h-20 bg-white/80 dark:bg-gray-800/80"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleSaveEdit(video.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              保存
                            </Button>
                            <Button 
                              onClick={handleCancelEdit}
                              size="sm"
                              variant="outline"
                            >
                              <X className="h-4 w-4 mr-1" />
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <>
                          <div className="aspect-video relative bg-black/5 dark:bg-black/20">
                            <img 
                              src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                              alt={video.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            <h4 className="text-lg font-medium text-[#C2884E] mb-1">{video.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{video.description}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                              视频 ID: {video.videoId}
                            </p>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => handleEdit(video)}
                                size="sm"
                                variant="outline"
                                className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                编辑
                              </Button>
                              
                              {confirmDelete === video.id ? (
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleDelete(video.id)}
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    确认
                                  </Button>
                                  <Button 
                                    onClick={() => setConfirmDelete(null)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    取消
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  onClick={() => setConfirmDelete(video.id)}
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  删除
                                </Button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-xs sm:text-sm text-[#C2884E]/70 justify-center border-t border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 py-4">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-[#C2884E]">Kapioo</span> 
                <span className="text-[#C2884E]/50">•</span> 
                <span>背景音乐管理系统</span>
                <span className="text-[#C2884E]/50">•</span>
                <Link href="/bgm" className="text-[#C2884E] hover:underline">
                  前往音乐播放页面
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 