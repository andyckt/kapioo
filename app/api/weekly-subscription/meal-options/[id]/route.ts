import { NextResponse } from 'next/server';

import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { updateWeeklyMealOptionBodySchema } from '@/lib/contracts/weekly-subscription';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';

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

    return successJson(mealOption);
  } catch (error: unknown) {
    return handleRouteError(error, `GET /api/weekly-subscription/meal-options/${id || '[id]'}`);
  }
}

// PUT handler - update a meal option
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

    // Update the meal option
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.active !== undefined) updateData.active = data.active;

    const updatedMealOption = await WeeklyMealOption.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    if (!updatedMealOption) {
      return errorJson('Meal option not found', 404);
    }

    return successJson(updatedMealOption);
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

    // Remove the meal option from all delivery days
    await WeeklyDeliveryDay.updateMany({ options: id }, { $pull: { options: id } });

    // Delete the meal option
    await WeeklyMealOption.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Meal option deleted successfully' });
  } catch (error: unknown) {
    return handleRouteError(error, `DELETE /api/weekly-subscription/meal-options/${id || '[id]'}`);
  }
}
