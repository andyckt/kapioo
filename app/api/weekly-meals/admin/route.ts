import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyMeal from '@/models/WeeklyMeal';
import Meal from '@/models/Meal';

// Helper function to get current week and year
function getCurrentWeekYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in a week
  const week = Math.floor(diff / oneWeek) + 1;
  return { week, year: now.getFullYear() };
}

// GET handler - return the current week's meals (including inactive) for admin
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    let week = parseInt(url.searchParams.get('week') || '0');
    let year = parseInt(url.searchParams.get('year') || '0');
    
    // If week/year not provided, use current week/year
    if (!week || !year) {
      const current = getCurrentWeekYear();
      week = current.week;
      year = current.year;
    }
    
    console.log(`[ADMIN API] Weekly meals request - week: ${week}, year: ${year}`);
    
    await connectToDatabase();
    
    // Find all weekly meals for the specified week (including inactive ones)
    const weeklyMeals = await WeeklyMeal.find({ 
      week,
      year
    }).populate('meal').sort({ day: 1 });
    
    console.log(`[ADMIN API] Found ${weeklyMeals.length} meals (including inactive)`);
    
    // Format the response to match the existing data structure
    const formattedMeals: Record<string, any> = {};
    weeklyMeals.forEach((weeklyMeal: any) => {
      // Important: Explicitly add the active property to the meal object
      const mealObj = weeklyMeal.meal.toObject ? weeklyMeal.meal.toObject() : weeklyMeal.meal;
      mealObj.active = weeklyMeal.active;
      
      formattedMeals[weeklyMeal.day] = mealObj;
      console.log(`[ADMIN API] Formatted meal for ${weeklyMeal.day} with active=${mealObj.active}`);
    });
    
    // If we have fewer than 7 days, check for any default meals
    if (Object.keys(formattedMeals).length < 7) {
      // Get the days that already have meals assigned
      const assignedDays = Object.keys(formattedMeals);
      
      // Find default meals
      const defaultMeals = await Meal.find({ day: { $exists: true } });
      console.log(`[ADMIN API] Found ${defaultMeals.length} potential default meals`);
      
      defaultMeals.forEach((meal: any) => {
        if (meal.day && !formattedMeals[meal.day]) {
          // For admin view, we show all days, setting default active=true
          const mealObj = meal.toObject ? meal.toObject() : meal;
          mealObj.active = true; // Default to active for admin default meals
          
          formattedMeals[meal.day] = mealObj;
          console.log(`[ADMIN API] Added default meal for ${meal.day} with active=true`);
        }
      });
    }
    
    console.log(`[ADMIN API] Returning ${Object.keys(formattedMeals).length} meals for days: [${Object.keys(formattedMeals).join(', ')}]`);
    
    // Add cache control headers for admin API too
    return new NextResponse(JSON.stringify({ success: true, data: formattedMeals }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate'
      }
    });
  } catch (error) {
    console.error('[ADMIN API] Error fetching weekly meals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly meals' },
      { status: 500 }
    );
  }
} 