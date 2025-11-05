import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';

// Define the interface for the DailyOrder document
interface DailyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: Array<{
    day: string;
    date: string;
    comboId: string;
    comboName: string;
    type: string;
    quantity: number;
    voucherType: string;
    dishes?: string[];
  }>;
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  voucherCost: {
    twoDish: number;
    threeDish: number;
  };
  taxIncluded: boolean;
  taxRate: number;
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

// Create schema for daily orders
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
  voucherCost: {
    twoDish: {
      type: Number,
      default: 0
    },
    threeDish: {
      type: Number,
      default: 0
    }
  },
  taxIncluded: {
    type: Boolean,
    default: true
  },
  taxRate: {
    type: Number,
    default: 0.13 // 13% tax rate
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
const DailyDeliveryOrder = mongoose.models.DailyDeliveryOrder || 
  mongoose.model<DailyOrderDocument>('DailyDeliveryOrder', DailyDeliveryOrderSchema);

// Helper function to format address
function formatAddress(address: any): string {
  if (!address) return "No address provided";
  
  let formattedAddress = '';
  
  if (address.unitNumber) {
    formattedAddress += `Unit ${address.unitNumber}, `;
  }
  
  formattedAddress += address.streetAddress || '';
  
  if (address.city || address.province || address.postalCode) {
    formattedAddress += `, ${address.city || ''} ${address.province || ''} ${address.postalCode || ''}`;
  }
  
  if (address.country) {
    formattedAddress += `, ${address.country}`;
  }
  
  return formattedAddress;
}

// Helper function to convert an array to CSV with dish names as columns
function convertToCSV(data: any[]): string {
  // First, collect all unique combo names and their dishes across all orders
  const comboDetailsMap = new Map<string, Set<string>>();
  
  data.forEach(order => {
    order.items.forEach((item: any) => {
      if (item.comboName) {
        // Create a key for the combo (name + type)
        const comboKey = `${item.comboName} (${item.type === 'A' ? '2-dish' : '3-dish'})`;
        
        // Initialize the set of dishes for this combo if it doesn't exist
        if (!comboDetailsMap.has(comboKey)) {
          comboDetailsMap.set(comboKey, new Set<string>());
        }
        
        // Add dishes to the set if they exist
        if (item.dishes && Array.isArray(item.dishes) && item.dishes.length > 0) {
          item.dishes.forEach((dish: string) => {
            comboDetailsMap.get(comboKey)?.add(dish);
          });
        }
      }
    });
  });
  
  // Create combo keys and their display names
  const comboKeys: string[] = [];
  const comboDisplayNames: string[] = [];
  
  // Sort the combo keys and create display names with dish details
  Array.from(comboDetailsMap.keys()).sort().forEach(comboKey => {
    const dishes = comboDetailsMap.get(comboKey) || new Set<string>();
    const dishList = Array.from(dishes).join(' + ');
    
    // Add the basic key to our keys array
    comboKeys.push(comboKey);
    
    // Create a display name with dishes for the header
    const displayName = dishList ? `${comboKey}: ${dishList}` : comboKey;
    comboDisplayNames.push(displayName);
  });
  
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
    'Date Ordered',
    'Two-Dish Vouchers',
    'Three-Dish Vouchers',
    'Special Instructions'
  ];
  
  // Combine all headers: base headers, dish names with details, then date and status
  const headers = [...baseHeaders, ...comboDisplayNames, ...dateStatusHeaders];
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(order => {
    // Format date ordered
    const dateCreated = new Date(order.createdAt).toISOString().split('T')[0];
    
    // Format delivery date and day
    const deliveryDate = order.items && order.items.length > 0 ? order.items[0].date : 'N/A';
    const deliveryDay = order.items && order.items.length > 0 ? 
      (order.items[0].day ? order.items[0].day.split('-')[0] : 'N/A') : 'N/A';
    
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
    
    // Create base row with proper escaping (without date and status)
    const baseRow = [
      escapeCSV(order.orderId),
      escapeCSV(order.userName || ''),
      escapeCSV(order.userEmail || ''),
      escapeCSV(order.phoneNumber || ''),
      escapeCSV(address),
      escapeCSV(order.area || '')
    ];
    
    // Create a map of combo key to quantity for this order
    const comboQuantities: Record<string, number> = {};
    
    // Initialize all combo quantities to 0
    comboKeys.forEach(comboKey => {
      comboQuantities[comboKey] = 0;
    });
    
    // Fill in the quantities for combos in this order
    order.items.forEach((item: any) => {
      if (item.comboName && item.quantity) {
        const comboKey = `${item.comboName} (${item.type === 'A' ? '2-dish' : '3-dish'})`;
        if (comboKeys.includes(comboKey)) {
          comboQuantities[comboKey] = (comboQuantities[comboKey] || 0) + item.quantity;
        }
      }
    });
    
    // Add combo quantities to the row, only showing non-zero values
    const comboQuantitiesRow = comboKeys.map(comboKey => {
      const quantity = comboQuantities[comboKey] || 0;
      // Return empty string if quantity is 0, otherwise return the quantity
      return quantity > 0 ? quantity : '';
    });
    
    // Create date and status row
    const dateStatusRow = [
      escapeCSV(order.status),
      escapeCSV(deliveryDate),
      escapeCSV(deliveryDay),
      escapeCSV(dateCreated),
      order.voucherCost?.twoDish || 0,
      order.voucherCost?.threeDish || 0,
      escapeCSV(order.specialInstructions || '')
    ];
    
    // Combine all rows: base row, combo quantities, then date and status
    const fullRow = [...baseRow, ...comboQuantitiesRow, ...dateStatusRow];
    
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
    const deliveryStartDate = url.searchParams.get('deliveryStartDate');
    const deliveryEndDate = url.searchParams.get('deliveryEndDate');
    const comboName = url.searchParams.get('comboName');
    
    // Build query
    const query: any = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
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
    
    // Filter by area if provided
    if (area) {
      query.area = area;
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
        dateFilter.$gte = formattedStartDate;
        console.log(`Formatted start date: ${formattedStartDate}`);
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
        dateFilter.$lte = formattedEndDate;
        console.log(`Formatted end date: ${formattedEndDate}`);
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
    
    // Filter by combo name if provided
    if (comboName && comboName !== 'all') {
      query['items.comboName'] = comboName;
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
        { 'items.comboName': searchRegex },               // Search by combo name
        { 'items.day': searchRegex },                     // Search by day name
        { 'items.date': searchRegex },                    // Search by date
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
    
    // Find all orders matching the query
    const orders = await DailyDeliveryOrder.find(query)
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
        'Content-Disposition': `attachment; filename="daily-delivery-orders-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting daily delivery orders:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to export orders' },
      { status: 500 }
    );
  }
}
