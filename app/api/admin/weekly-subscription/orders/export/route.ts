import { NextResponse } from "next/server";
import { errorJson, parseSearchParams } from "@/lib/api";
import { adminWeeklyOrdersExportQuerySchema } from "@/lib/contracts/weekly-order";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import mongoose from "mongoose";
import User from '@/models/User';
import WeeklyOrder from '@/models/WeeklyOrder';
import * as XLSX from 'xlsx';
import {
  resolveEffectiveOrderCustomerInfo
} from '@/lib/orders/effective-customer-info';

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

function normalizeSpecialInstructions(value: unknown): string {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  // Keep readable line breaks while avoiding excessive empty lines.
  const normalized = trimmed.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  // Prevent spreadsheet formula injection in exported cells.
  if (/^[=+\-@]/.test(normalized)) {
    return `'${normalized}`;
  }

  return normalized;
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
    'Area',
    'Special Instructions'
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
    
    const effectiveInfo = order.effectiveCustomerInfo || {};
    const address = formatAddress(effectiveInfo.deliveryAddress || order.deliveryAddress);
    
    const baseRow = [
      order.orderId,
      order.userName || '',
      order.userEmail || '',
      effectiveInfo.phoneNumber || order.phoneNumber || '',
      address,
      effectiveInfo.area || order.area || '',
      normalizeSpecialInstructions(effectiveInfo.specialInstructions || order.specialInstructions)
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
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: q, error: queryError } = parseSearchParams(request, adminWeeklyOrdersExportQuerySchema);
    if (queryError || !q) {
      return queryError;
    }

    const { status, search, area, deliveryDate, deliveryDateEnd } = q;

    await connectToDatabase();
    
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
      const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(order, user);
      return {
        ...order,
        userName: effectiveCustomerInfo.name || user?.name || 'Unknown',
        userEmail: effectiveCustomerInfo.email || user?.email || 'Unknown',
        effectiveCustomerInfo
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
    console.error("Error exporting weekly subscription orders:", error);
    return errorJson("Failed to export orders", 500);
  }
}
