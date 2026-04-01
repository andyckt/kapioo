import { handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { comboBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Combo from '@/models/Combo';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const combos = await Combo.find({});
    return successJson(combos);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/combos');
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { data, error } = await parseJsonBody(request, comboBodySchema);
    if (error) {
      return error;
    }
    
    const combo = await Combo.create(data);
    return successJson(combo, 201);
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/combos');
  }
}
