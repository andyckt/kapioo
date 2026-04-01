import { handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { updateWeeklyMealsWeekYearBodySchema } from '@/lib/contracts/weekly-meals-api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyMeal from '@/models/WeeklyMeal';

// POST handler - update the week and year for all meals
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, updateWeeklyMealsWeekYearBodySchema);
    if (error) {
      return error;
    }

    const { week, year } = data;

    await connectToDatabase();

    // Find all weekly meals
    const allMeals = await WeeklyMeal.find();

    if (allMeals.length === 0) {
      console.log('[Update Week/Year API] No meals found to update');
      return successJson({ message: 'No meals found to update', count: 0 });
    }

    console.log(`[Update Week/Year API] Updating ${allMeals.length} meals to week=${week}, year=${year}`);

    // Update all meals with the new week and year
    const updateResult = await WeeklyMeal.updateMany(
      {}, // Update all documents
      { $set: { week, year } }
    );

    console.log(`[Update Week/Year API] Update result:`, updateResult);

    return successJson({
      message: `Updated ${updateResult.modifiedCount} meals to week ${week}, year ${year}`,
      count: updateResult.modifiedCount,
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/weekly-meals/update-week-year');
  }
}
