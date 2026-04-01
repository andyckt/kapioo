import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { mealBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Meal from '@/models/Meal';

// GET handler - return a specific meal by ID
export async function GET(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    ({ id } = await params);
    
    await connectToDatabase();
    const meal = await Meal.findById(id);
    
    if (!meal) {
      return errorJson('Meal not found', 404);
    }
    
    return successJson(meal);
  } catch (error: unknown) {
    return handleRouteError(error, `GET /api/meals/${id || '[id]'}`);
  }
}

// PUT handler - update a specific meal by ID
export async function PUT(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    ({ id } = await params);
    const { data, error } = await parseJsonBody(request, mealBodySchema.partial());
    if (error) {
      return error;
    }
    
    await connectToDatabase();
    
    // Find and update the meal
    const updatedMeal = await Meal.findByIdAndUpdate(
      id, 
      data,
      { new: true, runValidators: true }
    );
    
    if (!updatedMeal) {
      return errorJson('Meal not found', 404);
    }
    
    return successJson(updatedMeal);
  } catch (error: unknown) {
    return handleRouteError(error, `PUT /api/meals/${id || '[id]'}`);
  }
}

// DELETE handler - delete a specific meal by ID
export async function DELETE(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    ({ id } = await params);
    
    await connectToDatabase();
    
    // Find and delete the meal
    const deletedMeal = await Meal.findByIdAndDelete(id);
    
    if (!deletedMeal) {
      return errorJson('Meal not found', 404);
    }
    
    return successJson({ 
      message: 'Meal deleted successfully' 
    });
  } catch (error: unknown) {
    return handleRouteError(error, `DELETE /api/meals/${id || '[id]'}`);
  }
} 