import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';
import Day from '@/models/Day';
import Combo from '@/models/Combo';
import * as XLSX from 'xlsx';

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
  
  // Add buzz code in brackets if provided
  if (address.buzzCode) {
    formattedAddress += ` (Buzz code: ${address.buzzCode})`;
  }
  
  return formattedAddress;
}

// Helper function to format a single combo with dishes
function formatCombo(combo: any): string {
  let comboText = combo.name || '套餐';
  
  // Add Type A (2-dish) dishes
  if (combo.typeA && combo.typeA.dishes && combo.typeA.dishes.length > 0) {
    combo.typeA.dishes.forEach((dish: string, index: number) => {
      comboText += `\n${index + 1}. ${dish}`;
    });
  }
  
  // Add Type B (3-dish) - the 3rd dish with (3菜) label
  if (combo.typeB && combo.typeB.dishes && combo.typeB.dishes.length > 0) {
    // Find dishes that are only in Type B (not in Type A)
    const typeADishes = combo.typeA?.dishes || [];
    const uniqueTypeBDishes = combo.typeB.dishes.filter((dish: string) => !typeADishes.includes(dish));
    
    // Add the 3rd dish with (3菜) label
    if (uniqueTypeBDishes.length > 0) {
      const dishNumber = (combo.typeA?.dishes?.length || 0) + 1;
      uniqueTypeBDishes.forEach((dish: string, index: number) => {
        comboText += `\n${dishNumber + index}. ${dish} (3菜)`;
      });
    }
  }
  
  return comboText;
}

// Helper function to convert orders for a specific date to worksheet data
async function convertToWorksheetData(data: any[], targetDate: string): Promise<any[][]> {
  // Filter orders to only include items for the target date
  const filteredData = data.map(order => ({
    ...order,
    items: order.items.filter((item: any) => item.date === targetDate)
  })).filter(order => order.items.length > 0);

  if (filteredData.length === 0) {
    return [];
  }

  // Collect all unique combo names and their dishes
  const comboDetailsMap = new Map<string, Set<string>>();
  
  filteredData.forEach(order => {
    order.items.forEach((item: any) => {
      if (item.comboName) {
        const comboKey = `${item.comboName} (${item.type === 'A' ? '2-dish' : '3-dish'})`;
        
        if (!comboDetailsMap.has(comboKey)) {
          comboDetailsMap.set(comboKey, new Set<string>());
        }
        
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
  
  Array.from(comboDetailsMap.keys()).sort().forEach(comboKey => {
    const dishes = comboDetailsMap.get(comboKey) || new Set<string>();
    const dishList = Array.from(dishes).join(' + ');
    
    comboKeys.push(comboKey);
    const displayName = dishList ? `${comboKey}: ${dishList}` : comboKey;
    comboDisplayNames.push(displayName);
  });
  
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
    'Date Ordered',
    'Two-Dish Vouchers',
    'Three-Dish Vouchers',
    'Special Instructions'
  ];
  
  // Combine all headers
  const headers = [...baseHeaders, ...comboDisplayNames, ...dateStatusHeaders];
  
  // Fetch combos for the day to show in the first row
  const worksheetData: any[][] = [];
  
  try {
    const firstDayId = filteredData.length > 0 && filteredData[0].items && filteredData[0].items.length > 0 
      ? filteredData[0].items[0].day 
      : null;
    
    if (firstDayId) {
      const day = await Day.findOne({ dayId: firstDayId }).lean();
      
      if (day) {
        const combos = await Combo.find({ dayId: day.dayId }).lean();
        
        if (combos && combos.length > 0) {
          const formattedCombos = combos.map((combo: any) => formatCombo(combo));
          const emptyColumns = new Array(headers.length - combos.length).fill('');
          worksheetData.push([...formattedCombos, ...emptyColumns]);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fetching combos for reference row:', error);
  }
  
  // Add headers
  worksheetData.push(headers);
  
  // Add data rows
  filteredData.forEach(order => {
    const dateCreated = new Date(order.createdAt).toISOString().split('T')[0];
    const deliveryDate = order.items && order.items.length > 0 ? order.items[0].date : 'N/A';
    const deliveryDay = order.items && order.items.length > 0 ? 
      (order.items[0].day ? order.items[0].day.split('-')[0] : 'N/A') : 'N/A';
    
    const address = formatAddress(order.deliveryAddress);
    
    const baseRow = [
      order.orderId,
      order.userName || '',
      order.userEmail || '',
      order.phoneNumber || '',
      address,
      order.area || ''
    ];
    
    // Create a map of combo key to quantity
    const comboQuantities: Record<string, number> = {};
    comboKeys.forEach(comboKey => {
      comboQuantities[comboKey] = 0;
    });
    
    order.items.forEach((item: any) => {
      if (item.comboName && item.quantity) {
        const comboKey = `${item.comboName} (${item.type === 'A' ? '2-dish' : '3-dish'})`;
        if (comboKeys.includes(comboKey)) {
          comboQuantities[comboKey] = (comboQuantities[comboKey] || 0) + item.quantity;
        }
      }
    });
    
    const comboQuantitiesRow = comboKeys.map(comboKey => {
      const quantity = comboQuantities[comboKey] || 0;
      return quantity > 0 ? quantity : '';
    });
    
    const dateStatusRow = [
      order.status,
      deliveryDate,
      deliveryDay,
      dateCreated,
      order.voucherCost?.twoDish || 0,
      order.voucherCost?.threeDish || 0,
      order.specialInstructions || ''
    ];
    
    const fullRow = [...baseRow, ...comboQuantitiesRow, ...dateStatusRow];
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
    const comboName = url.searchParams.get('comboName');
    
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
    
    if (comboName && comboName !== 'all') {
      query['items.comboName'] = comboName;
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
        { 'items.comboName': searchRegex },
        { 'items.day': searchRegex },
        { 'items.date': searchRegex },
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
    
    // Helper function to format user name with last 4 digits of phone
    const formatUserNameWithPhone = (userName: string, phoneNumber: string): string => {
      if (!userName) return 'Unknown';
      if (!phoneNumber) return userName;
      
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      const lastFourDigits = digitsOnly.slice(-4);
      
      if (lastFourDigits.length === 4) {
        return `${userName}-${lastFourDigits}`;
      }
      
      return userName;
    };
    
    // Add user information to orders
    const ordersWithUserInfo = orders.map(order => {
      const user = userMap[order.userId.toString()];
      const userName = user?.name || 'Unknown';
      const formattedUserName = formatUserNameWithPhone(userName, order.phoneNumber);
      
      return {
        ...order,
        userName: formattedUserName,
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
      const worksheetData = await convertToWorksheetData(ordersWithUserInfo, date);
      
      if (worksheetData.length > 0) {
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Sanitize sheet name (Excel has 31 char limit and doesn't allow certain characters)
        const sheetName = date.replace(/[:\\/?*\[\]]/g, '-').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        console.log(`✅ Created sheet: ${sheetName} with ${worksheetData.length - 2} orders`);
      }
    }
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Return Excel file as a download
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="daily-delivery-orders-${new Date().toISOString().split('T')[0]}.xlsx"`
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
