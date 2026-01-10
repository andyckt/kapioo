import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';

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

// Helper function to format address
function formatAddress(address: any): string {
  if (!address) return "No address provided";
  
  let formattedAddress = '';
  
  if (address.unitNumber) {
    formattedAddress += `Unit ${address.unitNumber}, `;
  }
  
  formattedAddress += address.streetAddress || '';
  
  if (address.province || address.postalCode) {
    formattedAddress += `, ${address.province || ''} ${address.postalCode || ''}`;
  }
  
  if (address.country) {
    formattedAddress += `, ${address.country}`;
  }
  
  return formattedAddress;
}

// Helper function to convert an array to CSV with dish names as columns
function convertToCSV(data: any[]): string {
  // First, collect all unique dish names across all orders
  const allDishNames = new Set<string>();
  
  data.forEach(order => {
    order.items.forEach((item: any) => {
      if (item.optionName) {
        allDishNames.add(item.optionName);
      }
    });
  });
  
  // Convert to array and sort
  const uniqueDishNames = Array.from(allDishNames).sort();
  
  // Define base headers (without date and status)
  const baseHeaders = [
    'Order ID',
    'User Name',
    'Email',
    'Phone Number',
    'Delivery Address',
    'Area'
  ];
  
  // Define date and status headers to appear after dish names
  const dateStatusHeaders = [
    'Status',
    'Delivery Date',
    'Delivery Day',
    'Date Ordered'
  ];
  
  // Combine all headers: base headers, dish names, then date and status
  const headers = [...baseHeaders, ...uniqueDishNames, ...dateStatusHeaders];
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(order => {
    // Format date ordered
    const dateCreated = new Date(order.createdAt).toISOString().split('T')[0];
    
    // Format delivery date and day
    const deliveryDate = order.items && order.items.length > 0 ? order.items[0].date : 'N/A';
    const deliveryDay = order.items && order.items.length > 0 ? order.items[0].dayId.split('-')[0] : 'N/A';
    
    // Format address
    const address = formatAddress(order.deliveryAddress);
    
    // Escape special characters in text fields
    const escapeCSV = (text: string) => {
      if (!text) return '';
      // If the text contains commas, quotes, or newlines, wrap it in quotes
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        // Replace any double quotes with two double quotes
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    
    // Create a map of dish name to quantity for this order
    const dishQuantities: Record<string, number> = {};
    
    // Initialize all dish quantities to 0
    uniqueDishNames.forEach(dishName => {
      dishQuantities[dishName] = 0;
    });
    
    // Fill in the quantities for dishes in this order
    order.items.forEach((item: any) => {
      if (item.optionName && item.quantity) {
        dishQuantities[item.optionName] = (dishQuantities[item.optionName] || 0) + item.quantity;
      }
    });
    
    // Create base row with proper escaping (without date and status)
    const baseRow = [
      escapeCSV(order.orderId),
      escapeCSV(order.userName || ''),
      escapeCSV(order.userEmail || ''),
      escapeCSV(order.phoneNumber || ''),
      escapeCSV(address),
      escapeCSV(order.area || '')
    ];
    
    // Add dish quantities to the row, only showing non-zero values
    const dishQuantitiesRow = uniqueDishNames.map(dishName => {
      const quantity = dishQuantities[dishName] || 0;
      // Return empty string if quantity is 0, otherwise return the quantity
      return quantity > 0 ? quantity : '';
    });
    
    // Create date and status row
    const dateStatusRow = [
      escapeCSV(order.status),
      escapeCSV(deliveryDate),
      escapeCSV(deliveryDay),
      escapeCSV(dateCreated)
    ];
    
    // Combine all rows: base row, dish quantities, then date and status
    const fullRow = [...baseRow, ...dishQuantitiesRow, ...dateStatusRow];
    
    csvContent += fullRow.join(',') + '\n';
  });
  
  return csvContent;
}

// GET handler - export all orders to CSV
export async function GET(request: Request) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
    await connectToDatabase();
    
    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const area = url.searchParams.get('area');
    const mealPlanType = url.searchParams.get('mealPlanType');
    const deliveryDate = url.searchParams.get('deliveryDate');
    const deliveryStartDate = url.searchParams.get('deliveryStartDate');
    const deliveryEndDate = url.searchParams.get('deliveryEndDate');
    
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
    
    // Filter by single delivery date if provided (takes precedence over date range)
    if (deliveryDate) {
      // Parse the date string into a JavaScript Date object
      const dateObj = new Date(deliveryDate);
      // Format the date as a string in the format used in the database (e.g., 'Nov 02')
      // Use custom formatting to ensure leading zeros for days under 10
      const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
      const day = dateObj.getDate();
      const formattedDay = day < 10 ? `0${day}` : `${day}`;
      const formattedDate = `${month} ${formattedDay}`;
      
      console.log(`Filtering by single delivery date: ${formattedDate}`);
      
      // Use $elemMatch to find documents where at least one item in the items array matches our date
      query['items'] = {
        $elemMatch: {
          date: formattedDate
        }
      };
    }
    // Filter by delivery date range if provided (only if single deliveryDate is not provided)
    else if (deliveryStartDate || deliveryEndDate) {
      // Create a date range filter for items.date
      const dateFilter: any = {};
      
      if (deliveryStartDate) {
        // Parse and format the date string to match database format
        const formattedStartDate = parseAndFormatDate(deliveryStartDate);
        dateFilter.$gte = formattedStartDate;
        console.log(`Filtering delivery dates >= ${formattedStartDate}`);
      }
      
      if (deliveryEndDate) {
        // Parse and format the date string to match database format
        const formattedEndDate = parseAndFormatDate(deliveryEndDate);
        dateFilter.$lte = formattedEndDate;
        console.log(`Filtering delivery dates <= ${formattedEndDate}`);
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
    
    // Find all orders matching the query
    const orders = await WeeklyOrder.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    // Get user information for each order
    const userIds = orders.map(order => order.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email')
      .lean();
    
    // Create a map of user IDs to user data
    const userMap = users.reduce((map: any, user: any) => {
      map[user._id.toString()] = user;
      return map;
    }, {});
    
    // Add user information to orders
    const ordersWithUserInfo = orders.map(order => {
      const user = userMap[order.userId.toString()];
      return {
        ...order,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown'
      };
    });
    
    // Convert to CSV
    const csvContent = convertToCSV(ordersWithUserInfo);
    
    // Return CSV as a download
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="weekly-subscription-orders-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting weekly subscription orders:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to export orders' },
      { status: 500 }
    );
  }
}