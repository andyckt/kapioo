import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

// Define the interface for the WeeklyOrder document
interface WeeklyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: Array<{
    dayId: string;
    optionId: string;
    optionName: string;
    quantity: number;
    date: string;
  }>;
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  creditCost: number;
  mealPlanType?: '6aweek' | '8aweek' | '10aweek' | '12aweek';
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

// Create schema for weekly orders
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
  items: [{
    dayId: String,
    optionId: String,
    optionName: String,
    quantity: Number,
    date: String
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  creditCost: {
    type: Number,
    default: 0
  },
  mealPlanType: {
    type: String,
    enum: ['6aweek', '8aweek', '10aweek', '12aweek']
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

// GET handler - get all unique delivery dates from orders
export async function GET(request: Request) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
    await connectToDatabase();
    
    // Get all orders to extract all delivery dates
    const allOrders = await WeeklyOrder.find().lean();
    console.log(`Found ${allOrders.length} weekly orders in the database`);
    
    // Check the structure of items in orders
    let hasItems = false;
    let itemsStructure = [];
    
    for (const order of allOrders) {
      if (order.items && order.items.length > 0) {
        hasItems = true;
        itemsStructure.push({
          orderId: order.orderId,
          itemsCount: order.items.length,
          sampleItem: order.items[0]
        });
        break;
      }
    }
    
    console.log('Orders have items:', hasItems);
    if (hasItems) {
      console.log('Sample items structure:', JSON.stringify(itemsStructure));
    }
    
    // Manually extract unique delivery dates
    const uniqueDates = new Map();
    
    // Process all orders to extract all unique delivery dates
    for (const order of allOrders) {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.date) {
            // Extract day from dayId (e.g., "Monday-w1" -> "Monday")
            let day = '';
            if (item.dayId) {
              // Handle different possible formats of dayId
              if (item.dayId.includes('-')) {
                day = item.dayId.split('-')[0];
              } else {
                day = item.dayId;
              }
            }
            
            // Format the display string
            const date = item.date;
            const formattedDay = day ? day.charAt(0).toUpperCase() + day.slice(1) : '';
            const display = `${date} ${formattedDay}`;
            
            // Use date as key to ensure uniqueness
            uniqueDates.set(date, { date, day: formattedDay, display });
          }
        }
      }
    }
    
    console.log(`Found ${uniqueDates.size} unique delivery dates from all orders`);
    
    // Convert Map to array
    const result = Array.from(uniqueDates.values());
    
    // Enhanced helper function to parse dates in various formats
    function parseDate(dateStr: string): Date {
      // Try to parse date strings in different formats
      try {
        // First try direct parsing
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
        
        // Try to parse date strings like "Oct 26" or "Sep 14"
        const monthMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        // Check if it's in format "MMM DD" like "Oct 26"
        const monthDayMatch = dateStr.match(/^(\w{3})\s+(\d{1,2})/);
        if (monthDayMatch) {
          const month = monthMap[monthDayMatch[1]];
          const day = parseInt(monthDayMatch[2]);
          if (month !== undefined && !isNaN(day)) {
            // Assume current year if not specified
            const year = new Date().getFullYear();
            return new Date(year, month, day);
          }
        }
        
        // Check if it's in format "DD MMM" like "26 Oct"
        const dayMonthMatch = dateStr.match(/^(\d{1,2})\s+(\w{3})/);
        if (dayMonthMatch) {
          const day = parseInt(dayMonthMatch[1]);
          const month = monthMap[dayMonthMatch[2]];
          if (month !== undefined && !isNaN(day)) {
            // Assume current year if not specified
            const year = new Date().getFullYear();
            return new Date(year, month, day);
          }
        }
        
        // If all parsing attempts fail, return a fallback date
        console.warn('Could not parse date:', dateStr);
        return new Date(0); // January 1, 1970
      } catch (e) {
        console.error('Error parsing date:', dateStr, e);
        return new Date(0); // January 1, 1970
      }
    }
    
    // Sort by date from latest to oldest using proper date comparison
    result.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });
    
    console.log(`Found ${result.length} unique delivery dates manually`);
    if (result.length > 0) {
      console.log('First 5 delivery dates after sorting:', JSON.stringify(result.slice(0, 5)));
    }
    
    return NextResponse.json({
      success: true,
      deliveryDates: result
    });
  } catch (error) {
    console.error('Error fetching delivery dates:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch delivery dates' },
      { status: 500 }
    );
  }
}

