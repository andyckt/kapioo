import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { dishBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Dish from '@/models/Dish';

// GET a specific dish by name
export async function GET(
  request: Request,
  { params }: RouteContext<{ name: string }>
) {
  try {
    const { name } = await params;
    await connectToDatabase();
    
    const dish = await Dish.findOne({ name: decodeURIComponent(name) });
    
    if (!dish) {
      return errorJson('Dish not found', 404);
    }
    
    return successJson(dish);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/dishes/[name]');
  }
}

// PUT - Update a dish's English translation
export async function PUT(
  request: Request,
  { params }: RouteContext<{ name: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { name } = await params;
    const { data, error } = await parseJsonBody(request, dishBodySchema.partial());
    if (error) {
      return error;
    }
    await connectToDatabase();
    
    const dish = await Dish.findOneAndUpdate(
      { name: decodeURIComponent(name) },
      { nameEn: data.nameEn },
      { new: true, upsert: true, runValidators: true }
    );
    
    if (!dish) {
      return errorJson('Dish not found', 404);
    }
    
    return successJson(dish);
  } catch (error: unknown) {
    return handleRouteError(error, 'PUT /api/dishes/[name]');
  }
}

