import { NextResponse } from 'next/server';

// Define a default video if needed
const defaultVideo = {
  id: 'default',
  videoId: 'ygTZZpVkmKg',
  title: '用餐背景音乐',
  description: '舒缓的旋律将提升您的用餐体验'
};

// Interface for music video data
interface MusicVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
}

// In-memory storage for server-side as a fallback when file system isn't available
// This will reset on server restart but serves as a temporary solution
let musicVideosCache: MusicVideo[] = [defaultVideo];

// GET handler - Return all music videos
export async function GET() {
  return NextResponse.json(musicVideosCache);
}

// POST handler - Update music videos
export async function POST(request: Request) {
  try {
    const videos: MusicVideo[] = await request.json();
    
    if (!Array.isArray(videos)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected an array of music videos.' },
        { status: 400 }
      );
    }
    
    // Validate each video
    for (const video of videos) {
      if (!video.id || !video.videoId || !video.title) {
        return NextResponse.json(
          { error: 'Each music video must have id, videoId, and title.' },
          { status: 400 }
        );
      }
    }
    
    // Update in-memory cache
    musicVideosCache = videos;
    
    return NextResponse.json({ success: true, message: 'Music videos updated successfully' });
  } catch (error) {
    console.error('Error updating music videos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 