import { NextResponse } from "next/server";
import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { weeklySubscriptionUserOrderBodySchema } from "@/lib/contracts/weekly-subscription";
import { requireUser } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import {
  InsufficientWeeklyEntitlementError,
  placeWeeklyOrder,
} from "@/lib/orders/place-weekly-order";
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import WeeklyOrder from '@/models/WeeklyOrder';
import User from "@/models/User";
import { format, addDays, addWeeks } from 'date-fns';

// Types for consecutive date validation
interface DeliveryDayForValidation {
  day: string;
  date: string;
  weekOffset: number;
}

interface DateValidationResult {
  isValid: boolean;
  error?: string;
  selectedDates?: string[];
  availableDates?: string[];
}

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
    currentSunday: format(nextSunday, 'MMMM d'),
    currentTuesday: format(nextTuesday, 'MMMM d'),
    nextSunday: format(followingSunday, 'MMMM d'),
    nextTuesday: format(followingTuesday, 'MMMM d'),
    week3Sunday: format(week3Sunday, 'MMMM d'),
    week3Tuesday: format(week3Tuesday, 'MMMM d')
  };
}

async function ensureWeeklyDeliveryDays() {
  const existingDeliveryDays = await WeeklyDeliveryDay.find()
    .sort({ weekOffset: 1, day: 1 })
    .lean();

  const hasWeek3 = existingDeliveryDays.some((day: any) => day.weekOffset === 2);

  if (existingDeliveryDays.length === 0) {
    const dates = getNextDeliveryDates();
    await WeeklyDeliveryDay.create([
      { day: 'sunday', name: 'Sunday Delivery', date: dates.currentSunday, active: true, options: [], weekOffset: 0 },
      { day: 'tuesday', name: 'Tuesday Delivery', date: dates.currentTuesday, active: true, options: [], weekOffset: 0 },
      { day: 'sunday', name: 'Sunday Delivery', date: dates.nextSunday, active: true, options: [], weekOffset: 1 },
      { day: 'tuesday', name: 'Tuesday Delivery', date: dates.nextTuesday, active: true, options: [], weekOffset: 1 },
      { day: 'sunday', name: 'Sunday Delivery', date: dates.week3Sunday, active: true, options: [], weekOffset: 2 },
      { day: 'tuesday', name: 'Tuesday Delivery', date: dates.week3Tuesday, active: true, options: [], weekOffset: 2 }
    ]);
    return;
  }

  if (!hasWeek3) {
    const dates = getNextDeliveryDates();

    try {
      await WeeklyDeliveryDay.create([
        { day: 'sunday', name: 'Sunday Delivery', date: dates.week3Sunday, active: true, options: [], weekOffset: 2 },
        { day: 'tuesday', name: 'Tuesday Delivery', date: dates.week3Tuesday, active: true, options: [], weekOffset: 2 }
      ]);
    } catch (error) {
      console.warn('Week 3 delivery day initialization skipped:', error);
    }
  }
}

// Helper function: Sort delivery days consistently (same as frontend)
function sortDeliveryDays(days: DeliveryDayForValidation[]): DeliveryDayForValidation[] {
  return [...days].sort((a, b) => {
    // First sort by weekOffset
    if (a.weekOffset !== b.weekOffset) {
      return a.weekOffset - b.weekOffset;
    }
    // Then sort by day (sunday=0, tuesday=1)
    const dayOrder: Record<string, number> = { 'sunday': 0, 'tuesday': 1 };
    return (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0);
  });
}

