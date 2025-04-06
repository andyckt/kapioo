'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Save, Check, X, Music, RefreshCw, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  // Save both in localStorage and through API (for cross-device syncing)
  const saveVideos = async (videos: MusicVideo[]) => {
    try {
      // Always save to localStorage first for immediate effect
      localStorage.setItem('musicVideos', JSON.stringify(videos));

      // Save to the server via API
      setIsSyncing(true);
      
      const response = await fetch('/api/music-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videos),
      });
      
      const result = await response.json();
      setIsSyncing(false);
      
      if (!response.ok) {
        console.error('Error saving to server:', result.error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving videos:', error);
      setIsSyncing(false);
      return false;
    }
  };

  // Load music videos from localStorage on component mount
  useEffect(() => {
    const loadVideos = async () => {
      setIsLoading(true);
      
      // Try to load from localStorage first for immediate display
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
      
      // In a real application, you would also check for updates from the server
      // This simulates that behavior
      await simulateServerSync();
      
      setIsLoading(false);
    };
    
    loadVideos();
  }, []);
  
  // Simulate server synchronization
  const simulateServerSync = async () => {
    setIsSyncing(true);
    
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
      setIsSyncing(false);
    }
  };

  // Force sync with server
  const forceSyncWithServer = async () => {
    setIsSyncing(true);
    
    try {
      // Fetch from API
      const response = await fetch('/api/music-videos');
      
      if (response.ok) {
        const serverVideos = await response.json();
        if (serverVideos && serverVideos.length > 0) {
          setMusicVideos(serverVideos);
          localStorage.setItem('musicVideos', JSON.stringify(serverVideos));
          showSuccess('已成功同步音乐数据');
        } else {
          showError('服务器上没有音乐数据');
        }
      } else {
        const errorText = await response.text();
        console.error('Error fetching from server:', errorText);
        showError('同步失败：' + errorText);
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
      showError('同步失败，请稍后再试');
    } finally {
      setIsSyncing(false);
    }
  };

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
  const handleAddVideo = async () => {
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

    const updatedVideos = [...musicVideos, newVideo];
    const success = await saveVideos(updatedVideos);
    
    if (success) {
      setMusicVideos(updatedVideos);
      setNewVideoId('');
      setNewTitle('');
      setNewDescription('');
      showSuccess('成功添加新音乐视频');
    } else {
      showError('添加视频失败，请稍后再试');
    }
  };

  // Start editing a video
  const handleEdit = (video: MusicVideo) => {
    setEditingId(video.id);
    setEditedTitle(video.title);
    setEditedDescription(video.description);
    setEditedVideoId(video.videoId);
  };

  // Save edited video
  const handleSaveEdit = async (id: string) => {
    const videoId = extractVideoId(editedVideoId);
    
    if (!videoId) {
      showError('请输入有效的 YouTube 视频 ID 或 URL');
      return;
    }
    
    if (!editedTitle.trim()) {
      showError('请输入视频标题');
      return;
    }

    const updatedVideos = musicVideos.map(video => 
      video.id === id ? 
        { ...video, videoId, title: editedTitle, description: editedDescription } : 
        video
    );
    
    const success = await saveVideos(updatedVideos);
    
    if (success) {
      setMusicVideos(updatedVideos);
      setEditingId(null);
      showSuccess('音乐视频已更新');
    } else {
      showError('更新视频失败，请稍后再试');
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Delete a video
  const handleDelete = async (id: string) => {
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

    const updatedVideos = musicVideos.filter(video => video.id !== id);
    const success = await saveVideos(updatedVideos);
    
    if (success) {
      setMusicVideos(updatedVideos);
      setConfirmDelete(null);
      showSuccess('音乐视频已删除');
    } else {
      showError('删除视频失败，请稍后再试');
    }
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
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#C2884E] rounded-full p-2 text-white flex-shrink-0">
                    <Music size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-[#C2884E]">音乐视频管理</CardTitle>
                    <CardDescription className="text-sm sm:text-base text-[#D1A46C]">
                      添加、编辑或删除背景音乐视频
                    </CardDescription>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceSyncWithServer}
                  disabled={isSyncing}
                  className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                >
                  {isSyncing ? (
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
                      disabled={isSyncing}
                      className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#D1A46C] hover:to-[#C2884E] text-white"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          添加视频
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Info box about syncing */}
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-1">音乐同步说明</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      您添加的音乐将自动同步到所有设备。如果您在其他设备上看不到最新音乐，请点击上方的"同步数据"按钮更新。
                    </p>
                  </div>
                </div>
              </div>

              {/* Video list */}
              <div>
                <h3 className="text-lg font-medium text-[#C2884E] mb-4">已保存的音乐视频</h3>
                
                {/* Loading state */}
                {isLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <RefreshCw className="h-8 w-8 text-[#C2884E] animate-spin" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
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
                                disabled={isSyncing}
                              >
                                {isSyncing ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    保存
                                  </>
                                )}
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
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{video.description}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                视频 ID: {video.videoId}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button 
                                  onClick={() => handleEdit(video)}
                                  size="sm"
                                  variant="outline"
                                  className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/10"
                                  disabled={isSyncing}
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
                                      disabled={isSyncing}
                                    >
                                      {isSyncing ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "确认"
                                      )}
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
                                    disabled={isSyncing}
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
                )}
              </div>
            </CardContent>
            <CardFooter className="text-xs sm:text-sm text-[#C2884E]/70 justify-center border-t border-[#C2884E]/10 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 py-4">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-[#C2884E]">Kapioo 卡皮喔</span> 
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