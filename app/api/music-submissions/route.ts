import { NextResponse } from "next/server";

import { parseJsonBody } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import {
  musicSubmissionCreateBodySchema,
  musicSubmissionPatchBodySchema,
} from "@/lib/contracts/content";
import MusicSubmission from "@/models/MusicSubmission";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const submissions = await MusicSubmission.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(submissions);
  } catch (error: unknown) {
    console.error("Error fetching music submissions:", error);
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
    const parsed = await parseJsonBody(request, musicSubmissionCreateBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const submission = parsed.data;

    await connectToDatabase();

    const newSubmission = await MusicSubmission.create({
      songName: submission.songName,
      artistName: submission.artistName,
      reason: submission.reason,
      submitterName: submission.submitterName,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      message: "Music submission created successfully",
      data: newSubmission,
    });
  } catch (error: unknown) {
    console.error("Error creating music submission:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const parsed = await parseJsonBody(request, musicSubmissionPatchBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const data = parsed.data;

    await connectToDatabase();

    const submission = await MusicSubmission.findByIdAndUpdate(
      data.submissionId,
      { status: data.status },
      { new: true }
    );

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Submission status updated successfully",
      data: submission,
    });
  } catch (error: unknown) {
    console.error("Error updating submission status:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
