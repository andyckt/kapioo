import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import MusicVideo from '@/models/MusicVideo';

// Define a default video if needed
const defaultVideo = {
  id: 'default',
  videoId: 'ygTZZpVkmKg',
  title: '用餐背景音乐',
  description: '舒缓的旋律将提升您的用餐体验'
};

// Interface for music video data
interface MusicVideoData {
  id: string;
  videoId: string;
  title: string;
  description: string;
}

// Define MongoDB error interface
interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, any>;
}

function extractVideoId(value: string): string {
  if (!value) return '';

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = value.match(regExp);

  return match && match[2].length === 11 ? match[2] : '';
}

// GET handler - Return all music videos
export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch all music videos from MongoDB
    const videos = await MusicVideo.find({}).lean();
    
    // Public GET must stay read-only; if canonical data is empty,
    // return a temporary default payload instead of mutating the DB.
    if (!videos || videos.length === 0) {
      return NextResponse.json([defaultVideo]);
    }

    // Normalize legacy stored values (full URLs, embed URLs) to bare YouTube IDs
    // so the public player always receives an embed-safe `videoId`.
    const formattedVideos = videos
      .map(video => {
        const normalizedVideoId = extractVideoId(String(video.videoId || ''));
        if (!normalizedVideoId) {
          return null;
        }

        return {
      id: video.id,
      videoId: normalizedVideoId,
      title: video.title || defaultVideo.title,
      description: video.description || ''
        };
      })
      .filter(Boolean);

    if (formattedVideos.length === 0) {
      return NextResponse.json([defaultVideo]);
    }

    return NextResponse.json(formattedVideos);
  } catch (error) {
    console.error('Error fetching music videos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler - Update music videos
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const videos: MusicVideoData[] = await request.json();
    
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
    
    await connectToDatabase();
    
    // Instead of just replacing all videos, synchronize the database with the new list
    
    // First, get all existing videos
    const existingVideos = await MusicVideo.find({}).lean();
    const existingIds = new Set(existingVideos.map(v => v.id));
    
    // Determine videos to add, update, or delete
    const videoMap = new Map(videos.map(v => [v.id, v]));
    const videosToAdd = videos.filter(v => !existingIds.has(v.id));
    const videosToUpdate = videos.filter(v => existingIds.has(v.id));
    const videosToDelete = existingVideos.filter(v => !videoMap.has(v.id));
    
    // Create new videos
    if (videosToAdd.length > 0) {
      await MusicVideo.insertMany(videosToAdd);
      console.log(`Added ${videosToAdd.length} new music videos`);
    }
    
    // Update existing videos
    for (const video of videosToUpdate) {
      await MusicVideo.updateOne(
        { id: video.id }, 
        { 
          videoId: video.videoId,
          title: video.title,
          description: video.description || ''
        }
      );
    }
    if (videosToUpdate.length > 0) {
      console.log(`Updated ${videosToUpdate.length} music videos`);
    }
    
    // Delete videos not in the new list
    if (videosToDelete.length > 0) {
      await MusicVideo.deleteMany({ id: { $in: videosToDelete.map(v => v.id) } });
      console.log(`Deleted ${videosToDelete.length} music videos`);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Music videos updated successfully',
      added: videosToAdd.length,
      updated: videosToUpdate.length,
      deleted: videosToDelete.length
    });
  } catch (error) {
    console.error('Error updating music videos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 