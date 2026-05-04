import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { comboBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import { deleteMenuImageFromS3 } from '@/lib/upload/menu-image';
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

    const existingCombo = (await Combo.findOne({ comboId }).lean()) as { imageKey?: unknown } | null;
    if (!existingCombo) {
      return errorJson('Combo not found', 404);
    }

    const updateData: Record<string, unknown> = { ...data };
    const unsetData: Record<string, 1> = {};
    const shouldRemoveImage = Object.prototype.hasOwnProperty.call(data, 'imageUrl') && data.imageUrl === '';
    const previousImageKey = typeof existingCombo.imageKey === 'string' ? existingCombo.imageKey : undefined;
    const nextImageKey = typeof data.imageKey === 'string' && data.imageKey ? data.imageKey : undefined;

    if (shouldRemoveImage) {
      delete updateData.imageUrl;
      delete updateData.imageKey;
      unsetData.imageUrl = 1;
      unsetData.imageKey = 1;
    }

    const updateOperation =
      Object.keys(unsetData).length > 0
        ? {
            ...(Object.keys(updateData).length > 0 ? { $set: updateData } : {}),
            $unset: unsetData,
          }
        : updateData;

    const combo = await Combo.findOneAndUpdate(
      { comboId },
      updateOperation,
      { new: true, runValidators: true }
    );

    if (shouldRemoveImage) {
      void deleteMenuImageFromS3(previousImageKey);
    } else if (previousImageKey && nextImageKey && previousImageKey !== nextImageKey) {
      void deleteMenuImageFromS3(previousImageKey);
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

    if (typeof combo.imageKey === 'string') {
      void deleteMenuImageFromS3(combo.imageKey);
    }
    
    return successJson({});
  } catch (error: unknown) {
    return handleRouteError(error, 'DELETE /api/combos/[comboId]');
  }
}
