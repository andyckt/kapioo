import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

// GET all settings or a specific setting by key
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    
    if (key) {
      // Get specific setting
      const setting = await Settings.findOne({ key });
      
      if (!setting) {
        // Return default values if setting doesn't exist
        if (key === 'cutoffTime') {
          return NextResponse.json({ 
            success: true, 
            data: { key: 'cutoffTime', value: { hour: 11, minute: 59 } }
          });
        }
        
        return NextResponse.json(
          { success: false, error: 'Setting not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: setting });
    } else {
      // Get all settings
      const settings = await Settings.find({});
      return NextResponse.json({ success: true, data: settings });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST or PUT to create/update a setting
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const data = await request.json();
    
    if (!data.key) {
      return NextResponse.json(
        { success: false, error: 'Setting key is required' },
        { status: 400 }
      );
    }
    
    // Update or create setting
    const setting = await Settings.findOneAndUpdate(
      { key: data.key },
      { 
        key: data.key,
        value: data.value,
        description: data.description 
      },
      { upsert: true, new: true, runValidators: true }
    );
    
    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