// Helper function: Validate consecutive dates
function validateConsecutiveDates(
  orderItems: Array<{ dayId: string; weekOffset?: number }>,
  allAvailableDeliveryDays: DeliveryDayForValidation[]
): DateValidationResult {
  // Extract unique day+weekOffset combinations from order items
  const uniqueCombinations = Array.from(
    new Set(orderItems.map((item) => `${item.dayId}-${item.weekOffset ?? 0}`))
  ).map(combo => {
    const [dayId, weekOffsetStr] = combo.split('-');
    return { dayId, weekOffset: parseInt(weekOffsetStr, 10) };
  });

  console.log('📋 VALIDATION: Unique combinations in order:', uniqueCombinations);

  // Rule 1: Single date is always valid
  if (uniqueCombinations.length === 1) {
    console.log('✅ VALIDATION: Single date order - VALID');
    return { isValid: true };
  }

  // Rule 2: More than 2 dates is invalid
  if (uniqueCombinations.length > 2) {
    console.log('❌ VALIDATION: More than 2 dates - INVALID');
    return {
      isValid: false,
      error: 'Maximum 2 delivery dates allowed',
    };
  }

  // Rule 3: Exactly 2 dates - check if consecutive
  if (uniqueCombinations.length === 2) {
    // Sort available delivery days (same sorting as frontend)
    const sortedAvailableDays = sortDeliveryDays(allAvailableDeliveryDays);
    
    console.log('📋 VALIDATION: Sorted available days:', sortedAvailableDays.map(d => `${d.day}-week${d.weekOffset} (${d.date})`));

    // Find indices of selected dates in sorted list
    const index1 = sortedAvailableDays.findIndex(
      day => day.day === uniqueCombinations[0].dayId && day.weekOffset === uniqueCombinations[0].weekOffset
    );
    const index2 = sortedAvailableDays.findIndex(
      day => day.day === uniqueCombinations[1].dayId && day.weekOffset === uniqueCombinations[1].weekOffset
    );

    console.log(`📋 VALIDATION: Index of ${uniqueCombinations[0].dayId}-week${uniqueCombinations[0].weekOffset}: ${index1}`);
    console.log(`📋 VALIDATION: Index of ${uniqueCombinations[1].dayId}-week${uniqueCombinations[1].weekOffset}: ${index2}`);

    // Both dates must exist in available list
    if (index1 === -1 || index2 === -1) {
      console.log('❌ VALIDATION: One or both dates not found in available days - INVALID');
      return {
        isValid: false,
        error: 'Selected dates are not available',
      };
    }

    // Check if indices are adjacent (abs difference = 1)
    const isConsecutive = Math.abs(index1 - index2) === 1;

    if (isConsecutive) {
      console.log('✅ VALIDATION: Two consecutive dates - VALID');
      return { isValid: true };
    } else {
      console.log('❌ VALIDATION: Two non-consecutive dates - INVALID');
      
      // Get date strings for error message
      const date1 = sortedAvailableDays[index1]?.date;
      const date2 = sortedAvailableDays[index2]?.date;
      
      return {
        isValid: false,
        error: 'Selected delivery dates must be consecutive. Please select either one date or two consecutive delivery slots.',
        selectedDates: [date1, date2],
        availableDates: sortedAvailableDays.map(d => d.date),
      };
    }
  }

  // Fallback (should never reach here)
  console.log('⚠️ VALIDATION: Unexpected state - defaulting to INVALID');
  return {
    isValid: false,
    error: 'Invalid date selection',
  };
}

// GET handler - return active delivery days and options for users
export async function GET() {
  try {
    await connectToDatabase();
    await ensureWeeklyDeliveryDays();
    
    // Get only active delivery days with active meal options
    const deliveryDays = await WeeklyDeliveryDay.find({ active: true })
      .populate({
        path: 'options',
        match: { active: true }
      })
      .sort({ weekOffset: 1, day: 1 })
      .lean();
    
    // Format the response to match the frontend structure.
    // imageUrl/imageKey are optional and only forwarded when present so we
    // don't pollute legacy options with empty strings on the wire.
    const formattedDeliveryDays = deliveryDays.map((day: any) => ({
      id: day.day,
      name: day.name,
      date: day.date,
      weekOffset: day.weekOffset,
      options: (Array.isArray(day.options) ? day.options : [])
        .filter(Boolean)
        .map((option: any) => ({
        id: option._id,
        name: option.name,
        nameEn: option.nameEn, // Include English name
        tags: Array.isArray(option.tags) ? option.tags : [],
        ...(typeof option.calories === 'number' ? { calories: option.calories } : {}),
        ...(Array.isArray(option.allergens) && option.allergens.length > 0
          ? { allergens: option.allergens }
          : {}),
        ...(typeof option.description === 'string' && option.description.trim()
          ? { description: option.description }
          : {}),
        ...(typeof option.imageUrl === 'string' && option.imageUrl
          ? { imageUrl: option.imageUrl }
          : {}),
        ...(typeof option.imageKey === 'string' && option.imageKey
          ? { imageKey: option.imageKey }
          : {})
      }))
    }));
    
    return successJson(formattedDeliveryDays);
  } catch (error) {
    return handleRouteError(error, "GET /api/weekly-subscription/user");
  }
}

