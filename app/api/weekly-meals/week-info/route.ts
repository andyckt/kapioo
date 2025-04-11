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

// GET handler - return the current week and year
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Find any weekly meal to get the week/year info
    const latestMeal = await WeeklyMeal.findOne().sort({ year: -1, week: -1 });
    
    let week, year;
    
    if (latestMeal) {
      // Get the week/year from the database
      console.log(`[Week Info API] Found meal with week=${latestMeal.week}, year=${latestMeal.year}`);
      week = latestMeal.week;
      year = latestMeal.year;
    } else {
      // If no meals in database, calculate current week/year
      const current = getCurrentWeekYear();
      console.log(`[Week Info API] No meals found, using calculated week=${current.week}, year=${current.year}`);
      week = current.week;
      year = current.year;
    }
    
    // Add logging to help debug
    console.log(`[Week Info API] Returning week=${week}, year=${year}`);
    
    return NextResponse.json({ 
      success: true, 
      data: { week, year }
    });
  } catch (error) {
    console.error('[Week Info API] Error getting week/year info:', error);
    
    // Fallback to calculating week/year if database access fails
    const { week, year } = getCurrentWeekYear();
    
    return NextResponse.json(
      { success: true, data: { week, year } },
      { status: 200 }
    );
  }
} 