import { NextResponse } from 'next/server';

import { handleRouteError } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';

// GET handler - get all unique delivery dates from orders
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    // Get all orders to extract all delivery dates
    const allOrders = await DailyDeliveryOrder.find().lean();
    console.log(`Found ${allOrders.length} daily delivery orders in the database`);
    
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
    
    for (const order of allOrders) {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.date) {
            // Extract day from day field (e.g., "Monday-w1" -> "Monday")
            let day = '';
            if (item.day) {
              // Handle different possible formats of day
              if (item.day.includes('-')) {
                day = item.day.split('-')[0];
              } else {
                day = item.day;
              }
            }
            
            // Format the display string
            const date = item.date;
            const formattedDay = day ? day.charAt(0).toUpperCase() + day.slice(1) : '';
            const display = `${date} ${formattedDay}`;
            
            // Use date as key to ensure uniqueness
            uniqueDates.set(date, { date, day: formattedDay, display });
            
            console.log(`Added delivery date: ${date} ${formattedDay}`);
          }
        }
      }
    }
    
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
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/admin/daily-delivery/orders/delivery-dates');
  }
}
