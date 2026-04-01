import { NextResponse } from "next/server";

import { parseJsonBody } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { musicVideosUpdateBodySchema } from "@/lib/contracts/content";
import MusicVideo from "@/models/MusicVideo";

const defaultVideo = {
  id: "default",
  videoId: "ygTZZpVkmKg",
  title: "用餐背景音乐",
  description: "舒缓的旋律将提升您的用餐体验",
};

function extractVideoId(value: string): string {
  if (!value) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = value.match(regExp);

  return match && match[2].length === 11 ? match[2] : "";
}

export async function GET() {
  try {
    await connectToDatabase();

    const videos = await MusicVideo.find({}).lean();

    if (!videos || videos.length === 0) {
      return NextResponse.json([defaultVideo]);
    }

    const formattedVideos = videos
      .map((video) => {
        const normalizedVideoId = extractVideoId(String(video.videoId || ""));
        if (!normalizedVideoId) {
          return null;
        }

        return {
          id: video.id,
          videoId: normalizedVideoId,
          title: video.title || defaultVideo.title,
          description: video.description || "",
        };
      })
      .filter(Boolean);

    if (formattedVideos.length === 0) {
      return NextResponse.json([defaultVideo]);
    }

    return NextResponse.json(formattedVideos);
  } catch (error: unknown) {
    console.error("Error fetching music videos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const parsed = await parseJsonBody(request, musicVideosUpdateBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const videos = parsed.data;

    await connectToDatabase();

    const existingVideos = await MusicVideo.find({}).lean();
    const existingIds = new Set(existingVideos.map((v) => v.id));

    const videoMap = new Map(videos.map((v) => [v.id, v]));
    const videosToAdd = videos.filter((v) => !existingIds.has(v.id));
    const videosToUpdate = videos.filter((v) => existingIds.has(v.id));
    const videosToDelete = existingVideos.filter((v) => !videoMap.has(v.id));

    if (videosToAdd.length > 0) {
      await MusicVideo.insertMany(videosToAdd);
      console.log(`Added ${videosToAdd.length} new music videos`);
    }

    for (const video of videosToUpdate) {
      await MusicVideo.updateOne(
        { id: video.id },
        {
          videoId: video.videoId,
          title: video.title,
          description: video.description || "",
        }
      );
    }
    if (videosToUpdate.length > 0) {
      console.log(`Updated ${videosToUpdate.length} music videos`);
    }

    if (videosToDelete.length > 0) {
      await MusicVideo.deleteMany({
        id: { $in: videosToDelete.map((v) => v.id) },
      });
      console.log(`Deleted ${videosToDelete.length} music videos`);
    }

    return NextResponse.json({
      success: true,
      message: "Music videos updated successfully",
      added: videosToAdd.length,
      updated: videosToUpdate.length,
      deleted: videosToDelete.length,
    });
  } catch (error: unknown) {
    console.error("Error updating music videos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
