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
    
    // Log all weekly meals in the database for this week/year for debugging
    const allMealsDebug = await WeeklyMeal.find({ week, year }).lean();
    console.log(`[ADMIN API] All meals in database for week=${week}, year=${year}:`, 
      allMealsDebug.map(meal => ({ 
        day: meal.day, 
        active: meal.active,
        id: meal._id,
        mealId: meal.meal
      }))
    );
    
    // Important: If no meals found for requested week/year, try to find most recent meals
    if (allMealsDebug.length === 0) {
      console.log(`[ADMIN API] No meals found for week=${week}, year=${year}. Trying to find the most recent week/year.`);
      const latestMeal = await WeeklyMeal.findOne().sort({ year: -1, week: -1 }).lean();
      
      if (latestMeal) {
        week = latestMeal.week as number;
        year = latestMeal.year as number;
        console.log(`[ADMIN API] Using week=${week}, year=${year} from the most recent meal in database.`);
      } else {
        console.log(`[ADMIN API] No meals found in database at all.`);
      }
    }
    
    // Get all weekly meals for the specified week (including inactive ones)
    const weeklyMeals = await WeeklyMeal.find({ 
      week,
      year
    }).populate('meal').sort({ day: 1 });
    
    console.log(`[ADMIN API] Found ${weeklyMeals.length} meals (including inactive)`);
    
    // Format the response to match the existing data structure
    const formattedMeals: Record<string, any> = {};
    weeklyMeals.forEach((weeklyMeal: any) => {
      // Log the raw weekly meal document for debugging
      console.log(`[ADMIN API] Raw WeeklyMeal for ${weeklyMeal.day}:`, {
        _id: weeklyMeal._id,
        day: weeklyMeal.day,
        active: weeklyMeal.active, // Database value
        week: weeklyMeal.week,
        year: weeklyMeal.year,
        meal: weeklyMeal.meal._id || weeklyMeal.meal
      });
      
      // Convert the mongoose meal object to a plain JavaScript object
      const mealObj = weeklyMeal.meal.toObject ? weeklyMeal.meal.toObject() : { ...weeklyMeal.meal };
      
      // Ensure we correctly set the active status from the weekly meal record
      mealObj.active = weeklyMeal.active;
      
      console.log(`[ADMIN API] Setting active=${mealObj.active} for ${weeklyMeal.day}`);
      
      formattedMeals[weeklyMeal.day] = mealObj;
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
          // For admin view, we show all days, but with appropriate default active status
          const mealObj = meal.toObject ? meal.toObject() : { ...meal };
          mealObj.active = false; // Default to inactive for default meals that haven't been explicitly set
          
          formattedMeals[meal.day] = mealObj;
          console.log(`[ADMIN API] Added default meal for ${meal.day} with active=false`);
        }
      });
    }
    
    // Final log of active statuses before sending response
    console.log(`[ADMIN API] Final active statuses in response:`);
    Object.entries(formattedMeals).forEach(([day, meal]) => {
      console.log(`  - ${day}: active=${meal.active}`);
    });
    
    console.log(`[ADMIN API] Returning ${Object.keys(formattedMeals).length} meals for days: [${Object.keys(formattedMeals).join(', ')}]`);
    
    // Also include the week/year in the response
    const responseData = {
      meals: formattedMeals,
      week,
      year
    };
    
    // Add cache control headers for admin API too
    return new NextResponse(JSON.stringify({ success: true, data: responseData }), {
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