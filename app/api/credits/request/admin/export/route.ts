import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import CreditPurchaseRequest from '@/models/CreditPurchaseRequest';
import { format } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    await connectToDatabase();
    
    // Build query
    const query: any = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        // Set to end of the day for the end date
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }
    
    // Find all requests matching the query
    const requests = await CreditPurchaseRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email userID phone');
    
    // Convert to CSV
    const csv = convertToCSV(requests);
    
    // Set headers for CSV download
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="credit-requests-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    
    return new NextResponse(csv, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Error exporting credit purchase requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export credit purchase requests' },
      { status: 500 }
    );
  }
}

function convertToCSV(requests: any[]) {
  // Define CSV headers
  const headers = [
    'Request ID',
    'User Name',
    'User Email',
    'User ID',
    'Phone',
    'Meal Plan Type',
    'Plan Description',
    'Meal Plan Quantity',
    'Amount',
    'Status',
    'Created Date',
    'Approved/Declined Date',
    'Admin Notes',
    'Payment Method',
    'Payment Reference',
    'Approved Six Meals',
    'Approved Eight Meals',
    'Approved Ten Meals',
    'Approved Twelve Meals',
    'Approved Sixteen Meals',
    'Approved Plans'
  ];
  
  // Start with headers
  let csvContent = headers.join(',') + '\n';
  
  // Add each request as a row
  for (const request of requests) {
    const user = request.userId || {};
    
    // Format dates
    const createdDate = request.createdAt ? format(new Date(request.createdAt), 'yyyy-MM-dd HH:mm:ss') : '';
    const statusDate = request.approvedAt || request.declinedAt ? 
      format(new Date(request.approvedAt || request.declinedAt), 'yyyy-MM-dd HH:mm:ss') : '';
    
    // Escape fields that might contain commas or quotes
    const row = [
      escapeCsvField(request.requestId || ''),
      escapeCsvField(user.name || ''),
      escapeCsvField(user.email || ''),
      escapeCsvField(user.userID || ''),
      escapeCsvField(user.phone || ''),
      escapeCsvField(request.mealPlanType || ''),
      escapeCsvField(request.planDescription || ''),
      request.mealPlanQuantity || '',
      request.amount || '',
      escapeCsvField(request.status || ''),
      escapeCsvField(createdDate),
      escapeCsvField(statusDate),
      escapeCsvField(request.adminNotes || ''),
      escapeCsvField(request.paymentMethod || ''),
      escapeCsvField(request.paymentReference || ''),
      request.approvedSixMeals || '',
      request.approvedEightMeals || '',
      request.approvedTenMeals || '',
      request.approvedTwelveMeals || '',
      request.approvedSixteenMeals || '',
      escapeCsvField(JSON.stringify(request.approvedPlans || []))
    ];
    
    csvContent += row.join(',') + '\n';
  }
  
  return csvContent;
}

// Helper function to escape CSV fields
function escapeCsvField(field: string) {
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  if (field && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
    // Replace any quotes with double quotes
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
