import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

export const dynamic = 'force-dynamic';

// GET - Fetch maintenance mode status
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Try to find the maintenance mode setting
    let setting = await Settings.findOne({ key: 'maintenanceMode' });
    
    // If it doesn't exist, create it with default value false
    if (!setting) {
      setting = await Settings.create({
        key: 'maintenanceMode',
        value: false,
        description: 'Global maintenance mode flag for the website'
      });
    }
    
    return NextResponse.json({
      isMaintenanceMode: setting.value || false,
      updatedAt: setting.updatedAt
    });
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance status', isMaintenanceMode: false },
      { status: 500 }
    );
  }
}

// POST - Update maintenance mode status
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { isMaintenanceMode } = body;
    
    if (typeof isMaintenanceMode !== 'boolean') {
      return NextResponse.json(
        { error: 'isMaintenanceMode must be a boolean value' },
        { status: 400 }
      );
    }
    
    // Update or create the maintenance mode setting
    const setting = await Settings.findOneAndUpdate(
      { key: 'maintenanceMode' },
      { 
        value: isMaintenanceMode,
        description: 'Global maintenance mode flag for the website'
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );
    
    return NextResponse.json({
      success: true,
      isMaintenanceMode: setting.value,
      updatedAt: setting.updatedAt
    });
  } catch (error) {
    console.error('Error updating maintenance status:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance status' },
      { status: 500 }
    );
  }
}

