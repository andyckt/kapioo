import { NextResponse } from 'next/server';
import { sendDailyOrderSummaryEmail, sendWeeklyOrderSummaryEmail, sendAdminDailyOrderSummaryEmail, sendAdminWeeklyOrderSummaryEmail } from '@/lib/services/email';

export const dynamic = 'force-dynamic';

// POST handler - send order summary email
export async function POST(request: Request) {
  console.log('📧 [API] Received order summary email request');
  
  try {
    const data = await request.json();
    console.log('📧 [API] Request data:', JSON.stringify(data, null, 2));
    
    const {
      type, // 'daily' or 'weekly'
      userEmail,
      userName,
      userId,
      orders,
      deliveryAddress,
      area,
      phoneNumber,
      specialInstructions,
      language
    } = data;
    
    // Validate required fields
    if (!type) {
      console.error('❌ [API] Missing type');
      return NextResponse.json(
        { success: false, error: 'Missing type field' },
        { status: 400 }
      );
    }
    
    if (!userEmail) {
      console.error('❌ [API] Missing userEmail');
      return NextResponse.json(
        { success: false, error: 'Missing userEmail field' },
        { status: 400 }
      );
    }
    
    if (!userName) {
      console.error('❌ [API] Missing userName');
      return NextResponse.json(
        { success: false, error: 'Missing userName field' },
        { status: 400 }
      );
    }
    
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      console.error('❌ [API] Missing or invalid orders:', orders);
      return NextResponse.json(
        { success: false, error: 'Missing or invalid orders array' },
        { status: 400 }
      );
    }
    
    console.log(`📧 [API] Validated - Sending ${type} order summary email to ${userEmail} for ${orders.length} orders`);
    
    try {
      if (type === 'daily') {
        console.log('📧 [API] Calling sendDailyOrderSummaryEmail...');
        await sendDailyOrderSummaryEmail(
          userEmail,
          userName,
          orders,
          deliveryAddress,
          area,
          phoneNumber,
          specialInstructions,
          language || 'zh'
        );
        
        // Also send admin summary email
        console.log('📧 [API] Calling sendAdminDailyOrderSummaryEmail...');
        await sendAdminDailyOrderSummaryEmail(
          userName,
          userEmail,
          userId,
          orders,
          deliveryAddress,
          area,
          phoneNumber,
          specialInstructions
        );
      } else if (type === 'weekly') {
        console.log('📧 [API] Calling sendWeeklyOrderSummaryEmail...');
        await sendWeeklyOrderSummaryEmail(
          userEmail,
          userName,
          orders,
          deliveryAddress,
          area,
          phoneNumber,
          specialInstructions,
          language || 'zh'
        );
        
        // Also send admin summary email
        console.log('📧 [API] Calling sendAdminWeeklyOrderSummaryEmail...');
        await sendAdminWeeklyOrderSummaryEmail(
          userName,
          userEmail,
          userId,
          orders,
          deliveryAddress,
          area,
          phoneNumber,
          specialInstructions
        );
      } else {
        console.error('❌ [API] Invalid type:', type);
        return NextResponse.json(
          { success: false, error: 'Invalid type. Must be "daily" or "weekly"' },
          { status: 400 }
        );
      }
      
      console.log(`✅ [API] Order summary emails sent successfully to user (${userEmail}) and admin`);
      
      return NextResponse.json({
        success: true,
        message: 'Order summary emails sent successfully'
      });
      
    } catch (emailError: any) {
      console.error('❌ [API] Error sending order summary email:', emailError);
      console.error('❌ [API] Error details:', {
        name: emailError?.name,
        message: emailError?.message,
        stack: emailError?.stack
      });
      return NextResponse.json(
        { success: false, error: `Failed to send email: ${emailError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ [API] Error in send-order-summary-email route:', error);
    console.error('❌ [API] Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
