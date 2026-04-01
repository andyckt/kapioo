import { NextResponse } from "next/server";
import crypto from "crypto";

import { errorJson } from "@/lib/api";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

// Verify Resend webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

// POST handler - receive email events from Resend
export async function POST(request: Request) {
  const requestId = `resend-webhook-${Date.now()}`;

  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(`[${requestId}] Webhook secret is not configured`);
      return errorJson("Webhook endpoint is not configured", 503);
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("svix-signature") || "";

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error(`[${requestId}] ❌ Invalid webhook signature`);
      return errorJson("Invalid signature", 401);
    }

    const payload = JSON.parse(rawBody) as { type?: string; data?: { to?: string } };
    console.log(`[${requestId}] Event type: ${payload.type}`);

    await connectToDatabase();

    // Handle different event types
    switch (payload.type) {
      case "email.bounced":
      case "email.bounce":
        // Mark email as bounced
        if (payload.data?.to) {
          await User.findOneAndUpdate(
            { email: payload.data.to.toLowerCase() },
            { $set: { emailStatus: "bounced" } }
          );
          console.log(`[${requestId}] Updated bounced status`);
        }
        break;

      case "email.complained":
      case "email.complaint":
        // Mark email as blocked (user marked as spam)
        if (payload.data?.to) {
          await User.findOneAndUpdate(
            { email: payload.data.to.toLowerCase() },
            { $set: { emailStatus: "blocked" } }
          );
          console.log(`[${requestId}] Updated blocked status after complaint`);
        }
        break;

      case "email.delivered":
        // Email delivered successfully - ensure status is active
        if (payload.data?.to) {
          await User.findOneAndUpdate(
            { email: payload.data.to.toLowerCase(), emailStatus: { $ne: "active" } },
            { $set: { emailStatus: "active" } }
          );
          console.log(`[${requestId}] Updated delivered status`);
        }
        break;

      case "email.delivery_delayed":
        console.log(`[${requestId}] Email delivery delayed`);
        break;

      default:
        console.log(`[${requestId}] ℹ️  Unhandled event type: ${payload.type}`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: unknown) {
    console.error(`[${requestId}] ❌ Webhook error:`, error);
    return errorJson("Internal server error", 500);
  }
}

// GET handler - health check
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Resend email events webhook is active",
    timestamp: new Date().toISOString(),
  });
}
