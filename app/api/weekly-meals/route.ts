import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
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

// GET handler - return the current week's meals
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
    
    console.log(`[API] Weekly meals request - week: ${week}, year: ${year}`);
    
    await connectToDatabase();
    
    // First, get ALL weekly meals (including inactive) to check what's in the database
    const allWeeklyMeals = await WeeklyMeal.find({ 
      week,
      year
    }).select('day active').lean();
    
    console.log('[API] All weekly meals in DB (including inactive):', 
      allWeeklyMeals.map(meal => ({ day: meal.day, active: meal.active }))
    );
    
    // FIXED: Only fetch meals that are explicitly marked as active=true
    // This ensures we exclude any meals marked as inactive
    const weeklyMeals = await WeeklyMeal.find({ 
      week,
      year,
      active: true // This filter is critical - only get active=true meals
    }).populate('meal').lean();
    
    console.log(`[API] Found ${weeklyMeals.length} active meals`);
    
    // Format the response to match the existing data structure
    const formattedMeals: Record<string, any> = {};
    
    // Iterate through active meals only
    weeklyMeals.forEach((weeklyMeal: any) => {
      // Log the weekly meal for debugging
      console.log(`[API] Weekly meal for ${weeklyMeal.day}:`, {
        id: weeklyMeal._id,
        day: weeklyMeal.day,
        activeStatus: weeklyMeal.active,
        mealId: weeklyMeal.meal._id,
      });
      
      // Create plain object for the meal
      const mealObj = { 
        ...weeklyMeal.meal,
        active: true // Explicitly set active to true
      };
      
      // Add to formatted meals
      formattedMeals[weeklyMeal.day] = mealObj;
      console.log(`[API] Added active meal for ${weeklyMeal.day} to response`);
    });
    
    // If we have no meals (DB is empty), add default meals for weekdays only
    if (Object.keys(formattedMeals).length === 0) {
      console.log(`[API] No active meals found in database. Adding default meals.`);
      
      // Get the days that are explicitly marked as inactive in the database
      const inactiveDays = allWeeklyMeals
        .filter(meal => meal.active === false)
        .map(meal => meal.day);
      
      console.log(`[API] Days explicitly marked as inactive: [${inactiveDays.join(', ')}]`);
      
      // Define all days of the week (including weekend days)
      const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      console.log(`[API] Adding default meals for all days not marked as inactive: [${allDays.join(', ')}]`);
      
      // Find default meals
      const defaultMeals = await Meal.find({ day: { $exists: true } });
      console.log(`[API] Found ${defaultMeals.length} potential default meals`);
      
      let defaultsAdded = 0;
      
      defaultMeals.forEach((meal: any) => {
        // Only add a default meal if:
        // 1. It has a day property
        // 2. It's not explicitly marked as inactive
        if (
          meal.day && 
          !inactiveDays.includes(meal.day)
        ) {
          console.log(`[API] Adding default meal for ${meal.day}`);
          
          // Convert to plain object and set active to true
          const mealObj = meal.toObject ? meal.toObject() : { ...meal };
          mealObj.active = true;  // All default meals are active unless marked inactive
          
          formattedMeals[meal.day] = mealObj;
          defaultsAdded++;
        } else if (meal.day && inactiveDays.includes(meal.day)) {
          console.log(`[API] Skipping explicitly inactive day ${meal.day}`);
        }
      });
      
      console.log(`[API] Added ${defaultsAdded} default meals`);
    }
    
    console.log(`[API] Final response contains only active days: [${Object.keys(formattedMeals).join(', ')}]`);
    
    // CRITICAL FIX: Explicitly remove Saturday regardless of DB setting
    // This is a temporary fix until the DB values are consistently respected
    if (formattedMeals['saturday']) {
      console.log('[API] CRITICAL FIX: Explicitly removing Saturday from response');
      delete formattedMeals['saturday'];
    }
    
    // Return response with headers to prevent caching
    return new NextResponse(JSON.stringify({ success: true, data: formattedMeals }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate'
      }
    });
  } catch (error) {
    console.error('[API] Error fetching weekly meals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly meals' },
      { status: 500 }
    );
  }
}

// POST handler - assign a meal to a day of the current week
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.day || !data.mealId) {
      return NextResponse.json(
        { success: false, error: 'Day and mealId are required' },
        { status: 400 }
      );
    }
    
    const { day, mealId } = data;
    const { week, year } = getCurrentWeekYear();
    
    await connectToDatabase();
    
    // Check if the meal exists
    const meal = await Meal.findById(mealId);
    if (!meal) {
      return NextResponse.json(
        { success: false, error: 'Meal not found' },
        { status: 404 }
      );
    }
    
    // Update or create the weekly meal assignment
    const weeklyMeal = await WeeklyMeal.findOneAndUpdate(
      { day, week, year },
      { meal: mealId, active: true },
      { upsert: true, new: true }
    ).populate('meal');
    
    return NextResponse.json(
      { success: true, data: weeklyMeal },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error assigning weekly meal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign weekly meal' },
      { status: 500 }
    );
  }
} 