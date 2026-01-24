import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import crypto from 'crypto';

// Verify Resend webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  
  if (!secret || !signature) {
    return false;
  }
  
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// POST handler - receive email events from Resend
export async function POST(request: Request) {
  const requestId = `resend-webhook-${Date.now()}`;
  
  console.log(`[${requestId}] 📥 Received Resend webhook`);
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('svix-signature') || '';
    
    // Verify webhook signature (if secret is configured)
    if (process.env.RESEND_WEBHOOK_SECRET && !verifyWebhookSignature(rawBody, signature)) {
      console.error(`[${requestId}] ❌ Invalid webhook signature`);
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    const payload = JSON.parse(rawBody);
    console.log(`[${requestId}] Event type:`, payload.type);
    console.log(`[${requestId}] Email:`, payload.data?.to);
    
    await connectToDatabase();
    
    // Handle different event types
    switch (payload.type) {
      case 'email.bounced':
      case 'email.bounce':
        // Mark email as bounced
        if (payload.data?.to) {
          await User.findOneAndUpdate(
            { email: payload.data.to.toLowerCase() },
            { $set: { emailStatus: 'bounced' } }
          );
          console.log(`[${requestId}] ✅ Marked ${payload.data.to} as bounced`);
        }
        break;
        
      case 'email.complained':
      case 'email.complaint':
        // Mark email as blocked (user marked as spam)
        if (payload.data?.to) {
          await User.findOneAndUpdate(
            { email: payload.data.to.toLowerCase() },
            { $set: { emailStatus: 'blocked' } }
          );
          console.log(`[${requestId}] ✅ Marked ${payload.data.to} as blocked (spam complaint)`);
        }
        break;
        
      case 'email.delivered':
        // Email delivered successfully - ensure status is active
        if (payload.data?.to) {
          await User.findOneAndUpdate(
            { email: payload.data.to.toLowerCase(), emailStatus: { $ne: 'active' } },
            { $set: { emailStatus: 'active' } }
          );
          console.log(`[${requestId}] ✅ Email delivered to ${payload.data.to}`);
        }
        break;
        
      case 'email.delivery_delayed':
        console.log(`[${requestId}] ⚠️  Email delivery delayed for ${payload.data?.to}`);
        break;
        
      default:
        console.log(`[${requestId}] ℹ️  Unhandled event type: ${payload.type}`);
    }
    
    return NextResponse.json({ success: true, received: true });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Webhook error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET handler - health check
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Resend email events webhook is active',
    timestamp: new Date().toISOString()
  });
}
