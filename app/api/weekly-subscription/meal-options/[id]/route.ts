import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';

// GET handler - return a specific meal option
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    // Get the meal option by ID
    const mealOption = await WeeklyMealOption.findById(id).lean();
    
    if (!mealOption) {
      return NextResponse.json(
        { success: false, error: 'Meal option not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: mealOption },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching meal option:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meal option' },
      { status: 500 }
    );
  }
}

// PUT handler - update a meal option
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    await connectToDatabase();
    
    // Update the meal option
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.active !== undefined) updateData.active = data.active;
    
    const updatedMealOption = await WeeklyMealOption.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedMealOption) {
      return NextResponse.json(
        { success: false, error: 'Meal option not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: updatedMealOption },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating meal option:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update meal option' },
      { status: 500 }
    );
  }
}

// DELETE handler - delete a meal option and remove it from delivery days
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    // Find the meal option to be deleted
    const mealOption = await WeeklyMealOption.findById(id);
    
    if (!mealOption) {
      return NextResponse.json(
        { success: false, error: 'Meal option not found' },
        { status: 404 }
      );
    }
    
    // Remove the meal option from all delivery days
    await WeeklyDeliveryDay.updateMany(
      { options: id },
      { $pull: { options: id } }
    );
    
    // Delete the meal option
    await WeeklyMealOption.findByIdAndDelete(id);
    
    return NextResponse.json(
      { success: true, message: 'Meal option deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting meal option:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete meal option' },
      { status: 500 }
    );
  }
}
