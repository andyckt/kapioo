import { handleRouteError, successJson } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';
import WeeklyOrder from '@/models/WeeklyOrder';

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const statuses = ['pending', 'delivered', 'confirmed', 'delivery', 'cancelled', 'refunded'] as const;
    const [
      pendingDaily,
      deliveredDaily,
      confirmedDaily,
      inDeliveryDaily,
      cancelledDaily,
      refundedDaily,
      pendingWeekly,
      deliveredWeekly,
      confirmedWeekly,
      inDeliveryWeekly,
      cancelledWeekly,
      refundedWeekly,
    ] = await Promise.all([
      DailyDeliveryOrder.countDocuments({ status: 'pending' }),
      DailyDeliveryOrder.countDocuments({ status: 'delivered' }),
      DailyDeliveryOrder.countDocuments({ status: 'confirmed' }),
      DailyDeliveryOrder.countDocuments({ status: 'delivery' }),
      DailyDeliveryOrder.countDocuments({ status: 'cancelled' }),
      DailyDeliveryOrder.countDocuments({ status: 'refunded' }),
      WeeklyOrder.countDocuments({ status: 'pending' }),
      WeeklyOrder.countDocuments({ status: 'delivered' }),
      WeeklyOrder.countDocuments({ status: 'confirmed' }),
      WeeklyOrder.countDocuments({ status: 'delivery' }),
      WeeklyOrder.countDocuments({ status: 'cancelled' }),
      WeeklyOrder.countDocuments({ status: 'refunded' }),
    ]);

    const pendingOrders = pendingDaily + pendingWeekly;
    const deliveredOrders = deliveredDaily + deliveredWeekly;
    const confirmedOrders = confirmedDaily + confirmedWeekly;
    const inDeliveryOrders = inDeliveryDaily + inDeliveryWeekly;
    const cancelledOrders = cancelledDaily + cancelledWeekly;
    const refundedOrders = refundedDaily + refundedWeekly;
    
    // Get total orders
    const totalOrders = statuses.reduce((total, status) => {
      switch (status) {
        case 'pending':
          return total + pendingOrders;
        case 'delivered':
          return total + deliveredOrders;
        case 'confirmed':
          return total + confirmedOrders;
        case 'delivery':
          return total + inDeliveryOrders;
        case 'cancelled':
          return total + cancelledOrders;
        case 'refunded':
          return total + refundedOrders;
      }
    }, 0);
    
    // For a real application, we would fetch historical data from a database
    // For this demo, we'll simulate "previous period" data as a percentage of current data
    // This gives us more realistic and dynamic growth rates
    
    // Simulate previous period counts (85-95% of current counts)
    const simulatePreviousPeriod = (currentCount: number) => {
      // Random factor between 0.85 and 0.95 to simulate previous period data
      const factor = 0.85 + (Math.random() * 0.1);
      return Math.round(currentCount * factor);
    };
    
    const previousPendingOrders = simulatePreviousPeriod(pendingOrders);
    const previousDeliveredOrders = simulatePreviousPeriod(deliveredOrders);
    
    // Calculate growth rates
    const calculateGrowthRate = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return Number(((current - previous) / previous * 100).toFixed(1));
    };
    
    const pendingOrdersGrowth = calculateGrowthRate(pendingOrders, previousPendingOrders);
    const deliveredOrdersGrowth = calculateGrowthRate(deliveredOrders, previousDeliveredOrders);
    
    // Calculate most popular day for orders
    // For a real implementation, we would analyze past orders
    // For this demo, we'll use a fixed day with some randomness
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const randomIndex = Math.floor(Math.random() * days.length);
    const popularDay = days[randomIndex];
    
    // Simulate popular day change (-5 to +5%)
    const popularDayChange = Number((Math.random() * 10 - 5).toFixed(1));
    
    return successJson({
        totalOrders,
        pendingOrders,
        deliveredOrders,
        confirmedOrders,
        inDeliveryOrders,
        cancelledOrders,
        refundedOrders,
        pendingOrdersGrowth,
        deliveredOrdersGrowth,
        popularDay,
        popularDayChange
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/orders/stats');
  }
} 