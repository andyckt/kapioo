import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';

// Define the interface for the WeeklyOrder document
interface WeeklyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: any[];
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  creditCost: number;
  specialInstructions?: string;
  deliveryAddress: {
    unitNumber?: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    buzzCode?: string;
  };
  phoneNumber: string;
  area: string;
  confirmedAt?: Date;
  deliveredAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Create a schema for weekly orders
const WeeklyOrderSchema = new mongoose.Schema({
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
  creditCost: {
    type: Number,
    required: true
  },
  specialInstructions: String,
  deliveryAddress: {
    unitNumber: String,
    streetAddress: String,
    city: String,
    province: String,
    postalCode: String,
    country: String,
    buzzCode: String
  },
  phoneNumber: String,
  area: String,
  confirmedAt: Date,
  deliveredAt: Date,
  refundedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model
const WeeklyOrder = mongoose.models.WeeklyOrder || 
  mongoose.model<WeeklyOrderDocument>('WeeklyOrder', WeeklyOrderSchema);

// GET handler - get all weekly subscription orders with pagination and filtering
export async function GET(request: Request) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
    await connectToDatabase();
    
    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const area = url.searchParams.get('area');
    const mealPlanType = url.searchParams.get('mealPlanType');
    const deliveryStartDate = url.searchParams.get('deliveryStartDate');
    const deliveryEndDate = url.searchParams.get('deliveryEndDate');
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter by area if provided
    if (area) {
      query.area = area;
    }
    
    // Filter by meal plan type if provided
    if (mealPlanType) {
      query.mealPlanType = mealPlanType;
    }
    
    // Helper function to parse and format dates in various formats
    function parseAndFormatDate(dateStr: string): string {
      try {
        // First try standard parsing
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
          // Get month and day parts
          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
          const day = dateObj.getDate();
          // Format with leading zero for days under 10
          const formattedDay = day < 10 ? `0${day}` : `${day}`;
          return `${month} ${formattedDay}`;
        }
        
        // Handle 'MM DD' format (e.g., '04 01' for April 1)
        const mmDdMatch = dateStr.match(/^(\d{1,2})\s+(\d{1,2})$/);
        if (mmDdMatch) {
          const month = parseInt(mmDdMatch[1]) - 1; // JS months are 0-indexed
          const day = parseInt(mmDdMatch[2]);
          if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
            const year = new Date().getFullYear();
            const dateObj = new Date(year, month, day);
            // Get month name
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
            // Format with leading zero for days under 10
            const formattedDay = day < 10 ? `0${day}` : `${day}`;
            return `${monthName} ${formattedDay}`;
          }
        }
        
        // If all parsing attempts fail, return the original string
        // This allows direct matching of database formats like 'Oct 26'
        return dateStr;
      } catch (e) {
        console.error('Error parsing date:', dateStr, e);
        return dateStr;
      }
    }
    
    // Filter by delivery date range if provided
    if (deliveryStartDate || deliveryEndDate) {
      // Create a date range filter for items.date
      // We need to use MongoDB's $elemMatch to filter array elements that match our criteria
      const dateFilter: any = {};
      
      if (deliveryStartDate) {
        // Parse the date string into a JavaScript Date object
        const startDateObj = new Date(deliveryStartDate);
        // Format the date as a string in the format used in the database (e.g., 'Nov 02')
        // Use custom formatting to ensure leading zeros for days under 10
        const month = startDateObj.toLocaleDateString('en-US', { month: 'short' });
        const day = startDateObj.getDate();
        const formattedDay = day < 10 ? `0${day}` : `${day}`;
        const formattedStartDate = `${month} ${formattedDay}`;
        console.log(`Formatted start date: ${formattedStartDate}`);
        dateFilter.$gte = formattedStartDate;
      }
      
      if (deliveryEndDate) {
        // Parse the date string into a JavaScript Date object
        const endDateObj = new Date(deliveryEndDate);
        // Format the date as a string in the format used in the database (e.g., 'Nov 02')
        // Use custom formatting to ensure leading zeros for days under 10
        const month = endDateObj.toLocaleDateString('en-US', { month: 'short' });
        const day = endDateObj.getDate();
        const formattedDay = day < 10 ? `0${day}` : `${day}`;
        const formattedEndDate = `${month} ${formattedDay}`;
        console.log(`Formatted end date: ${formattedEndDate}`);
        dateFilter.$lte = formattedEndDate;
      }
      
      // Use $elemMatch to find documents where at least one item in the items array matches our date criteria
      if (Object.keys(dateFilter).length > 0) {
        query['items'] = {
          $elemMatch: {
            date: dateFilter
          }
        };
      }
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        // Add one day to include the end date fully
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        query.createdAt.$lt = endDateObj;
      }
    }
    
    // Search functionality
    if (search) {
      // First, try to find users matching the search term
      const searchRegex = new RegExp(search, 'i');
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex }
        ]
      }).select('_id').lean();
      
      // Extract user IDs from the matching users
      const matchingUserIds = matchingUsers.map(user => user._id);
      
      // Build the search query with multiple conditions
      query.$or = [
        { orderId: searchRegex },                         // Search by order ID
        { 'items.optionName': searchRegex },              // Search by meal option name
        { 'deliveryAddress.streetAddress': searchRegex }, // Search by street address
        { 'deliveryAddress.city': searchRegex },          // Search by city
        { 'deliveryAddress.postalCode': searchRegex },    // Search by postal code
        { phoneNumber: searchRegex },                     // Search by phone number
        { area: searchRegex }                             // Search by area
      ];
      
      // Add user IDs to the search if we found matching users
      if (matchingUserIds.length > 0) {
        query.$or.push({ userId: { $in: matchingUserIds } });
      }
      
      // If search is a valid ObjectId, also search by userId directly
      if (mongoose.Types.ObjectId.isValid(search)) {
        query.$or.push({ userId: search });
      }
    }
    
    // Find orders with pagination
    const orders = await WeeklyOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email phoneNumber')
      .lean();
    
    // Get total count for pagination
    const totalOrders = await WeeklyOrder.countDocuments(query);
    
    // Fetch user information for each order
    const ordersWithUserInfo = await Promise.all(orders.map(async (order: any) => {
      try {
        const user = await User.findById(order.userId).select('name email').lean();
        return {
          ...order,
          user
        };
      } catch (error) {
        return {
          ...order,
          user: null
        };
      }
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        orders: ordersWithUserInfo,
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching weekly subscription orders:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}
