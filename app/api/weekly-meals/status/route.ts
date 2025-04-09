import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyMeal from '@/models/WeeklyMeal';

// Helper function to get current week and year
function getCurrentWeekYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in a week
  const week = Math.floor(diff / oneWeek) + 1;
  return { week, year: now.getFullYear() };
}

// PATCH handler - update active status for a day
export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    console.log('[Status API] Received request to update active status:', data);
    
    // Validate required fields
    if (data.day === undefined || data.active === undefined) {
      console.log('[Status API] Validation failed: Missing day or active flag');
      return NextResponse.json(
        { success: false, error: 'Day and active status are required' },
        { status: 400 }
      );
    }
    
    const { day, active } = data;
    const { week, year } = getCurrentWeekYear();
    console.log(`[Status API] Looking for meal for day=${day}, week=${week}, year=${year}`);
    
    await connectToDatabase();
    
    // Find the weekly meal entry - first try the current week/year
    let existingEntry = await WeeklyMeal.findOne({ day, week, year });
    
    // If not found, try to find an entry for this day with any week/year
    if (!existingEntry) {
      console.log(`[Status API] No meal found for current week/year. Searching for any entry for day=${day}`);
      existingEntry = await WeeklyMeal.findOne({ day }).sort({ year: -1, week: -1 });
    }
    
    if (!existingEntry) {
      console.log(`[Status API] No meal found for day=${day} in any week/year`);
      return NextResponse.json(
        { success: false, error: 'No meal assigned to this day yet' },
        { status: 404 }
      );
    }
    
    console.log(`[Status API] Found meal for ${day} (week=${existingEntry.week}, year=${existingEntry.year}). Current active=${existingEntry.active}, setting to active=${active}`);
    
    // Update the active status
    existingEntry.active = active;
    await existingEntry.save();
    
    console.log(`[Status API] Successfully updated ${day} to active=${active}`);
    
    return NextResponse.json(
      { 
        success: true, 
        data: { 
          day, 
          active,
          week: existingEntry.week,
          year: existingEntry.year
        } 
      }
    );
  } catch (error) {
    console.error('[Status API] Error updating day active status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update day active status' },
      { status: 500 }
    );
  }
} 