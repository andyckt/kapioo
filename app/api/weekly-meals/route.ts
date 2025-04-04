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
    
    await connectToDatabase();
    
    // Find weekly meals for the specified week and populate the meal data
    const weeklyMeals = await WeeklyMeal.find({ 
      week,
      year,
      active: true
    }).populate('meal').sort({ day: 1 });
    
    // Format the response to match the existing data structure
    const formattedMeals: Record<string, any> = {};
    weeklyMeals.forEach((weeklyMeal: any) => {
      formattedMeals[weeklyMeal.day] = weeklyMeal.meal;
    });
    
    // If we have fewer than 7 days, check for any default meals
    if (Object.keys(formattedMeals).length < 7) {
      const defaultMeals = await Meal.find({ day: { $exists: true } });
      defaultMeals.forEach((meal: any) => {
        if (meal.day && !formattedMeals[meal.day]) {
          formattedMeals[meal.day] = meal;
        }
      });
    }
    
    return NextResponse.json({ success: true, data: formattedMeals });
  } catch (error) {
    console.error('Error fetching weekly meals:', error);
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