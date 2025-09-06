import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import UserSubscription from '@/models/UserSubscription';
import User from '@/models/User';

// GET handler - return active delivery days and options for users
export async function GET(request: Request) {
  try {
    console.log('Fetching user subscription data...');
    
    // Make sure WeeklyMealOption model is registered before using it in populate
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
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST handler - create or update user subscription
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
    
    // Validate user ID - this would come from the client's localStorage in a real scenario
    if (!data.userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find the user by ID
    const user = await User.findById(data.userId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Calculate total items
    const totalItems = data.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    // Check if user has enough credits
    if (user.credits < totalItems) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not enough credits', 
          requiredCredits: totalItems, 
          availableCredits: user.credits 
        },
        { status: 400 }
      );
    }
    
    // Find existing active subscription for this user
    const existingSubscription = await UserSubscription.findOne({
      userId: user._id,
      status: 'active'
    });
    
    let subscription;
    
    if (existingSubscription) {
      // Update existing subscription
      subscription = await UserSubscription.findByIdAndUpdate(
        existingSubscription._id,
        {
          $set: {
            items: data.items
          }
        },
        { new: true }
      );
    } else {
      // Create new subscription
      subscription = await UserSubscription.create({
        userId: user._id,
        items: data.items,
        status: 'active'
      });
      
      // Deduct credits from user
      await User.findByIdAndUpdate(
        user._id,
        {
          $inc: { credits: -totalItems }
        }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        data: subscription,
        remainingCredits: user.credits - totalItems
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