import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Meal from '@/models/Meal';

// GET handler - return all meals
export async function GET() {
  try {
    await connectToDatabase();
    const meals = await Meal.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: meals });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meals' },
      { status: 500 }
    );
  }
}

// POST handler - create a new meal
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.image || !data.description) {
      return NextResponse.json(
        { success: false, error: 'Name, image, and description are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Create the meal
    const meal = new Meal(data);
    await meal.save();
    
    return NextResponse.json(
      { success: true, data: meal },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create meal' },
      { status: 500 }
    );
  }
} 