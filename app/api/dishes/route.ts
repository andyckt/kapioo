import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { dishBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Dish from '@/models/Dish';

// GET all dishes
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const dishes = await Dish.find({}).sort({ name: 1 });
    return successJson(dishes);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/dishes');
  }
}

// POST - Create or update a dish (upsert)
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { data, error } = await parseJsonBody(request, dishBodySchema);
    if (error) {
      return error;
    }
    
    // Upsert: Create if not exists, update if exists
    const dish = await Dish.findOneAndUpdate(
      { name: data.name },
      { 
        name: data.name,
        nameEn: data.nameEn || undefined
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    );
    
    return successJson(dish, 201);
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/dishes');
  }
}

