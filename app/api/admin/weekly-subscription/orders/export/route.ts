import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';
import * as XLSX from 'xlsx';

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

// Helper function to convert orders for a specific date to worksheet data
function convertToWorksheetData(data: any[], targetDate: string): any[][] {
  // Filter orders to only include items for the target date
  const filteredData = data.map(order => ({
    ...order,
    items: order.items.filter((item: any) => item.date === targetDate)
  })).filter(order => order.items.length > 0);

  if (filteredData.length === 0) {
    return [];
  }

  // Collect all unique dish names
  const allDishNames = new Set<string>();
  
  filteredData.forEach(order => {
    order.items.forEach((item: any) => {
      if (item.optionName) {
        allDishNames.add(item.optionName);
      }
    });
  });
  
  // Convert to array and sort
  const uniqueDishNames = Array.from(allDishNames).sort();
  
  // Define base headers
  const baseHeaders = [
    'Order ID',
    'User Name',
    'Email',
    'Phone Number',
    'Delivery Address',
    'Area'
  ];
  
  // Define date and status headers
  const dateStatusHeaders = [
    'Status',
    'Delivery Date',
    'Delivery Day',
    'Date Ordered'
  ];
  
  // Combine all headers
  const headers = [...baseHeaders, ...uniqueDishNames, ...dateStatusHeaders];
  
  // Create worksheet data
  const worksheetData: any[][] = [];
  
  // Add headers
  worksheetData.push(headers);
  
  // Add data rows
  filteredData.forEach(order => {
    const dateCreated = new Date(order.createdAt).toISOString().split('T')[0];
    const deliveryDate = order.items && order.items.length > 0 ? order.items[0].date : 'N/A';
    const deliveryDay = order.items && order.items.length > 0 ? order.items[0].dayId.split('-')[0] : 'N/A';
    
    const address = formatAddress(order.deliveryAddress);
    
    const baseRow = [
      order.orderId,
      order.userName || '',
      order.userEmail || '',
      order.phoneNumber || '',
      address,
      order.area || ''
    ];
    
    // Create a map of dish name to quantity
    const dishQuantities: Record<string, number> = {};
    uniqueDishNames.forEach(dishName => {
      dishQuantities[dishName] = 0;
    });
    
    order.items.forEach((item: any) => {
      if (item.optionName && item.quantity) {
        dishQuantities[item.optionName] = (dishQuantities[item.optionName] || 0) + item.quantity;
      }
    });
    
    const dishQuantitiesRow = uniqueDishNames.map(dishName => {
      const quantity = dishQuantities[dishName] || 0;
      return quantity > 0 ? quantity : '';
    });
    
    const dateStatusRow = [
      order.status,
      deliveryDate,
      deliveryDay,
      dateCreated
    ];
    
    const fullRow = [...baseRow, ...dishQuantitiesRow, ...dateStatusRow];
    worksheetData.push(fullRow);
  });
  
  return worksheetData;
}

// GET handler - export all orders to Excel with multiple sheets
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const area = url.searchParams.get('area');
    const deliveryDate = url.searchParams.get('deliveryDate');
    const deliveryDateEnd = url.searchParams.get('deliveryDateEnd');
    
    // Build query
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (area) {
      query.area = area;
    }
    
    // Filter by delivery date range if provided
    if (deliveryDate) {
      if (deliveryDateEnd) {
        // Date range filtering
        const [startYear, startMonth, startDay] = deliveryDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = deliveryDateEnd.split('-').map(Number);
        
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        
        // Generate all dates in the range
        const dateFormats: string[] = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
          const dayNum = currentDate.getDate();
          const formattedWithZero = `${monthName} ${dayNum < 10 ? `0${dayNum}` : `${dayNum}`}`;
          const formattedWithoutZero = `${monthName} ${dayNum}`;
          dateFormats.push(formattedWithZero, formattedWithoutZero);
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const uniqueDateFormats = [...new Set(dateFormats)];
        
        query['items'] = {
          $elemMatch: {
            date: { $in: uniqueDateFormats }
          }
        };
      } else {
        // Single date filtering
        const [year, month, day] = deliveryDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = dateObj.getDate();
        
        const formattedWithZero = `${monthName} ${dayNum < 10 ? `0${dayNum}` : `${dayNum}`}`;
        const formattedWithoutZero = `${monthName} ${dayNum}`;
        
        query['items'] = {
          $elemMatch: {
            date: { $in: [formattedWithZero, formattedWithoutZero] }
          }
        };
      }
    }
    
    // Search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex }
        ]
      }).select('_id').lean();
      
      const matchingUserIds = matchingUsers.map(user => user._id);
      
      query.$or = [
        { orderId: searchRegex },
        { 'items.optionName': searchRegex },
        { 'deliveryAddress.streetAddress': searchRegex },
        { 'deliveryAddress.postalCode': searchRegex },
        { phoneNumber: searchRegex },
        { area: searchRegex }
      ];
      
      if (matchingUserIds.length > 0) {
        query.$or.push({ userId: { $in: matchingUserIds } });
      }
      
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
    
    // Collect all unique delivery dates from orders
    const uniqueDates = new Set<string>();
    ordersWithUserInfo.forEach(order => {
      order.items.forEach((item: any) => {
        if (item.date) {
          uniqueDates.add(item.date);
        }
      });
    });
    
    // Sort dates chronologically
    const sortedDates = Array.from(uniqueDates).sort((a, b) => {
      const dateA = new Date(a + ', 2026');
      const dateB = new Date(b + ', 2026');
      return dateA.getTime() - dateB.getTime();
    });
    
    console.log(`📊 Creating Excel file with ${sortedDates.length} sheet(s) for dates:`, sortedDates);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Create a sheet for each date
    for (const date of sortedDates) {
      const worksheetData = convertToWorksheetData(ordersWithUserInfo, date);
      
      if (worksheetData.length > 0) {
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Sanitize sheet name (Excel has 31 char limit and doesn't allow certain characters)
        const sheetName = date.replace(/[:\\/?*\[\]]/g, '-').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        console.log(`✅ Created sheet: ${sheetName} with ${worksheetData.length - 1} orders`);
      }
    }
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Return Excel file as a download
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="weekly-subscription-orders-${new Date().toISOString().split('T')[0]}.xlsx"`
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
