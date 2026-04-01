import { handleRouteError, parseSearchParams, successJson } from "@/lib/api";
import { adminWeeklyOrdersQuerySchema } from "@/lib/contracts/weekly-order";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import mongoose from "mongoose";
import User from '@/models/User';
import WeeklyOrder from '@/models/WeeklyOrder';
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
  type OrderCustomerOverride,
} from '@/lib/orders/effective-customer-info';

// GET handler - get all weekly subscription orders with pagination and filtering
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: q, error: queryError } = parseSearchParams(request, adminWeeklyOrdersQuerySchema);
    if (queryError || !q) {
      return queryError;
    }

    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const { status, search, area, deliveryDate, deliveryDateEnd } = q;
    const skip = (page - 1) * limit;

    await connectToDatabase();
    
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
        { weeklyEntitlementGroupId: searchRegex },        // Search by weekly group ID
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
        const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(order, user as any);
        return {
          ...order,
          user,
          effectiveCustomerInfo,
          hasOrderOnlyOverride: hasOrderCustomerOverride(order),
          orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order)
        };
      } catch (error) {
        return {
          ...order,
          user: null,
          effectiveCustomerInfo: resolveEffectiveOrderCustomerInfo(order, null),
          hasOrderOnlyOverride: hasOrderCustomerOverride(order),
          orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order)
        };
      }
    }));
    
    return successJson({
      orders: ordersWithUserInfo,
      page,
      limit,
      total: totalOrders,
      pages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/weekly-subscription/orders");
  }
}
