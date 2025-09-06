import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import { format, addDays, addWeeks } from 'date-fns';

// Helper function to get next Sunday and Tuesday dates
function getNextDeliveryDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Calculate days until next Sunday (0) and Tuesday (2)
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  
  // If today is Sunday or Tuesday, we want next week's date
  const nextSunday = daysUntilSunday === 0 ? addDays(today, 7) : addDays(today, daysUntilSunday);
  const nextTuesday = daysUntilTuesday === 0 ? addDays(today, 7) : addDays(today, daysUntilTuesday);
  
  // Calculate the following week's dates
  const followingSunday = addWeeks(nextSunday, 1);
  const followingTuesday = addWeeks(nextTuesday, 1);
  
  return {
    currentSunday: format(nextSunday, 'MMM dd'),
    currentTuesday: format(nextTuesday, 'MMM dd'),
    nextSunday: format(followingSunday, 'MMM dd'),
    nextTuesday: format(followingTuesday, 'MMM dd')
  };
}

// GET handler - return all delivery days and their meal options
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Log model information for debugging
    console.log('WeeklyDeliveryDay model info:', {
      modelName: WeeklyDeliveryDay.modelName,
      collection: WeeklyDeliveryDay.collection.name,
      collectionName: 'weeklydeliverydays',
    });
    
    console.log('WeeklyMealOption model info:', {
      modelName: WeeklyMealOption.modelName,
      collection: WeeklyMealOption.collection.name,
      collectionName: 'weeklymealOptions',
    });
    
    // Log the MongoDB URI being used (without credentials)
    const uriWithoutCredentials = process.env.MONGODB_URI 
      ? process.env.MONGODB_URI.replace(/:\/\/[^@]*@/, '://***:***@')
      : 'Not set';
    console.log('MongoDB URI:', uriWithoutCredentials);
    
    // Get all delivery days with their meal options
    const deliveryDays = await WeeklyDeliveryDay.find()
      .populate('options')
      .sort({ weekOffset: 1, day: 1 })
      .lean();
    
    // If no delivery days exist, initialize with default data
    if (deliveryDays.length === 0) {
      const dates = getNextDeliveryDates();
      
      // Create default delivery days
      await WeeklyDeliveryDay.create([
        {
          day: 'sunday',
          name: 'Sunday Delivery',
          date: dates.currentSunday,
          active: true,
          options: [],
          weekOffset: 0
        },
        {
          day: 'tuesday',
          name: 'Tuesday Delivery',
          date: dates.currentTuesday,
          active: true,
          options: [],
          weekOffset: 0
        },
        {
          day: 'sunday',
          name: 'Sunday Delivery',
          date: dates.nextSunday,
          active: true,
          options: [],
          weekOffset: 1
        },
        {
          day: 'tuesday',
          name: 'Tuesday Delivery',
          date: dates.nextTuesday,
          active: true,
          options: [],
          weekOffset: 1
        }
      ]);
      
      // Fetch the newly created delivery days
      const newDeliveryDays = await WeeklyDeliveryDay.find()
        .sort({ weekOffset: 1, day: 1 })
        .lean();
      
      return NextResponse.json(
        { success: true, data: newDeliveryDays },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: deliveryDays },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching weekly subscription data:', error);
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch weekly subscription data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST handler - update delivery day settings
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.day && !data.id) {
      return NextResponse.json(
        { success: false, error: 'Delivery day identifier (day or id) is required' },
        { status: 400 }
      );
    }
    
    // Log the request data for debugging
    console.log('Update delivery day request:', data);
    
    await connectToDatabase();
    
    // Prepare the update data
    const updateData: any = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.active !== undefined) updateData.active = data.active;
    
    // Prepare the query - we'll try to find by day and weekOffset if provided
    let query: any = {};
    
    // If MongoDB ObjectId is provided, use it
    if (data.id && data.id.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = data.id;
    } 
    // Otherwise use day and weekOffset
    else {
      if (data.day) query.day = data.day;
      if (data.weekOffset !== undefined) query.weekOffset = data.weekOffset;
    }
    
    console.log('Query for updating delivery day:', query);
    console.log('Update data:', updateData);
    
    // Update the delivery day
    const updatedDeliveryDay = await WeeklyDeliveryDay.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    ).populate('options');
    
    if (!updatedDeliveryDay) {
      console.log('Delivery day not found with query:', query);
      return NextResponse.json(
        { success: false, error: 'Delivery day not found' },
        { status: 404 }
      );
    }
    
    console.log('Delivery day updated successfully:', {
      id: updatedDeliveryDay._id,
      day: updatedDeliveryDay.day,
      date: updatedDeliveryDay.date,
      active: updatedDeliveryDay.active
    });
    
    return NextResponse.json(
      { success: true, data: updatedDeliveryDay },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating delivery day:', error);
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update delivery day',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
