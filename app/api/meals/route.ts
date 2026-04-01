import { handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { mealBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Meal from '@/models/Meal';

// GET handler - return all meals
export async function GET() {
  try {
    await connectToDatabase();
    const meals = await Meal.find({}).sort({ createdAt: -1 });
    
    return successJson(meals);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/meals');
  }
}

// POST handler - create a new meal
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, mealBodySchema);
    if (error) {
      return error;
    }
    
    await connectToDatabase();
    
    // Create the meal
    const meal = new Meal(data);
    await meal.save();
    
    return successJson(meal, 201);
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/meals');
  }
} 