import { NextResponse } from 'next/server';

import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { updateWeeklyMealOptionBodySchema } from '@/lib/contracts/weekly-subscription';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { deleteMenuImageFromS3 } from '@/lib/upload/menu-image';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';

function formatMealOption(option: Record<string, unknown>) {
  return {
    ...option,
    dishes: undefined,
  };
}

// GET handler - return a specific meal option
export async function GET(_request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    ({ id } = await params);
    await connectToDatabase();

    // Get the meal option by ID
    const mealOption = await WeeklyMealOption.findById(id).lean();

    if (!mealOption) {
      return errorJson('Meal option not found', 404);
    }

    return successJson(formatMealOption(mealOption as Record<string, unknown>));
  } catch (error: unknown) {
    return handleRouteError(error, `GET /api/weekly-subscription/meal-options/${id || '[id]'}`);
  }
}

// PUT handler - update a meal option (including optional image)
export async function PUT(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    ({ id } = await params);

    const { data, error } = await parseJsonBody(request, updateWeeklyMealOptionBodySchema);
    if (error) {
      return error;
    }

    await connectToDatabase();

    // Load existing record so we can clean up the old image if it gets replaced.
    // We only need imageKey for cleanup; cast keeps TypeScript happy with .lean().
    const existing = (await WeeklyMealOption.findById(id).lean()) as
      | { imageKey?: unknown }
      | null;

    if (!existing) {
      return errorJson('Meal option not found', 404);
    }

    const setData: Record<string, unknown> = {};
    if (data.name !== undefined) setData.name = data.name;
    if (data.nameEn !== undefined) setData.nameEn = data.nameEn;
    if (data.tags !== undefined) setData.tags = data.tags;
    if (data.tagsEn !== undefined) setData.tagsEn = data.tagsEn;
    if (data.active !== undefined) setData.active = data.active;
    if (data.calories !== undefined) setData.calories = data.calories;
    if (data.proteinGrams !== undefined) setData.proteinGrams = data.proteinGrams;
    if (data.allergens !== undefined) setData.allergens = data.allergens;
    if (data.allergensEn !== undefined) setData.allergensEn = data.allergensEn;
    if (data.description !== undefined) setData.description = data.description;
    if (data.descriptionEn !== undefined) setData.descriptionEn = data.descriptionEn;
    if (data.featuredInMenuPreview !== undefined) {
      setData.featuredInMenuPreview = data.featuredInMenuPreview;
    }
    if (data.sourceComboLibraryId !== undefined) {
      setData.sourceComboLibraryId = data.sourceComboLibraryId;
    }
    if (data.sourceComboLibraryUpdatedAt !== undefined) {
      setData.sourceComboLibraryUpdatedAt = data.sourceComboLibraryUpdatedAt;
    }

    // Image handling mirrors the daily combo PUT route so behavior stays consistent.
    // Empty string for imageUrl is the explicit "remove image" signal from the
    // admin UI; otherwise a non-empty value replaces both URL and key together.
    const unsetData: Record<string, 1> = {};
    const shouldRemoveImage =
      Object.prototype.hasOwnProperty.call(data, 'imageUrl') && data.imageUrl === '';
    const previousImageKey =
      typeof existing.imageKey === 'string' && existing.imageKey ? existing.imageKey : undefined;
    const nextImageKey =
      typeof data.imageKey === 'string' && data.imageKey ? data.imageKey : undefined;

    if (shouldRemoveImage) {
      unsetData.imageUrl = 1;
      unsetData.imageKey = 1;
    } else {
      if (data.imageUrl !== undefined && data.imageUrl !== '') {
        setData.imageUrl = data.imageUrl;
      }
      if (data.imageKey !== undefined && data.imageKey !== '') {
        setData.imageKey = data.imageKey;
      }
    }

    const updateOperation =
      Object.keys(unsetData).length > 0
        ? {
            ...(Object.keys(setData).length > 0 ? { $set: setData } : {}),
            $unset: unsetData,
          }
        : Object.keys(setData).length > 0
          ? { $set: setData }
          : {};

    const updatedMealOption = await WeeklyMealOption.findByIdAndUpdate(id, updateOperation, {
      new: true,
    });

    if (!updatedMealOption) {
      return errorJson('Meal option not found', 404);
    }

    // Best-effort cleanup of the old S3 object so we don't leak storage.
    if (shouldRemoveImage) {
      void deleteMenuImageFromS3(previousImageKey);
    } else if (previousImageKey && nextImageKey && previousImageKey !== nextImageKey) {
      void deleteMenuImageFromS3(previousImageKey);
    }

    return successJson(formatMealOption(updatedMealOption.toObject()));
  } catch (error: unknown) {
    return handleRouteError(error, `PUT /api/weekly-subscription/meal-options/${id || '[id]'}`);
  }
}

// DELETE handler - delete a meal option and remove it from delivery days
export async function DELETE(_request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    const { actor, response } = await requireAdminMfa(_request);
    if (!actor || response) {
      return response;
    }

    ({ id } = await params);
    await connectToDatabase();

    // Find the meal option to be deleted
    const mealOption = await WeeklyMealOption.findById(id);

    if (!mealOption) {
      return errorJson('Meal option not found', 404);
    }

    // Capture image key for post-delete S3 cleanup before we drop the doc.
    const imageKey =
      typeof (mealOption as { imageKey?: unknown }).imageKey === 'string'
        ? ((mealOption as { imageKey?: string }).imageKey as string)
        : undefined;

    // Remove the meal option from all delivery days
    await WeeklyDeliveryDay.updateMany({ options: id }, { $pull: { options: id } });

    // Delete the meal option
    await WeeklyMealOption.findByIdAndDelete(id);

    // Best-effort S3 cleanup. Failure here must never break the API response.
    if (imageKey) {
      void deleteMenuImageFromS3(imageKey);
    }

    return NextResponse.json({ success: true, message: 'Meal option deleted successfully' });
  } catch (error: unknown) {
    return handleRouteError(error, `DELETE /api/weekly-subscription/meal-options/${id || '[id]'}`);
  }
}
