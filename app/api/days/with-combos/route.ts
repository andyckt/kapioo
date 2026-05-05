import { NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/api';
import connectToDatabase from '@/lib/db';
import Day from '@/models/Day';
import Combo from '@/models/Combo';

/**
 * 🚀 OPTIMIZED ENDPOINT for Admin Dashboard
 * Fetches ALL days (active and inactive) with their combos in a single request
 * This eliminates the N+1 query problem and reduces loading time significantly
 * 
 * Performance: Instead of making 1 + N requests (1 for days, N for combos),
 * this makes only 2 database queries total (1 for days, 1 for all combos)
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Parse query parameters for filtering
    const url = new URL(request.url);
    const isActiveParam = url.searchParams.get('isActive');
    
    // Build query
    const query: Record<string, unknown> = {};
    if (isActiveParam !== null) {
      query.isActive = isActiveParam === 'true';
    }
    
    // Fetch all days (or filtered by isActive)
    const days = await Day.find(query).sort({ week: 1 }).lean();
    
    if (!days || days.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }
    
    // Extract all dayIds
    const dayIds = days.map(day => day.dayId);
    
    // 🚀 OPTIMIZATION: Fetch all combos for these days in a SINGLE query
    const combos = await Combo.find({ 
      dayId: { $in: dayIds } 
    }).lean();
    
    console.log(`✅ Fetched ${days.length} days and ${combos.length} combos in 2 queries (optimized)`);
    
    // Group combos by dayId for efficient lookup
    const combosByDay: Record<string, Array<Record<string, unknown>>> = {};
    combos.forEach((combo) => {
      if (!combosByDay[combo.dayId]) {
        combosByDay[combo.dayId] = [];
      }
      combosByDay[combo.dayId].push({
        comboId: combo.comboId,
        name: combo.name,
        calories: combo.calories,
        proteinGrams: combo.proteinGrams,
        tags: combo.tags,
        tagsEn: combo.tagsEn,
        allergensZh: combo.allergensZh,
        allergensEn: combo.allergensEn,
        descriptionZh: combo.descriptionZh,
        descriptionEn: combo.descriptionEn,
        typeA: combo.typeA,
        typeB: combo.typeB,
        imageUrl: combo.imageUrl,
        imageKey: combo.imageKey
      });
    });
    
    // Combine days with their combos
    const daysWithCombos = days.map(day => ({
      dayId: day.dayId,
      displayName: day.displayName,
      date: day.date,
      week: day.week,
      isActive: day.isActive,
      combos: combosByDay[day.dayId] || []
    }));
    
    return NextResponse.json({
      success: true,
      data: daysWithCombos,
      meta: {
        totalDays: days.length,
        totalCombos: combos.length,
        optimized: true
      }
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/days/with-combos');
  }
}

