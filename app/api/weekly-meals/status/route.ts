import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { weeklyMealDayActiveBodySchema } from '@/lib/contracts/weekly-meals-api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import WeeklyMeal from '@/models/WeeklyMeal';
import Meal from '@/models/Meal';

// Helper function to get current week and year
function getCurrentWeekYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in a week
  const week = Math.floor(diff / oneWeek) + 1;
  return { week, year: now.getFullYear() };
}

const noStoreHeaders = {
  'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
} as const;

// PATCH handler - update active status for a day
export async function PATCH(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, weeklyMealDayActiveBodySchema);
    if (error) {
      return error;
    }

    const { day, active } = data;
    const { week, year } = getCurrentWeekYear();
    console.log(`[Status API] Looking for meal for day=${day}, week=${week}, year=${year}`);

    await connectToDatabase();

    // Find the weekly meal entry - first try the current week/year
    let existingEntry = await WeeklyMeal.findOne({ day, week, year });

    // If not found, try to find an entry for this day with any week/year
    if (!existingEntry) {
      console.log(
        `[Status API] No meal found for current week/year. Searching for any entry for day=${day}`
      );
      existingEntry = await WeeklyMeal.findOne({ day }).sort({ year: -1, week: -1 });
    }

    if (!existingEntry) {
      console.log(
        `[Status API] No meal found for day=${day} in any week/year. Creating a new entry with active=${active}`
      );

      // Create a new entry to track the active status
      // We'll use a placeholder meal if needed - this won't be shown to users but allows us to store the active flag
      const defaultMeals = await Meal.find({ day }).limit(1);
      let mealId;

      if (defaultMeals.length > 0) {
        // Use an existing meal with this day if available
        mealId = defaultMeals[0]._id;
        console.log(`[Status API] Using existing meal for ${day}: ${mealId}`);
      } else {
        // If no meal exists for this day, find any meal to use as a placeholder
        const anyMeal = await Meal.findOne();
        if (!anyMeal) {
          console.log(`[Status API] No meals available in database to use as placeholder`);
          return errorJson('No meals available in database', 500);
        }
        mealId = anyMeal._id;
        console.log(`[Status API] Using placeholder meal: ${mealId}`);
      }

      // Create a new weekly meal entry with the specified active status
      existingEntry = await WeeklyMeal.create({
        day,
        week,
        year,
        meal: mealId,
        active,
      });

      console.log(`[Status API] Created new entry for ${day} with active=${active}`);
    } else {
      console.log(
        `[Status API] Found meal for ${day} (week=${existingEntry.week}, year=${existingEntry.year}). Current active=${existingEntry.active}, setting to active=${active}`
      );

      // Update the active status
      existingEntry.active = active;
      await existingEntry.save();

      console.log(`[Status API] Successfully updated ${day} to active=${active}`);
    }

    // Pull the updated record to confirm the change
    const updatedEntry = await WeeklyMeal.findById(existingEntry._id);
    console.log(`[Status API] Confirmed status after update: active=${updatedEntry?.active}`);

    const res = successJson({
      day,
      active: updatedEntry?.active, // Use the confirmed value from the database
      week: existingEntry.week,
      year: existingEntry.year,
      meal: existingEntry.meal,
    });
    Object.entries(noStoreHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: unknown) {
    return handleRouteError(error, 'PATCH /api/weekly-meals/status');
  }
}
