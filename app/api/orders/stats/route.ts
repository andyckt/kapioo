import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get current counts of orders by status
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const inDeliveryOrders = await Order.countDocuments({ status: 'delivery' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    const refundedOrders = await Order.countDocuments({ status: 'refunded' });
    
    // Get total orders
    const totalOrders = pendingOrders + deliveredOrders + confirmedOrders + 
                        inDeliveryOrders + cancelledOrders + refundedOrders;
    
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
    
    return NextResponse.json({ 
      success: true, 
      data: {
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
      }
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order statistics' },
      { status: 500 }
    );
  }
} 