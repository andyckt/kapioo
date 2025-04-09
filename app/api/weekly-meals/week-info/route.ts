import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyMeal from '@/models/WeeklyMeal';

// Helper function to get current week and year
function calculateCurrentWeekYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in a week
  const week = Math.floor(diff / oneWeek) + 1;
  return { week, year: now.getFullYear() };
}

// GET handler - get the current week and year from the database or calculate it
export async function GET(request: Request) {
  try {
    console.log('[Week Info API] Getting current week and year info');
    
    await connectToDatabase();
    
    // Try to find a meal in the database to get its week and year
    const mostRecentMeal = await WeeklyMeal.findOne().sort({ year: -1, week: -1 });
    
    if (mostRecentMeal) {
      console.log(`[Week Info API] Found meal with week=${mostRecentMeal.week}, year=${mostRecentMeal.year}`);
      return NextResponse.json({
        success: true,
        data: {
          week: mostRecentMeal.week,
          year: mostRecentMeal.year,
          source: 'database'
        }
      });
    } else {
      // If no meals in database, calculate current week/year
      const { week, year } = calculateCurrentWeekYear();
      console.log(`[Week Info API] No meals found, calculated week=${week}, year=${year}`);
      return NextResponse.json({
        success: true,
        data: {
          week,
          year,
          source: 'calculated'
        }
      });
    }
  } catch (error) {
    console.error('[Week Info API] Error getting week info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get week and year information' },
      { status: 500 }
    );
  }
} 