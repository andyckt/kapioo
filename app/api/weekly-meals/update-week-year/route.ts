import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyMeal from '@/models/WeeklyMeal';

// POST handler - update the week and year for all meals
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('[Update Week/Year API] Received request:', data);
    
    // Validate input
    if (!data.week || !data.year) {
      console.log('[Update Week/Year API] Missing week or year');
      return NextResponse.json(
        { success: false, error: 'Week and year are required' },
        { status: 400 }
      );
    }
    
    const { week, year } = data;
    
    // Validate week and year values
    if (week < 1 || week > 53) {
      return NextResponse.json(
        { success: false, error: 'Week must be between 1 and 53' },
        { status: 400 }
      );
    }
    
    if (year < 2023 || year > 2050) {
      return NextResponse.json(
        { success: false, error: 'Year must be between 2023 and 2050' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find all weekly meals
    const allMeals = await WeeklyMeal.find();
    
    if (allMeals.length === 0) {
      console.log('[Update Week/Year API] No meals found to update');
      return NextResponse.json({ 
        success: true, 
        data: { message: 'No meals found to update', count: 0 } 
      });
    }
    
    console.log(`[Update Week/Year API] Updating ${allMeals.length} meals to week=${week}, year=${year}`);
    
    // Update all meals with the new week and year
    const updateResult = await WeeklyMeal.updateMany(
      {}, // Update all documents
      { $set: { week, year } }
    );
    
    console.log(`[Update Week/Year API] Update result:`, updateResult);
    
    return NextResponse.json({
      success: true,
      data: {
        message: `Updated ${updateResult.modifiedCount} meals to week ${week}, year ${year}`,
        count: updateResult.modifiedCount
      }
    });
  } catch (error) {
    console.error('[Update Week/Year API] Error updating week/year:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update week and year' },
      { status: 500 }
    );
  }
} 