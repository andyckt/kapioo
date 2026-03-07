import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import Tag from '@/models/Tag';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const tags = await Tag.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
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

    await connectToDatabase();
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    // Check if tag already exists
    const existingTag = await Tag.findOne({ name: data.name });
    if (existingTag) {
      return NextResponse.json(
        { success: false, error: 'Tag already exists' },
        { status: 409 }
      );
    }
    
    const tag = await Tag.create(data);
    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
