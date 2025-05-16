import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MusicSubmission from '@/models/MusicSubmission';

// Interface for music submission data
interface MusicSubmissionData {
  songName: string;
  artistName: string;
  reason: string;
  submitterName: string;
}

// GET handler - Return all music submissions
export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch all music submissions from MongoDB, sorted by creation date (newest first)
    const submissions = await MusicSubmission.find({}).sort({ createdAt: -1 }).lean();
    
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching music submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler - Create a new music submission
export async function POST(request: Request) {
  try {
    const submission: MusicSubmissionData = await request.json();
    
    // Validate submission data
    if (!submission.songName || !submission.artistName || !submission.reason || !submission.submitterName) {
      return NextResponse.json(
        { error: 'All fields are required: songName, artistName, reason, submitterName' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Create new submission
    const newSubmission = await MusicSubmission.create({
      songName: submission.songName,
      artistName: submission.artistName,
      reason: submission.reason,
      submitterName: submission.submitterName,
      status: 'pending'
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Music submission created successfully',
      data: newSubmission
    });
  } catch (error) {
    console.error('Error creating music submission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH handler - Update a music submission status
export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.submissionId || !data.status) {
      return NextResponse.json(
        { error: 'submissionId and status are required' },
        { status: 400 }
      );
    }
    
    if (!['pending', 'approved', 'rejected'].includes(data.status)) {
      return NextResponse.json(
        { error: 'Status must be one of: pending, approved, rejected' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    const submission = await MusicSubmission.findByIdAndUpdate(
      data.submissionId,
      { status: data.status },
      { new: true }
    );
    
    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Submission status updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error updating submission status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 