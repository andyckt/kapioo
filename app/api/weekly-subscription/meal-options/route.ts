import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { createWeeklyMealOptionBodySchema } from '@/lib/contracts/weekly-subscription';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';

// GET handler - return all meal options
export async function GET() {
  try {
    await connectToDatabase();

    // Get all meal options
    const mealOptions = await WeeklyMealOption.find().lean();

    return successJson(mealOptions);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/weekly-subscription/meal-options');
  }
}

// POST handler - create a new meal option and add it to a delivery day
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, createWeeklyMealOptionBodySchema);
    if (error) {
      return error;
    }

    console.log('Create meal option request:', data);

    await connectToDatabase();

    // Create the new meal option
    const newMealOption = await WeeklyMealOption.create({
      name: data.name,
      nameEn: data.nameEn || undefined, // Optional English name
      tags: data.tags || [],
      active: data.active !== undefined ? data.active : true,
      // Image fields are optional. Empty strings from the client are treated
      // as "no image" so we don't store stale empty strings on new docs.
      imageUrl: data.imageUrl ? data.imageUrl : undefined,
      imageKey: data.imageKey ? data.imageKey : undefined,
      dishes: data.dishes,
      calories: data.calories,
      allergens: data.allergens,
      description: data.description || undefined,
      sourceComboLibraryId: data.sourceComboLibraryId || undefined,
      sourceComboLibraryUpdatedAt: data.sourceComboLibraryUpdatedAt,
    });

    console.log('Created new meal option:', {
      id: newMealOption._id,
      name: newMealOption.name,
      tags: newMealOption.tags,
      active: newMealOption.active,
    });

    // Prepare the query - we'll try to find by day and weekOffset if provided
    const query: Record<string, unknown> = {};

    // If MongoDB ObjectId is provided, use it
    if (data.deliveryDayId && data.deliveryDayId.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = data.deliveryDayId;
    }
    // Otherwise use day and weekOffset
    else {
      if (data.day) query.day = data.day;
      if (data.weekOffset !== undefined) query.weekOffset = data.weekOffset;
    }

    console.log('Query for finding delivery day:', query);

    // Add the meal option to the delivery day
    const updatedDeliveryDay = await WeeklyDeliveryDay.findOneAndUpdate(
      query,
      {
        $push: { options: newMealOption._id },
      },
      { new: true }
    ).populate('options');

    if (!updatedDeliveryDay) {
      // If delivery day not found, delete the created meal option
      console.log('Delivery day not found with query:', query);
      await WeeklyMealOption.findByIdAndDelete(newMealOption._id);

      return errorJson('Delivery day not found', 404);
    }

    console.log('Updated delivery day:', {
      id: updatedDeliveryDay._id,
      day: updatedDeliveryDay.day,
      date: updatedDeliveryDay.date,
      optionsCount: updatedDeliveryDay.options.length,
    });

    return successJson(
      {
        mealOption: newMealOption,
        deliveryDay: updatedDeliveryDay,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating meal option:', error);

    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return handleRouteError(error, 'POST /api/weekly-subscription/meal-options');
  }
}
