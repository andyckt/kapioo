import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import UserSubscription from '@/models/UserSubscription';
// Authentication is disabled for now

// GET handler - return active delivery days and options for users
export async function GET(request: Request) {
  try {
    console.log('Fetching user subscription data...');
    
    // Make sure WeeklyMealOption model is registered before using it in populate
    // This helps ensure the model is loaded before WeeklyDeliveryDay tries to use it
    if (!WeeklyMealOption) {
      console.error('WeeklyMealOption model not loaded');
    } else {
      console.log('WeeklyMealOption model loaded successfully');
    }
    
    await connectToDatabase();
    
    // Get only active delivery days with active meal options
    const deliveryDays = await WeeklyDeliveryDay.find({ active: true })
      .populate({
        path: 'options',
        match: { active: true }
      })
      .sort({ weekOffset: 1, day: 1 })
      .lean();
    
    // Format the response to match the frontend structure
    const formattedDeliveryDays = deliveryDays.map((day: any) => ({
      id: day.day,
      name: day.name,
      date: day.date,
      weekOffset: day.weekOffset,
      options: day.options.map((option: any) => ({
        id: option._id,
        name: option.name,
        tags: option.tags
      }))
    }));
    
    return NextResponse.json(
      { success: true, data: formattedDeliveryDays },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user subscription data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription data' },
      { status: 500 }
    );
  }
}

// POST handler - create or update user subscription (simplified for now)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subscription items are required' },
        { status: 400 }
      );
    }
    
    console.log('Processing subscription with items:', data.items);
    
    await connectToDatabase();
    
    // Calculate total items
    const totalItems = data.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    // Create a mock subscription response for testing
    const mockSubscription = {
      id: `subscription-${Date.now()}`,
      items: data.items,
      status: 'active',
      totalItems,
      createdAt: new Date().toISOString()
    };
    
    // In a real implementation with auth, you would:
    // 1. Get the authenticated user
    // 2. Check if they have enough credits
    // 3. Create or update their subscription
    // 4. Deduct credits from their account
    
    return NextResponse.json(
      { 
        success: true, 
        data: mockSubscription,
        message: 'Subscription processed successfully (testing mode)'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing subscription:', error);
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
