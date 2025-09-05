import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Tag from '@/models/Tag';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { id } = params;
    const tag = await Tag.findById(id);
    
    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { id } = params;
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    // Check if tag with new name already exists (but is not this tag)
    const existingTag = await Tag.findOne({ name: data.name, _id: { $ne: id } });
    if (existingTag) {
      return NextResponse.json(
        { success: false, error: 'Tag name already in use' },
        { status: 409 }
      );
    }
    
    const tag = await Tag.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { id } = params;
    
    const tag = await Tag.findByIdAndDelete(id);
    
    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
