import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get total user count
    const totalUsers = await User.countDocuments({});
    
    // For a real application, we would fetch historical data from a database
    // For this demo, we'll simulate "previous period" data as a percentage of current data
    // to get a more realistic growth rate
    
    // Simulate previous period user count (90-95% of current count)
    const simulatePreviousPeriod = (currentCount: number) => {
      // Random factor between 0.90 and 0.95 to simulate previous period data
      const factor = 0.90 + (Math.random() * 0.05);
      return Math.round(currentCount * factor);
    };
    
    const previousUserCount = simulatePreviousPeriod(totalUsers);
    
    // Calculate growth rate
    const calculateGrowthRate = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return Number(((current - previous) / previous * 100).toFixed(1));
    };
    
    const growthRate = calculateGrowthRate(totalUsers, previousUserCount);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        total: totalUsers,
        growthRate
      }
    });
  } catch (error) {
    console.error('Error fetching user count:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user count' },
      { status: 500 }
    );
  }
} 