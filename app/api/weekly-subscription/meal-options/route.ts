import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';

// GET handler - return all meal options
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Get all meal options
    const mealOptions = await WeeklyMealOption.find().lean();
    
    return NextResponse.json(
      { success: true, data: mealOptions },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching meal options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meal options' },
      { status: 500 }
    );
  }
}

// POST handler - create a new meal option and add it to a delivery day
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || (!data.day && !data.deliveryDayId)) {
      return NextResponse.json(
        { success: false, error: 'Name and delivery day information (day or deliveryDayId) are required' },
        { status: 400 }
      );
    }
    
    // Log the request data for debugging
    console.log('Create meal option request:', data);
    
    await connectToDatabase();
    
    // Create the new meal option
    const newMealOption = await WeeklyMealOption.create({
      name: data.name,
      nameEn: data.nameEn || undefined, // Optional English name
      tags: data.tags || [],
      active: data.active !== undefined ? data.active : true
    });
    
    console.log('Created new meal option:', {
      id: newMealOption._id,
      name: newMealOption.name,
      tags: newMealOption.tags,
      active: newMealOption.active
    });
    
    // Prepare the query - we'll try to find by day and weekOffset if provided
    let query: any = {};
    
    // If MongoDB ObjectId is provided, use it
    if (data.deliveryDayId && data.deliveryDayId.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = data.deliveryDayId;
    } 
    // Otherwise use day and weekOffset
    else {
      if (data.day) query.day = data.day;
      if (data.weekOffset !== undefined) query.weekOffset = data.weekOffset;
    }
    
    console.log('Query for finding delivery day:', query);
    
    // Add the meal option to the delivery day
    const updatedDeliveryDay = await WeeklyDeliveryDay.findOneAndUpdate(
      query,
      {
        $push: { options: newMealOption._id }
      },
      { new: true }
    ).populate('options');
    
    if (!updatedDeliveryDay) {
      // If delivery day not found, delete the created meal option
      console.log('Delivery day not found with query:', query);
      await WeeklyMealOption.findByIdAndDelete(newMealOption._id);
      
      return NextResponse.json(
        { success: false, error: 'Delivery day not found' },
        { status: 404 }
      );
    }
    
    console.log('Updated delivery day:', {
      id: updatedDeliveryDay._id,
      day: updatedDeliveryDay.day,
      date: updatedDeliveryDay.date,
      optionsCount: updatedDeliveryDay.options.length
    });
    
    return NextResponse.json(
      { 
        success: true, 
        data: {
          mealOption: newMealOption,
          deliveryDay: updatedDeliveryDay
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating meal option:', error);
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create meal option',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
