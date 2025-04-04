import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Meal from '@/models/Meal';

interface Params {
  params: {
    id: string;
  };
}

// GET handler - return a specific meal by ID
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = params;
    
    await connectToDatabase();
    const meal = await Meal.findById(id);
    
    if (!meal) {
      return NextResponse.json(
        { success: false, error: 'Meal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: meal });
  } catch (error) {
    console.error(`Error fetching meal ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meal' },
      { status: 500 }
    );
  }
}

// PUT handler - update a specific meal by ID
export async function PUT(request: Request, { params }: Params) {
  try {
    const id = params.id;
    const data = await request.json();
    
    await connectToDatabase();
    
    // Find and update the meal
    const updatedMeal = await Meal.findByIdAndUpdate(
      id, 
      data,
      { new: true, runValidators: true }
    );
    
    if (!updatedMeal) {
      return NextResponse.json(
        { success: false, error: 'Meal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: updatedMeal });
  } catch (error) {
    console.error(`Error updating meal ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update meal' },
      { status: 500 }
    );
  }
}

// DELETE handler - delete a specific meal by ID
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = params;
    
    await connectToDatabase();
    
    // Find and delete the meal
    const deletedMeal = await Meal.findByIdAndDelete(id);
    
    if (!deletedMeal) {
      return NextResponse.json(
        { success: false, error: 'Meal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { message: 'Meal deleted successfully' } 
    });
  } catch (error) {
    console.error(`Error deleting meal ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
} 