import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the data file path
const dataFilePath = path.join(process.cwd(), 'data', 'music-videos.json');

// Interface for music video data
interface MusicVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
}

// Ensure data directory exists
const ensureDataDirExists = () => {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Initialize with default data if file doesn't exist
const initializeDataFileIfNeeded = () => {
  ensureDataDirExists();
  
  if (!fs.existsSync(dataFilePath)) {
    const defaultVideos: MusicVideo[] = [
      {
        id: 'default',
        videoId: 'ygTZZpVkmKg',
        title: '用餐背景音乐',
        description: '舒缓的旋律将提升您的用餐体验'
      }
    ];
    
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultVideos, null, 2));
  }
};

// Read music videos from file
const readMusicVideos = (): MusicVideo[] => {
  initializeDataFileIfNeeded();
  
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading music videos:', error);
    return [];
  }
};

// Write music videos to file
const writeMusicVideos = (videos: MusicVideo[]): boolean => {
  ensureDataDirExists();
  
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(videos, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing music videos:', error);
    return false;
  }
};

// GET handler - Return all music videos
export async function GET() {
  const videos = readMusicVideos();
  return NextResponse.json(videos);
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
    
    const success = writeMusicVideos(videos);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Music videos updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to save music videos.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating music videos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 