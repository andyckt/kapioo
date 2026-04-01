import { NextResponse } from "next/server";

import { errorJson, handleRouteError, parseJsonBody } from "@/lib/api";
import { unsubscribeEmailBodySchema } from "@/lib/contracts/support-routes";
import connectToDatabase from "@/lib/db";
import { AUTH_SECRET } from "@/lib/env";
import User from "@/models/User";
import crypto from "crypto";

// POST handler - unsubscribe user from specific email type
export async function POST(request: Request) {
  try {
    const { data, error: bodyError } = await parseJsonBody(request, unsubscribeEmailBodySchema);
    if (bodyError) {
      return bodyError;
    }

    const { email, type, token } = data;

    const expectedToken = crypto
      .createHash("sha256")
      .update(`${email}-${type}-${AUTH_SECRET}`)
      .digest("hex")
      .substring(0, 32);

    if (token !== expectedToken) {
      return errorJson("Invalid unsubscribe token", 401);
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return errorJson("User not found", 404);
    }

    const preferenceMap: Record<string, string> = {
      "next-week-menu": "emailPreferences.nextWeekMenuUpdates",
      "weekly-menu": "emailPreferences.weeklyMenuUpdates",
      "daily-menu": "emailPreferences.dailyMenuUpdates",
      "order-updates": "emailPreferences.orderUpdates",
      marketing: "emailPreferences.marketing",
    };

    const preferenceField = preferenceMap[type];

    if (!preferenceField) {
      return errorJson("Invalid email type", 400);
    }

    const updateObj: Record<string, boolean> = {};
    updateObj[preferenceField] = false;

    await User.findByIdAndUpdate(user._id, { $set: updateObj });

    console.log(`Processed unsubscribe request for type=${type}`);

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/users/unsubscribe");
  }
}
