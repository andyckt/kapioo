import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { comboBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Combo from '@/models/Combo';

export async function GET(
  request: Request,
  { params }: RouteContext<{ comboId: string }>
) {
  try {
    await connectToDatabase();
    const { comboId } = await params;
    const combo = await Combo.findOne({ comboId });
    
    if (!combo) {
      return errorJson('Combo not found', 404);
    }
    
    return successJson(combo);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/combos/[comboId]');
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext<{ comboId: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { comboId } = await params;
    const { data, error } = await parseJsonBody(request, comboBodySchema.partial());
    if (error) {
      return error;
    }
    
    const combo = await Combo.findOneAndUpdate(
      { comboId },
      data,
      { new: true, runValidators: true }
    );
    
    if (!combo) {
      return errorJson('Combo not found', 404);
    }
    
    return successJson(combo);
  } catch (error: unknown) {
    return handleRouteError(error, 'PUT /api/combos/[comboId]');
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<{ comboId: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { comboId } = await params;
    
    const combo = await Combo.findOneAndDelete({ comboId });
    
    if (!combo) {
      return errorJson('Combo not found', 404);
    }
    
    return successJson({});
  } catch (error: unknown) {
    return handleRouteError(error, 'DELETE /api/combos/[comboId]');
  }
}
