import { NextResponse } from 'next/server';
import { handleRouteError, parseSearchParams } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { adminDailyOrdersQuerySchema } from '@/lib/contracts/daily-order';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import User from '@/models/User';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
} from '@/lib/orders/effective-customer-info';

// GET handler - get all orders with pagination and filtering
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    const { data, error } = parseSearchParams(request, adminDailyOrdersQuerySchema);
    if (error) {
      return error;
    }

    const page = data.page ?? 1;
    const limit = data.limit ?? 10;
    const status = data.status;
    const search = data.search;
    const area = data.area;
    const deliveryDate = data.deliveryDate;
    const deliveryDateEnd = data.deliveryDateEnd;
    const comboName = data.comboName;
    const skip = (page - 1) * limit;
    
    // Build query
    const query: Record<string, unknown> = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
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
    
    // Filter by delivery date if provided
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
        
        // Remove duplicates
        const uniqueDateFormats = [...new Set(dateFormats)];
        
        query['items'] = {
          $elemMatch: {
            date: { $in: uniqueDateFormats }
          }
        };
      } else {
        // Single date filtering (existing logic)
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
      const orClauses: Array<Record<string, unknown>> = [
        { orderId: searchRegex },                         // Search by order ID
        { 'items.comboName': searchRegex },               // Search by combo name
        { 'items.dishes.name': searchRegex },             // Search by dish name
        { 'items.type': searchRegex },                    // Search by type (A for 2-dish, B for 3-dish)
        { 'items.day': searchRegex },                     // Search by day name
        { 'items.date': searchRegex },                    // Search by date
        { 'deliveryAddress.streetAddress': searchRegex }, // Search by street address
        { 'deliveryAddress.postalCode': searchRegex },    // Search by postal code
        { phoneNumber: searchRegex },                     // Search by phone number
        { area: searchRegex }                             // Search by area
      ];
      query.$or = orClauses;
      
      // Add user IDs to the search if we found matching users
      if (matchingUserIds.length > 0) {
        orClauses.push({ userId: { $in: matchingUserIds } });
      }
      
      // If search is a valid ObjectId, also search by userId directly
      if (mongoose.Types.ObjectId.isValid(search)) {
        orClauses.push({ userId: search });
      }
    }
    
    // Find orders with pagination
    const orders = await DailyDeliveryOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email phoneNumber')
      .lean();
    
    // Get total count for pagination
    const totalOrders = await DailyDeliveryOrder.countDocuments(query);
    
    // Fetch user information for each order
    const ordersWithUserInfo = await Promise.all(orders.map(async (order) => {
      try {
        const user = (await User.findById(order.userId).select('name email').lean()) as
          | { _id?: unknown; name?: string; email?: string }
          | null;
        const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(order, user);
        return {
          ...order,
          user,
          effectiveCustomerInfo,
          hasOrderOnlyOverride: hasOrderCustomerOverride(order),
          orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order)
        };
      } catch {
        return {
          ...order,
          user: null,
          effectiveCustomerInfo: resolveEffectiveOrderCustomerInfo(order, null),
          hasOrderOnlyOverride: hasOrderCustomerOverride(order),
          orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order)
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
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/admin/daily-delivery/orders');
  }
}
