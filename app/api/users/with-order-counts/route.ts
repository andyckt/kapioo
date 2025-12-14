import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Order from '@/models/Order';
import WeeklyOrder from '@/models/WeeklyOrder';
import mongoose from 'mongoose';

// Define DailyDeliveryOrder schema inline (not a separate model file)
interface DailyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyDeliveryOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  items: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Get or create the model
const DailyDeliveryOrder = mongoose.models.DailyDeliveryOrder || 
  mongoose.model<DailyOrderDocument>('DailyDeliveryOrder', DailyDeliveryOrderSchema);

/**
 * Optimized endpoint that fetches users with their order counts in a single request
 * This eliminates the N+1 query problem and reduces loading time significantly
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const searchType = searchParams.get('searchType') || 'all';
    
    // Build search query
    let query: any = {};
    
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      if (searchType === 'all') {
        // Search across all fields
        query.$or = [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { userID: { $regex: searchTerm, $options: 'i' } }
        ];
      } else if (searchType === 'name') {
        query.name = { $regex: searchTerm, $options: 'i' };
      } else if (searchType === 'email') {
        query.email = { $regex: searchTerm, $options: 'i' };
      } else if (searchType === 'userID') {
        query.userID = { $regex: searchTerm, $options: 'i' };
      }
    }
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Fetch users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0
        }
      });
    }
    
    // Extract user IDs for batch querying
    const userIds = users.map(user => user._id);
    
    // 🚀 OPTIMIZATION: Fetch all order counts in parallel using aggregation
    const [totalOrderCounts, dailyOrderCounts, weeklyOrderCounts] = await Promise.all([
      // Total orders (from Order model)
      Order.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]),
      
      // Daily delivery orders
      DailyDeliveryOrder.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]),
      
      // Weekly subscription orders
      WeeklyOrder.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ])
    ]);
    
    // Create lookup maps for O(1) access
    const totalOrderMap = new Map(
      totalOrderCounts.map(item => [item._id.toString(), item.count])
    );
    const dailyOrderMap = new Map(
      dailyOrderCounts.map(item => [item._id.toString(), item.count])
    );
    const weeklyOrderMap = new Map(
      weeklyOrderCounts.map(item => [item._id.toString(), item.count])
    );
    
    // Combine users with their order counts
    const usersWithCounts = users.map(user => ({
      ...user,
      totalOrders: totalOrderMap.get(user._id.toString()) || 0,
      dailyOrdersCount: dailyOrderMap.get(user._id.toString()) || 0,
      weeklyOrdersCount: weeklyOrderMap.get(user._id.toString()) || 0
    }));
    
    // Calculate pagination
    const pages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      data: usersWithCounts,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching users with order counts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