// POST handler - create or update user subscription and create weekly order
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { data, error: bodyError } = await parseJsonBody(request, weeklySubscriptionUserOrderBodySchema);
    if (bodyError || !data) {
      return bodyError;
    }

    const weeklyEntitlementGroupId =
      typeof data.weeklyEntitlementGroupId === 'string' && data.weeklyEntitlementGroupId.trim()
        ? data.weeklyEntitlementGroupId.trim()
        : null;
    const weeklyEntitlementTotalMeals = Number(data.weeklyEntitlementTotalMeals);
    const splitDeliveryCount = Number(data.splitDeliveryCount);

    if (weeklyEntitlementGroupId) {
      if (!Number.isInteger(weeklyEntitlementTotalMeals) || weeklyEntitlementTotalMeals <= 0) {
        return errorJson("Invalid weekly entitlement total meals", 400);
      }

      if (!Number.isInteger(splitDeliveryCount) || splitDeliveryCount <= 1) {
        return errorJson("Invalid split delivery count for weekly entitlement group", 400);
      }
    }
    
    const effectiveUserId =
      actor.role === 'admin' && data.userId
        ? data.userId
        : String(actor.user._id);

    if (
      actor.role !== 'admin' &&
      data.userId &&
      String(data.userId) !== String(actor.user._id) &&
      String(data.userId) !== String(actor.user.userID)
    ) {
      return errorJson("You cannot create subscriptions for another user", 403);
    }
    
    await connectToDatabase();
    
    // Find the user by ID
    const user = await User.findById(effectiveUserId);
    
    if (!user) {
      return errorJson("User not found", 404);
    }
    
    // ✅ IDEMPOTENCY CHECK: Prevent duplicate orders within 60 seconds
    // This protects against accidental double-clicks or network retries
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    
    // Extract dayIds and weekOffsets from the request for comparison
    const requestDayKeys = data.items.map((item: any) => 
      `${item.dayId}-${item.weekOffset ?? 0}`
    ).sort().join(',');
    
    console.log('🔍 IDEMPOTENCY CHECK: Looking for recent orders...');
    console.log('   Request day keys:', requestDayKeys);
    
    // Find recent orders from this user
    const recentOrders = await WeeklyOrder.find({
      userId: user._id,
      createdAt: { $gte: sixtySecondsAgo }
    }).sort({ createdAt: -1 }).limit(5).lean();
    
    if (recentOrders.length > 0) {
      console.log(`   Found ${recentOrders.length} recent order(s), checking for duplicates...`);
      
      // Check each recent order for exact match
      for (const recentOrder of recentOrders) {
        if (
          weeklyEntitlementGroupId &&
          recentOrder.weeklyEntitlementGroupId &&
          String(recentOrder.weeklyEntitlementGroupId) !== weeklyEntitlementGroupId
        ) {
          continue;
        }

        // Create comparable keys from the recent order's items
        // Compare items: check if dayIds, quantities, and optionIds match
        const itemsMatch = data.items.length === recentOrder.items.length &&
          data.items.every((dataItem: any) => {
            return recentOrder.items.some((orderItem: any) => 
              orderItem.dayId === dataItem.dayId &&
              orderItem.quantity === dataItem.quantity &&
              orderItem.optionId === dataItem.optionId
            );
          });
        
        if (itemsMatch) {
          const timeSinceOrder = Math.round((Date.now() - new Date(recentOrder.createdAt).getTime()) / 1000);
          console.log(`⚠️ DUPLICATE ORDER DETECTED!`);
          console.log(`   Recent order: ${recentOrder.orderId}`);
          console.log(`   Created: ${timeSinceOrder} seconds ago`);
          console.log(`   Returning existing order instead of creating duplicate`);
          
          // Return the existing order instead of creating a new one
          return NextResponse.json({
            success: true,
            data: {
              orderId: recentOrder.orderId,
              weeklyEntitlementGroupId: recentOrder.weeklyEntitlementGroupId || null,
              subscription: null,
              isDuplicate: true,
              duplicateOf: recentOrder.orderId,
              message: 'Order already exists',
              timeSinceOriginal: timeSinceOrder
            },
            remainingCredits: user.credits,
            voucherDeducted: false,
            updatedUser: {
              credits: user.credits,
              weeklySIXmeals: user.weeklySIXmeals,
              weeklyEIGHTmeals: user.weeklyEIGHTmeals,
              weeklyTENmeals: user.weeklyTENmeals,
              weeklyTWELVEmeals: user.weeklyTWELVEmeals,
              weeklySIXTEENmeals: user.weeklySIXTEENmeals,
              planBalances: user.planBalances || {}
            }
          });
        }
      }
      
      console.log('   No duplicate found, proceeding with order creation');
    } else {
      console.log('   No recent orders found, proceeding with order creation');
    }
    
    // NEW VALIDATION: Consecutive Dates Rule
    // Only validate on FIRST order (when deductVoucher = true)
    // This prevents validation from running on subsequent orders in multi-date checkout
    if (data.deductVoucher === true) {
      console.log('🔍 CONSECUTIVE VALIDATION: Starting validation (first order in sequence)');
      
      // Fetch all available delivery days for validation
      const availableDeliveryDays = await WeeklyDeliveryDay.find({ active: true })
        .select('day date weekOffset')
        .sort({ weekOffset: 1, day: 1 })
        .lean();
      
      const availableDaysForValidation: DeliveryDayForValidation[] = availableDeliveryDays.map((day: any) => ({
        day: day.day,
        date: day.date,
        weekOffset: day.weekOffset,
      }));
      
      // Validate consecutive dates
      const validation = validateConsecutiveDates(data.items, availableDaysForValidation);
      
      if (!validation.isValid) {
        console.log('❌ CONSECUTIVE VALIDATION: Failed -', validation.error);
        return errorJson(validation.error || "Invalid delivery date selection", 400, {
          details: "Selected delivery dates must be consecutive delivery slots",
          extra: {
            selectedDates: validation.selectedDates,
            availableDates: validation.availableDates,
          },
        });
      }
      
      console.log('✅ CONSECUTIVE VALIDATION: Passed');
    } else {
      console.log('⏭️ CONSECUTIVE VALIDATION: Skipped (subsequent order in multi-date checkout)');
    }
    
    // Calculate total items
    const totalItems = data.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    // Determine which meal plan type to use
    const mealPlanType = data.mealPlanType || 'legacy';
    
    // CRITICAL FIX: Only validate voucher availability if we're going to deduct one
    // For subsequent orders in a multi-date checkout, deductVoucher will be false
    const shouldDeductVoucher = data.deductVoucher === true;
    
    if (shouldDeductVoucher) {
      // Only check if user has enough meals when we're actually going to deduct a voucher
      let hasEnoughMeals = false;
      let availableMeals = 0;
      
      // Check if user has enough of the specified meal plan type
      if (mealPlanType === '6aweek') {
        hasEnoughMeals = user.weeklySIXmeals >= 1;
        availableMeals = user.weeklySIXmeals;
      } else if (mealPlanType === '8aweek') {
        hasEnoughMeals = user.weeklyEIGHTmeals >= 1;
        availableMeals = user.weeklyEIGHTmeals;
      } else if (mealPlanType === '10aweek') {
        hasEnoughMeals = user.weeklyTENmeals >= 1;
        availableMeals = user.weeklyTENmeals;
      } else if (mealPlanType === '12aweek') {
        hasEnoughMeals = user.weeklyTWELVEmeals >= 1;
        availableMeals = user.weeklyTWELVEmeals;
      } else if (mealPlanType === '16aweek') {
        hasEnoughMeals = user.weeklySIXTEENmeals >= 1;
        availableMeals = user.weeklySIXTEENmeals;
      } else {
        // Legacy fallback to credits
        hasEnoughMeals = user.credits >= totalItems;
        availableMeals = user.credits;
      }
      
      // Check if user has enough of the specified meal plan
      if (!hasEnoughMeals) {
        return errorJson("Not enough meal plans", 400, {
          extra: {
            requiredCredits: mealPlanType === "legacy" ? totalItems : 1,
            availableCredits: availableMeals,
            mealPlanType,
          },
        });
      }
    }
    
    // Load meal option names for the order
    const mealOptionIds = data.items.map((item: any) => item.optionId);
    const mealOptions = await WeeklyMealOption.find({
      _id: { $in: mealOptionIds }
    });
    
    // Create a map of option IDs to names
    const optionNameMap: Record<string, string> = {};
    mealOptions.forEach((option: any) => {
      optionNameMap[option._id.toString()] = option.name;
    });
    
    // Load delivery day dates - FIXED: Use weekOffset to get the correct day
    const deliveryDayIds = data.items.map((item: any) => item.dayId);
    const weekOffsets = data.items.map((item: any) => item.weekOffset);
    console.log('🔍 API DEBUG: Looking for delivery days with IDs:', deliveryDayIds);
    console.log('🔍 API DEBUG: With weekOffsets:', weekOffsets);
    
    // Build query conditions for each unique day+weekOffset combination
    const dayWeekCombos = data.items.map((item: any) => ({
      day: item.dayId,
      weekOffset: item.weekOffset
    }));
    
    // Remove duplicates
    const uniqueCombos = Array.from(
      new Map(dayWeekCombos.map((combo: any) => [`${combo.day}-${combo.weekOffset}`, combo])).values()
    ) as Array<{ day: string; weekOffset: number }>;
    
    console.log('🔍 API DEBUG: Unique day+weekOffset combinations:', uniqueCombos);
    
    const deliveryDays = await WeeklyDeliveryDay.find({
      $or: uniqueCombos.map(combo => ({
        day: combo.day,
        weekOffset: combo.weekOffset
      })),
      active: true
    });
    
    console.log('🔍 API DEBUG: Found delivery days from DB:', deliveryDays.map((d: any) => ({ 
      day: d.day, 
      date: d.date, 
      weekOffset: d.weekOffset,
      _id: d._id 
    })));
    
    // Create a map of day IDs + weekOffset to dates (to handle multiple weeks)
    const dayDateMap: Record<string, string> = {};
    deliveryDays.forEach((day: any) => {
      const key = `${day.day}-${day.weekOffset}`;
      dayDateMap[key] = day.date;
      console.log(`🔍 API DEBUG: Mapping "${key}" to date "${day.date}"`);
    });
    
    console.log('🔍 API DEBUG: Final dayDateMap:', dayDateMap);
    
    // Create order items with names and dates - FIXED: Use weekOffset in lookup
    const orderItems = data.items.map((item: any) => {
      const key = `${item.dayId}-${item.weekOffset}`;
      const mappedDate = dayDateMap[key];
      console.log(`🔍 API DEBUG: Creating order item - dayId: ${item.dayId}, weekOffset: ${item.weekOffset}, key: ${key}, mapped date: ${mappedDate}, optionId: ${item.optionId}, quantity: ${item.quantity}`);
      
      return {
        dayId: item.dayId,
        optionId: item.optionId,
        optionName: optionNameMap[item.optionId] || 'Unknown Meal Option',
        quantity: item.quantity,
        date: mappedDate || 'Unknown Date'
      };
    });
    
    console.log('🔍 API DEBUG: Final orderItems to be saved:', JSON.stringify(orderItems, null, 2));

    console.log(`API received deductVoucher=${data.deductVoucher}, will deduct voucher: ${shouldDeductVoucher}`);

    try {
      const { order, subscription, updatedUser } = await placeWeeklyOrder({
        userId: effectiveUserId,
        data,
        orderItems,
        mealPlanType,
        shouldDeductVoucher,
        totalItems,
        weeklyEntitlementGroupId,
        weeklyEntitlementTotalMeals,
        splitDeliveryCount,
        actor,
        request,
      });

      // ✅ SKIP individual order confirmation email
      // Summary email will be sent from frontend after all orders are placed
      console.log('⏭️ Skipping individual order confirmation email (summary email will be sent after all orders)');
      
      // ✅ SKIP individual admin notification emails
      // Admin summary email will be sent from frontend after all orders are placed
      console.log('⏭️ Skipping individual admin notification email (admin summary email will be sent after all orders)');
      
      return NextResponse.json(
        { 
          success: true, 
          data: {
            subscription,
            order
          },
          remainingCredits: updatedUser.credits, // For backward compatibility
          updatedUser: {
            credits: updatedUser.credits,
            weeklySIXmeals: updatedUser.weeklySIXmeals,
            weeklyEIGHTmeals: updatedUser.weeklyEIGHTmeals,
            weeklyTENmeals: updatedUser.weeklyTENmeals,
            weeklyTWELVEmeals: updatedUser.weeklyTWELVEmeals,
            weeklySIXTEENmeals: updatedUser.weeklySIXTEENmeals,
            planBalances: updatedUser.planBalances || {}
          },
          usedMealPlanType: mealPlanType,
          voucherDeducted: shouldDeductVoucher // Include whether a voucher was deducted
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof InsufficientWeeklyEntitlementError) {
        return errorJson(error.message, 400, {
          extra: {
            requiredCredits: error.requiredCredits,
            availableCredits: error.availableCredits,
            mealPlanType: error.mealPlanType,
          },
        });
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/weekly-subscription/user");
  }
}