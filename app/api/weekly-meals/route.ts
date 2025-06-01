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
    
    // Find weekly meals for the specified week and populate the meal data
    // Only get meals that are explicitly marked as active
    const weeklyMeals = await WeeklyMeal.find({ 
      week,
      year,
      active: true
    }).populate('meal').sort({ day: 1 });
    
    console.log(`[API] Found ${weeklyMeals.length} active meals`);
    
    // Format the response to match the existing data structure
    const formattedMeals: Record<string, any> = {};
    weeklyMeals.forEach((weeklyMeal: any) => {
      // Log the entire weeklyMeal to see all properties
      console.log(`[API] Weekly meal for ${weeklyMeal.day}:`, {
        id: weeklyMeal._id,
        day: weeklyMeal.day,
        activeStatus: weeklyMeal.active,
        mealId: weeklyMeal.meal._id,
        mealProperties: Object.keys(weeklyMeal.meal)
      });
      
      // Important: Explicitly add the active property to the meal object
      const mealObj = weeklyMeal.meal.toObject ? weeklyMeal.meal.toObject() : weeklyMeal.meal;
      mealObj.active = weeklyMeal.active;
      
      formattedMeals[weeklyMeal.day] = mealObj;
      console.log(`[API] Formatted meal for ${weeklyMeal.day} with active=${mealObj.active}`);
    });
    
    // Log which days are included in the final response
    console.log(`[API] Final response contains days: [${Object.keys(formattedMeals).join(', ')}]`);
    
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