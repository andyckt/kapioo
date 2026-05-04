import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { weeklySubscriptionDeliveryDayUpdateSchema } from "@/lib/contracts/weekly-subscription";
import WeeklyDeliveryDay from "@/models/WeeklyDeliveryDay";
import { format, addDays, addWeeks } from "date-fns";

function getNextDeliveryDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;

  const nextSunday = daysUntilSunday === 0 ? addDays(today, 7) : addDays(today, daysUntilSunday);
  const nextTuesday = daysUntilTuesday === 0 ? addDays(today, 7) : addDays(today, daysUntilTuesday);

  const followingSunday = addWeeks(nextSunday, 1);
  const followingTuesday = addWeeks(nextTuesday, 1);
  const week3Sunday = addWeeks(nextSunday, 2);
  const week3Tuesday = addWeeks(nextTuesday, 2);

  return {
    currentSunday: format(nextSunday, "MMMM d"),
    currentTuesday: format(nextTuesday, "MMMM d"),
    nextSunday: format(followingSunday, "MMMM d"),
    nextTuesday: format(followingTuesday, "MMMM d"),
    week3Sunday: format(week3Sunday, "MMMM d"),
    week3Tuesday: format(week3Tuesday, "MMMM d"),
  };
}

type WeeklyDeliveryDayRecord = Record<string, unknown> & {
  options?: Array<Record<string, unknown>>
}

function formatDeliveryDaysForAdmin(deliveryDays: WeeklyDeliveryDayRecord[]) {
  return deliveryDays.map((day: WeeklyDeliveryDayRecord) => ({
    ...day,
    options: (Array.isArray(day.options) ? day.options : []).map((option: Record<string, unknown>) => ({
      _id: option._id,
      id: option.id,
      name: option.name,
      nameEn: option.nameEn,
      tags: option.tags,
      active: option.active,
      imageUrl: option.imageUrl,
      imageKey: option.imageKey,
      calories: option.calories,
      allergens: option.allergens,
      description: option.description,
      sourceComboLibraryId: option.sourceComboLibraryId,
      sourceComboLibraryUpdatedAt: option.sourceComboLibraryUpdatedAt,
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
    })),
  }));
}

export async function GET() {
  try {
    await connectToDatabase();

    const deliveryDays = await WeeklyDeliveryDay.find()
      .populate("options")
      .sort({ weekOffset: 1, day: 1 })
      .lean();

    const hasWeek3 = deliveryDays.some((day) => day.weekOffset === 2);

    if (deliveryDays.length === 0) {
      const dates = getNextDeliveryDates();

      await WeeklyDeliveryDay.create([
        {
          day: "sunday",
          name: "Sunday Delivery",
          date: dates.currentSunday,
          active: true,
          options: [],
          weekOffset: 0,
        },
        {
          day: "tuesday",
          name: "Tuesday Delivery",
          date: dates.currentTuesday,
          active: true,
          options: [],
          weekOffset: 0,
        },
        {
          day: "sunday",
          name: "Sunday Delivery",
          date: dates.nextSunday,
          active: true,
          options: [],
          weekOffset: 1,
        },
        {
          day: "tuesday",
          name: "Tuesday Delivery",
          date: dates.nextTuesday,
          active: true,
          options: [],
          weekOffset: 1,
        },
        {
          day: "sunday",
          name: "Sunday Delivery",
          date: dates.week3Sunday,
          active: true,
          options: [],
          weekOffset: 2,
        },
        {
          day: "tuesday",
          name: "Tuesday Delivery",
          date: dates.week3Tuesday,
          active: true,
          options: [],
          weekOffset: 2,
        },
      ]);

      const newDeliveryDays = await WeeklyDeliveryDay.find()
        .populate("options")
        .sort({ weekOffset: 1, day: 1 })
        .lean();

      return successJson(formatDeliveryDaysForAdmin(newDeliveryDays));
    }

    if (!hasWeek3) {
      const dates = getNextDeliveryDates();

      try {
        await WeeklyDeliveryDay.create([
          {
            day: "sunday",
            name: "Sunday Delivery",
            date: dates.week3Sunday,
            active: true,
            options: [],
            weekOffset: 2,
          },
          {
            day: "tuesday",
            name: "Tuesday Delivery",
            date: dates.week3Tuesday,
            active: true,
            options: [],
            weekOffset: 2,
          },
        ]);
      } catch (createError) {
        console.error("Error creating Week 3:", createError);
      }

      const allDeliveryDays = await WeeklyDeliveryDay.find()
        .populate("options")
        .sort({ weekOffset: 1, day: 1 })
        .lean();

      return successJson(formatDeliveryDaysForAdmin(allDeliveryDays));
    }

    return successJson(formatDeliveryDaysForAdmin(deliveryDays));
  } catch (error) {
    return handleRouteError(error, "GET /api/weekly-subscription");
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, weeklySubscriptionDeliveryDayUpdateSchema);
    if (error || !data) {
      return error;
    }

    await connectToDatabase();

    const updateData: Record<string, unknown> = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.active !== undefined) updateData.active = data.active;

    const query: Record<string, unknown> = {};

    if (data.id && /^[0-9a-fA-F]{24}$/.test(data.id)) {
      query._id = data.id;
    } else {
      if (data.day) query.day = data.day;
      if (data.weekOffset !== undefined) query.weekOffset = data.weekOffset;
    }

    const updatedDeliveryDay = await WeeklyDeliveryDay.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    ).populate("options");

    if (!updatedDeliveryDay) {
      return errorJson("Delivery day not found", 404);
    }

    return successJson(formatDeliveryDaysForAdmin([updatedDeliveryDay.toObject()])[0]);
  } catch (error) {
    return handleRouteError(error, "POST /api/weekly-subscription");
  }
}
