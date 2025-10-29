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

// Helper function to convert an array to CSV
function convertToCSV(data: any[]): string {
  // Define CSV headers
  const headers = [
    'Order ID',
    'User Name',
    'User Email',
    'Status',
    'Date Ordered',
    'Delivery Date',
    'Delivery Day',
    'Items',
    'Two-Dish Vouchers',
    'Three-Dish Vouchers',
    'Special Instructions',
    'Address',
    'Phone Number',
    'Area'
  ];
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(order => {
    // Format items as a string
    const itemsString = order.items.map((item: any) => 
      `${item.date} ${item.day}: ${item.comboName} (${item.type === 'A' ? '2-dish' : '3-dish'}) x${item.quantity}`
    ).join('; ');
    
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
    
    // Create row with proper escaping
    const row = [
      escapeCSV(order.orderId),
      escapeCSV(order.userName || ''),
      escapeCSV(order.userEmail || ''),
      escapeCSV(order.status),
      escapeCSV(dateCreated),
      escapeCSV(deliveryDate),
      escapeCSV(deliveryDay),
      escapeCSV(itemsString),
      order.voucherCost?.twoDish || 0,
      order.voucherCost?.threeDish || 0,
      escapeCSV(order.specialInstructions || ''),
      escapeCSV(address),
      escapeCSV(order.phoneNumber || ''),
      escapeCSV(order.area || '')
    ];
    
    csvContent += row.join(',') + '\n';
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
    const deliveryDate = url.searchParams.get('deliveryDate');
    
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
    
    // Filter by delivery date if provided
    if (deliveryDate && deliveryDate !== 'all') {
      query['items.date'] = deliveryDate;
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
