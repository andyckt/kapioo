import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WeeklyDeliveryDay from '@/models/WeeklyDeliveryDay';
import WeeklyMealOption from '@/models/WeeklyMealOption';
import UserSubscription from '@/models/UserSubscription';
import WeeklyOrder from '@/models/WeeklyOrder';
import User from '@/models/User';
import { nanoid } from 'nanoid';
import { sendWeeklyOrderConfirmationEmail, sendAdminWeeklyOrderNotification } from '@/lib/services/email';

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
  orderItems: Array<{ dayId: string; weekOffset: number }>,
  allAvailableDeliveryDays: DeliveryDayForValidation[]
): DateValidationResult {
  // Extract unique day+weekOffset combinations from order items
  const uniqueCombinations = Array.from(
    new Set(orderItems.map(item => `${item.dayId}-${item.weekOffset}`))
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
export async function GET(request: Request) {
  try {
    console.log('Fetching user subscription data...');
    
    // Make sure WeeklyMealOption model is registered before using it in populate
    if (!WeeklyMealOption) {
      console.error('WeeklyMealOption model not loaded');
    } else {
      console.log('WeeklyMealOption model loaded successfully');
    }
    
    await connectToDatabase();
    
    // Get only active delivery days with active meal options
    const deliveryDays = await WeeklyDeliveryDay.find({ active: true })
      .populate({
        path: 'options',
        match: { active: true }
      })
      .sort({ weekOffset: 1, day: 1 })
      .lean();
    
    // Format the response to match the frontend structure
    const formattedDeliveryDays = deliveryDays.map((day: any) => ({
      id: day.day,
      name: day.name,
      date: day.date,
      weekOffset: day.weekOffset,
      options: day.options.map((option: any) => ({
        id: option._id,
        name: option.name,
        nameEn: option.nameEn, // Include English name
        tags: option.tags
      }))
    }));
    
    return NextResponse.json(
      { success: true, data: formattedDeliveryDays },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user subscription data:', error);
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST handler - create or update user subscription and create weekly order
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    console.log('🔍 API DEBUG: Received POST request with data:', JSON.stringify(data, null, 2));
    console.log('🔍 API DEBUG: Items received:', data.items);
    
    // Validate required fields
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subscription items are required' },
        { status: 400 }
      );
    }
    
    // Validate user ID - this would come from the client's localStorage in a real scenario
    if (!data.userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find the user by ID
    const user = await User.findById(data.userId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
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
        // Create comparable keys from the recent order's items
        const recentDayKeys = recentOrder.items.map((item: any) => 
          `${item.dayId}-${item.date}`
        ).sort().join(',');
        
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
              weeklyTWELVEmeals: user.weeklyTWELVEmeals
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
        return NextResponse.json(
          { 
            success: false, 
            error: validation.error || 'Invalid delivery date selection',
            details: 'Selected delivery dates must be consecutive delivery slots',
            selectedDates: validation.selectedDates,
            availableDates: validation.availableDates,
          },
          { status: 400 }
        );
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
      } else {
        // Legacy fallback to credits
        hasEnoughMeals = user.credits >= totalItems;
        availableMeals = user.credits;
      }
      
      // Check if user has enough of the specified meal plan
      if (!hasEnoughMeals) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Not enough meal plans', 
            requiredCredits: mealPlanType === 'legacy' ? totalItems : 1, 
            availableCredits: availableMeals,
            mealPlanType
          },
          { status: 400 }
        );
      }
    }
    
    // Find existing active subscription for this user
    const existingSubscription = await UserSubscription.findOne({
      userId: user._id,
      status: 'active'
    });
    
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
    );
    
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
    
    // Generate a unique order ID with only numbers
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000); // 8-digit number
    const orderId = `WS-${randomNumbers}`;
    
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
    
    // Create a new weekly order
    const weeklyOrder = await WeeklyOrder.create({
      userId: user._id,
      orderId,
      items: orderItems,
      status: 'pending',
      creditCost: totalItems,
      specialInstructions: data.specialInstructions || '',
      deliveryAddress: data.deliveryAddress || {},
      phoneNumber: data.phoneNumber || '',
      area: data.area || ''
    });
    
    let subscription;
    
    if (existingSubscription) {
      // Update existing subscription
      subscription = await UserSubscription.findByIdAndUpdate(
        existingSubscription._id,
        {
          $set: {
            items: data.items
          }
        },
        { new: true }
      );
    } else {
      // Create new subscription with additional delivery information
      subscription = await UserSubscription.create({
        userId: user._id,
        items: data.items,
        status: 'active',
        specialInstructions: data.specialInstructions || '',
        deliveryAddress: data.deliveryAddress || {},
        phoneNumber: data.phoneNumber || '',
        area: data.area || ''
      });
    }
    
    console.log(`API received deductVoucher=${data.deductVoucher}, will deduct voucher: ${shouldDeductVoucher}`);
    
    let updatedUser = user;
    
    // Only deduct a voucher if the flag is true
    if (shouldDeductVoucher) {
      // Prepare the update object based on meal plan type
      const updateField = mealPlanType === '6aweek' ? 'weeklySIXmeals' :
                         mealPlanType === '8aweek' ? 'weeklyEIGHTmeals' :
                         mealPlanType === '10aweek' ? 'weeklyTENmeals' :
                         mealPlanType === '12aweek' ? 'weeklyTWELVEmeals' :
                         'credits';
      
      const updateObj: any = {
        $inc: {}
      };
      updateObj.$inc[updateField] = mealPlanType === 'legacy' ? -totalItems : -1;
      
      // Update phone number if provided in order
      if (data.phoneNumber && data.phoneNumber.trim()) {
        updateObj.$set = { phone: data.phoneNumber.trim() };
      }
      
      // Deduct from the appropriate meal plan field and update phone
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        updateObj,
        { new: true }
      );
      
      console.log(`Voucher deducted: ${updateField} ${mealPlanType === 'legacy' ? -totalItems : -1}`);
    } else {
      console.log('Skipping voucher deduction as requested');
      
      // Even if not deducting voucher, still update phone number if provided
      if (data.phoneNumber && data.phoneNumber.trim()) {
        updatedUser = await User.findByIdAndUpdate(
          user._id,
          { $set: { phone: data.phoneNumber.trim() } },
          { new: true }
        );
      }
    }
    
    // ✅ SKIP individual order confirmation email
    // Summary email will be sent from frontend after all orders are placed
    console.log('⏭️ Skipping individual order confirmation email (summary email will be sent after all orders)');
    
    // Still send admin notification for each order
    try {
      await sendAdminWeeklyOrderNotification({
        orderId,
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        items: orderItems,
        totalCredits: totalItems,
        area: data.area,
        phoneNumber: data.phoneNumber,
        deliveryAddress: data.deliveryAddress,
        specialInstructions: data.specialInstructions
      });
      console.log(`✅ Admin notification sent for order ${orderId}`);
    } catch (emailError) {
      console.error('Error sending admin notification email:', emailError);
      // Don't fail the API call if email sending fails
    }
    
    return NextResponse.json(
      { 
        success: true, 
        data: {
          subscription,
          order: weeklyOrder
        },
        remainingCredits: updatedUser.credits, // For backward compatibility
        updatedUser: {
          credits: updatedUser.credits,
          weeklySIXmeals: updatedUser.weeklySIXmeals,
          weeklyEIGHTmeals: updatedUser.weeklyEIGHTmeals,
          weeklyTENmeals: updatedUser.weeklyTENmeals,
          weeklyTWELVEmeals: updatedUser.weeklyTWELVEmeals
        },
        usedMealPlanType: mealPlanType,
        voucherDeducted: shouldDeductVoucher // Include whether a voucher was deducted
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing subscription:', error);
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}