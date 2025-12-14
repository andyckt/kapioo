import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Day from '@/models/Day';
import Combo from '@/models/Combo';

/**
 * Optimized endpoint that fetches active days with their combos in a single request
 * This eliminates the N+1 query problem and reduces loading time significantly
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Fetch all active days
    const days = await Day.find({ isActive: true }).sort({ week: 1 }).lean();
    
    if (!days || days.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }
    
    // Extract all dayIds
    const dayIds = days.map(day => day.dayId);
    
    // Fetch all combos for these days in a single query
    const combos = await Combo.find({ 
      dayId: { $in: dayIds } 
    }).lean();
    
    // Group combos by dayId for efficient lookup
    const combosByDay: Record<string, any[]> = {};
    combos.forEach((combo) => {
      if (!combosByDay[combo.dayId]) {
        combosByDay[combo.dayId] = [];
      }
      combosByDay[combo.dayId].push({
        comboId: combo.comboId,
        name: combo.name,
        calories: combo.calories,
        tags: combo.tags,
        typeA: combo.typeA,
        typeB: combo.typeB
      });
    });
    
    // Combine days with their combos
    const daysWithCombos = days.map(day => ({
      dayId: day.dayId,
      displayName: day.displayName,
      date: day.date,
      week: day.week,
      combos: combosByDay[day.dayId] || []
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: daysWithCombos 
    });
  } catch (error) {
    console.error('Error fetching active days with combos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

